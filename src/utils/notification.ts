import { initializeApp, getApps, cert, App } from "firebase-admin/app";
import { getMessaging, Message, MulticastMessage, TopicMessage } from "firebase-admin/messaging";
import path from "path";
import fs from "fs";
import { UserModel } from "../app/modules/auth/auth.model";

let firebaseApp: App | null = null;

// Maximum number of active device tokens retained per user to avoid stale token bloating
const MAX_ACTIVE_DEVICES = 20;

// Firebase error codes indicating that a token is dead, expired, uninstalled, or invalid
const EXPIRED_TOKEN_ERROR_CODES = new Set(["messaging/invalid-registration-token", "messaging/registration-token-not-registered", "messaging/invalid-argument", "messaging/mismatched-credential"]);

const isExpiredOrInvalidToken = (errorCode?: string): boolean => {
    if (!errorCode) return false;
    return EXPIRED_TOKEN_ERROR_CODES.has(errorCode);
};

// Automatically prune expired or dead tokens from the database
const removeExpiredTokens = async (tokens: string[], userId?: string) => {
    if (!tokens || tokens.length === 0) return;

    try {
        if (userId) {
            await UserModel.updateOne({ _id: userId }, { $pull: { fcmTokens: { $in: tokens } } });
        } else {
            await UserModel.updateMany({ fcmTokens: { $in: tokens } }, { $pull: { fcmTokens: { $in: tokens } } });
        }
        console.log(`🧹 Pruned ${tokens.length} expired/disconnected FCM token(s) from database.`);
    } catch (err) {
        console.error("Failed to prune expired FCM tokens from database:", err);
    }
};

const initFirebase = (): App | null => {
    const existingApps = getApps();
    if (existingApps.length > 0) {
        firebaseApp = existingApps[0];
        return firebaseApp;
    }

    try {
        const configDir = path.join(process.cwd(), "config");
        let serviceAccountPath = "";

        if (fs.existsSync(configDir)) {
            const files = fs.readdirSync(configDir);
            const firebaseFile = files.find((f) => f.includes("firebase-adminsdk") && f.endsWith(".json"));
            if (firebaseFile) {
                serviceAccountPath = path.join(configDir, firebaseFile);
            }
        }

        if (serviceAccountPath && fs.existsSync(serviceAccountPath)) {
            const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf-8"));
            firebaseApp = initializeApp({
                credential: cert(serviceAccount),
            });
            console.log("🔥 Firebase Admin SDK initialized successfully.");
        } else {
            console.warn("⚠️ Firebase service account key not found in config directory. Push notifications will be disabled.");
        }
    } catch (error) {
        console.error("❌ Failed to initialize Firebase Admin SDK:", error);
    }

    return firebaseApp;
};

// Initialize on module load
initFirebase();

export interface IPushNotificationPayload {
    title: string;
    body: string;
    data?: Record<string, string>;
    imageUrl?: string;
}

// Send push notification to a single device token and auto-prune if expired
const sendToDevice = async (token: string, payload: IPushNotificationPayload) => {
    if (!firebaseApp) {
        console.warn("⚠️ Firebase Admin SDK is not initialized. Skipping notification.");
        return { success: false, error: "Firebase not initialized" };
    }

    if (!token) {
        return { success: false, error: "FCM token is required" };
    }

    const message: Message = {
        token,
        notification: {
            title: payload.title,
            body: payload.body,
            imageUrl: payload.imageUrl,
        },
        data: payload.data || {},
        android: {
            priority: "high",
            notification: {
                sound: "default",
                channelId: "high_importance_channel",
            },
        },
        apns: {
            payload: {
                aps: {
                    sound: "default",
                    badge: 1,
                },
            },
        },
    };

    try {
        const response = await getMessaging(firebaseApp).send(message);
        return { success: true, messageId: response };
    } catch (error: any) {
        console.error("Failed to send push notification to device:", error);

        // If token has expired or device uninstalled, auto-prune it immediately
        if (isExpiredOrInvalidToken(error.code)) {
            await removeExpiredTokens([token]);
        }

        return { success: false, error: error.message, code: error.code };
    }
};

