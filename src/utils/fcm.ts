import { initializeApp, cert, getApps, App } from "firebase-admin/app";
import {
    getMessaging,
    Messaging,
    MulticastMessage,
    FidMulticastMessage,
    Notification as FcmNotification,
    AndroidConfig,
    ApnsConfig,
} from "firebase-admin/messaging";
import fs from "fs";
import path from "path";
import config from "../app/config";

let firebaseApp: App | null = null;
let firebaseMessaging: Messaging | null = null;

/**
 * Safely initialize Firebase Admin SDK singleton
 * Supports service account file path OR direct environment variables
 * If credentials are not present, logs a warning and runs gracefully in mock mode
 */
export const getFirebaseMessaging = (): Messaging | null => {
    if (firebaseMessaging) {
        return firebaseMessaging;
    }

    try {
        const existingApps = getApps();
        if (existingApps.length > 0) {
            firebaseApp = existingApps[0];
            firebaseMessaging = getMessaging(firebaseApp);
            return firebaseMessaging;
        }

        // Option 1: Service Account JSON file path
        if (config.firebase?.serviceAccountPath) {
            const resolvedPath = path.resolve(process.cwd(), config.firebase.serviceAccountPath);
            if (fs.existsSync(resolvedPath)) {
                const serviceAccount = JSON.parse(fs.readFileSync(resolvedPath, "utf-8"));
                firebaseApp = initializeApp({
                    credential: cert(serviceAccount),
                });
                firebaseMessaging = getMessaging(firebaseApp);
                console.log("🔥 [Firebase Admin] Initialized with service account file.");
                return firebaseMessaging;
            }
        }

        // Option 2: Environment variables
        if (config.firebase?.projectId && config.firebase?.clientEmail && config.firebase?.privateKey) {
            firebaseApp = initializeApp({
                credential: cert({
                    projectId: config.firebase.projectId,
                    clientEmail: config.firebase.clientEmail,
                    privateKey: config.firebase.privateKey,
                }),
            });
            firebaseMessaging = getMessaging(firebaseApp);
            console.log("🔥 [Firebase Admin] Initialized with environment credentials.");
            return firebaseMessaging;
        }

        console.warn("⚠️ [Firebase FCM] Firebase credentials not configured in .env. Mobile push notifications will be skipped.");
        return null;
    } catch (error) {
        console.error("❌ [Firebase Admin Init Error]:", error);
        return null;
    }
};

export interface IPushNotificationPayload {
    tokens: string[]; // Can contain both 22-char FIDs and classic registration tokens
    title: string;
    body: string;
    image?: string | null;
    link?: string | null;
    data?: Record<string, any>;
}

export interface IPushSendResult {
    successCount: number;
    failureCount: number;
    failedTokens: string[];
}

/**
 * Send Multicast Push Notification to multiple device targets
 *
 * HYBRID DUAL-ENGINE:
 * 1. Automatically classifies targets into:
 *    - New recommended Firebase Installation IDs (FID, exactly 22 chars) -> uses FidMulticastMessage (fids: [...])
 *    - Classic registration tokens (~140-180+ chars) -> uses MulticastMessage (tokens: [...])
 * 2. Automatically chunks into batches of 500 (Firebase max limit per call)
 * 3. Identifies expired / invalid tokens so callers can prune them from the database
 */