// Send push notification to multiple device tokens and auto-prune all expired tokens
const sendToDevices = async (tokens: string[], payload: IPushNotificationPayload) => {
    if (!firebaseApp) {
        console.warn("⚠️ Firebase Admin SDK is not initialized. Skipping notification.");
        return { success: false, successCount: 0, failureCount: tokens.length, invalidTokens: [] };
    }

    const validTokens = tokens.filter((t) => typeof t === "string" && t.trim().length > 0);
    if (validTokens.length === 0) {
        return { success: true, successCount: 0, failureCount: 0, invalidTokens: [] };
    }

    const message: MulticastMessage = {
        tokens: validTokens,
        notification: {
            title: payload.title,
            body: payload.body,
            imageUrl: payload.imageUrl,
        },
        data: payload.data || {},
        android: {
            priority: "high",
            notification: {
                sound: "default",
                channelId: "high_importance_channel",
            },
        },
        apns: {
            payload: {
                aps: {
                    sound: "default",
                    badge: 1,
                },
            },
        },
    };

    try {
        const response = await getMessaging(firebaseApp).sendEachForMulticast(message);
        const invalidTokens: string[] = [];

        response.responses.forEach((resp: any, idx: number) => {
            if (!resp.success) {
                const errCode = resp.error?.code;
                if (isExpiredOrInvalidToken(errCode)) {
                    invalidTokens.push(validTokens[idx]);
                }
            }
        });

        // Automatically clean up all expired / disconnected tokens from the database
        if (invalidTokens.length > 0) {
            await removeExpiredTokens(invalidTokens);
        }

        return {
            success: true,
            successCount: response.successCount,
            failureCount: response.failureCount,
            invalidTokens,
        };
    } catch (error: any) {
        console.error("Failed to send multicast push notifications:", error);
        return { success: false, successCount: 0, failureCount: validTokens.length, invalidTokens: [] };
    }
};

// Send push notification to a user, cap array to 5 devices, and auto-prune dead tokens
const sendToUser = async (userId: string, payload: IPushNotificationPayload) => {
    const user = await UserModel.findById(userId).select("fcmTokens");
    if (!user || !user.fcmTokens || user.fcmTokens.length === 0) {
        return { success: false, message: "No active FCM tokens found for user" };
    }

    // Guard against excessively long token arrays: cap to the 5 most recent active devices
    let activeTokens = user.fcmTokens;
    if (activeTokens.length > MAX_ACTIVE_DEVICES) {
        const trimmed = activeTokens.slice(-MAX_ACTIVE_DEVICES);
        await UserModel.updateOne({ _id: userId }, { $set: { fcmTokens: trimmed } });
        activeTokens = trimmed;
    }

    const result = await sendToDevices(activeTokens, payload);

    // Prune invalid tokens directly from this user's document
    if (result.invalidTokens && result.invalidTokens.length > 0) {
        await removeExpiredTokens(result.invalidTokens, userId);
    }

    return result;
};

// Send push notification to an FCM topic (e.g. 'all-users', 'promotions')
const sendToTopic = async (topic: string, payload: IPushNotificationPayload) => {
    if (!firebaseApp) {
        console.warn("⚠️ Firebase Admin SDK is not initialized. Skipping notification.");
        return { success: false, error: "Firebase not initialized" };
    }

    const message: TopicMessage = {
        topic,
        notification: {
            title: payload.title,
            body: payload.body,
            imageUrl: payload.imageUrl,
        },
        data: payload.data || {},
        android: {
            priority: "high",
            notification: {
                sound: "default",
                channelId: "high_importance_channel",
            },
        },
        apns: {
            payload: {
                aps: {
                    sound: "default",
                    badge: 1,
                },
            },
        },
    };

    try {
        const response = await getMessaging(firebaseApp).send(message);
        return { success: true, messageId: response };
    } catch (error: any) {
        console.error(`Failed to send push notification to topic ${topic}:`, error);
        return { success: false, error: error.message };
    }
};

// Subscribe device token(s) to a topic
const subscribeToTopic = async (tokens: string | string[], topic: string) => {
    if (!firebaseApp) return { success: false, error: "Firebase not initialized" };
    const tokenList = Array.isArray(tokens) ? tokens : [tokens];
    try {
        const response = await getMessaging(firebaseApp).subscribeToTopic(tokenList, topic);
        return { success: true, response };
    } catch (error: any) {
        console.error(`Failed to subscribe tokens to topic ${topic}:`, error);
        return { success: false, error: error.message };
    }
};

// Unsubscribe device token(s) from a topic
const unsubscribeFromTopic = async (tokens: string | string[], topic: string) => {
    if (!firebaseApp) return { success: false, error: "Firebase not initialized" };
    const tokenList = Array.isArray(tokens) ? tokens : [tokens];
    try {
        const response = await getMessaging(firebaseApp).unsubscribeFromTopic(tokenList, topic);
        return { success: true, response };
    } catch (error: any) {
        console.error(`Failed to unsubscribe tokens from topic ${topic}:`, error);
        return { success: false, error: error.message };
    }
};

export const notification = {
    initFirebase,
    sendToDevice,
    sendToDevices,
    sendToUser,
    sendToTopic,
    subscribeToTopic,
    unsubscribeFromTopic,
    removeExpiredTokens,
};