export const sendMulticastPush = async (payload: IPushNotificationPayload): Promise<IPushSendResult> => {
    const messaging = getFirebaseMessaging();
    if (!messaging) {
        return { successCount: 0, failureCount: 0, failedTokens: [] };
    }

    // Filter valid unique string tokens
    const validTokens = Array.from(new Set(payload.tokens.filter((t) => typeof t === "string" && t.trim().length >= 20)));
    if (validTokens.length === 0) {
        return { successCount: 0, failureCount: 0, failedTokens: [] };
    }

    // Separate into 22-char FIDs (Firebase Installation IDs) and classic Registration Tokens
    const fids: string[] = [];
    const classicTokens: string[] = [];

    for (const t of validTokens) {
        const trimmed = t.trim();
        if (trimmed.length === 22) {
            fids.push(trimmed);
        } else {
            classicTokens.push(trimmed);
        }
    }

    // Convert data values to strings as required by FCM specifications
    const stringData: Record<string, string> = {};
    if (payload.data && typeof payload.data === "object") {
        for (const [key, val] of Object.entries(payload.data)) {
            stringData[key] = typeof val === "string" ? val : JSON.stringify(val);
        }
    }
    if (payload.link) {
        stringData["link"] = payload.link;
    }

    const notificationPayload: FcmNotification = {
        title: payload.title,
        body: payload.body,
        ...(payload.image ? { imageUrl: payload.image } : {}),
    };

    const androidConfig: AndroidConfig = {
        priority: "high",
        notification: {
            sound: "default",
            clickAction: "FLUTTER_NOTIFICATION_CLICK",
            channelId: "findbookstay_default_channel",
        },
    };

    const apnsConfig: ApnsConfig = {
        payload: {
            aps: {
                sound: "default",
                badge: 1,
                contentAvailable: true,
            },
        },
    };

    let totalSuccess = 0;
    let totalFailure = 0;
    const failedTokens: string[] = [];

    const CHUNK_SIZE = 500;

    // 1. Dispatch to 22-character Firebase Installation IDs (FID Mode)
    for (let i = 0; i < fids.length; i += CHUNK_SIZE) {
        const chunk = fids.slice(i, i + CHUNK_SIZE);
        const fidMessage: FidMulticastMessage = {
            fids: chunk,
            notification: notificationPayload,
            data: {
                click_action: "FLUTTER_NOTIFICATION_CLICK",
                ...stringData,
            },
            android: androidConfig,
            apns: apnsConfig,
        };

        try {
            const batchResponse = await messaging.sendEachForMulticast(fidMessage);
            totalSuccess += batchResponse.successCount;
            totalFailure += batchResponse.failureCount;

            batchResponse.responses.forEach((resp, idx) => {
                if (!resp.success && resp.error) {
                    const errorCode = resp.error.code;
                    if (
                        errorCode === "messaging/invalid-registration-token" ||
                        errorCode === "messaging/registration-token-not-registered" ||
                        errorCode === "messaging/invalid-argument" ||
                        errorCode === "messaging/mismatched-credential"
                    ) {
                        failedTokens.push(chunk[idx]);
                    }
                }
            });
        } catch (fidErr) {
            console.error("❌ [FCM FID Multicast Error]:", fidErr);
            totalFailure += chunk.length;
        }
    }

    // 2. Dispatch to Classic Registration Tokens (~150-175 chars)
    for (let i = 0; i < classicTokens.length; i += CHUNK_SIZE) {
        const chunk = classicTokens.slice(i, i + CHUNK_SIZE);
        const tokenMessage: MulticastMessage = {
            tokens: chunk,
            notification: notificationPayload,
            data: {
                click_action: "FLUTTER_NOTIFICATION_CLICK",
                ...stringData,
            },
            android: androidConfig,
            apns: apnsConfig,
        };

        try {
            const batchResponse = await messaging.sendEachForMulticast(tokenMessage);
            totalSuccess += batchResponse.successCount;
            totalFailure += batchResponse.failureCount;

            batchResponse.responses.forEach((resp, idx) => {
                if (!resp.success && resp.error) {
                    const errorCode = resp.error.code;
                    if (
                        errorCode === "messaging/invalid-registration-token" ||
                        errorCode === "messaging/registration-token-not-registered" ||
                        errorCode === "messaging/invalid-argument" ||
                        errorCode === "messaging/mismatched-credential"
                    ) {
                        failedTokens.push(chunk[idx]);
                    }
                }
            });
        } catch (tokenErr) {
            console.error("❌ [FCM Classic Token Multicast Error]:", tokenErr);
            totalFailure += chunk.length;
        }
    }

    return {
        successCount: totalSuccess,
        failureCount: totalFailure,
        failedTokens,
    };
};
