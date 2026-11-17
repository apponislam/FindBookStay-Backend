import mongoose from "mongoose";
import httpStatus from "http-status";
import ApiError from "../../../errors/ApiError";
import { SettingsModel } from "./settings.model";

const getMySettings = async (userId: string) => {
    const userObjectId = new mongoose.Types.ObjectId(userId);

    let settings = await SettingsModel.findOne({ user: userObjectId });

    // If user has not yet had a settings document initialized, create default settings
    if (!settings) {
        settings = await SettingsModel.create({
            user: userObjectId,
        });
    }

    return settings;
};

const updateMySettings = async (userId: string, payload: Record<string, any>) => {
    const userObjectId = new mongoose.Types.ObjectId(userId);

    // Flatten nested objects into dot notation to avoid overwriting unmentioned subfields
    const updateSet: Record<string, any> = {};

    if (payload.notifications) {
        if (payload.notifications.emailNotifications) {
            for (const [key, val] of Object.entries(payload.notifications.emailNotifications)) {
                if (val !== undefined) updateSet[`notifications.emailNotifications.${key}`] = val;
            }
        }
        if (payload.notifications.pushNotifications) {
            for (const [key, val] of Object.entries(payload.notifications.pushNotifications)) {
                if (val !== undefined) updateSet[`notifications.pushNotifications.${key}`] = val;
            }
        }
        if (payload.notifications.smsNotifications) {
            for (const [key, val] of Object.entries(payload.notifications.smsNotifications)) {
                if (val !== undefined) updateSet[`notifications.smsNotifications.${key}`] = val;
            }
        }
    }

    if (payload.privacy) {
        for (const [key, val] of Object.entries(payload.privacy)) {
            if (val !== undefined) updateSet[`privacy.${key}`] = val;
        }
    }

    if (payload.preferences) {
        for (const [key, val] of Object.entries(payload.preferences)) {
            if (val !== undefined) updateSet[`preferences.${key}`] = val;
        }
    }

    const updated = await SettingsModel.findOneAndUpdate(
        { user: userObjectId },
        { $set: updateSet },
        {
            new: true,
            upsert: true,
            runValidators: true,
            setDefaultsOnInsert: true,
        },
    );

    return updated;
};

const resetMySettings = async (userId: string) => {
    const userObjectId = new mongoose.Types.ObjectId(userId);

    await SettingsModel.findOneAndDelete({ user: userObjectId });

    // Create fresh default settings
    const freshSettings = await SettingsModel.create({
        user: userObjectId,
    });

    return freshSettings;
};

const getUserSettings = async (targetUserId: string) => {
    if (!mongoose.Types.ObjectId.isValid(targetUserId)) {
        throw new ApiError(httpStatus.BAD_REQUEST, "Invalid user ID format.");
    }

    const userObjectId = new mongoose.Types.ObjectId(targetUserId);
    let settings = await SettingsModel.findOne({ user: userObjectId }).populate("user", "name email role profileImage");

    if (!settings) {
        settings = await SettingsModel.create({
            user: userObjectId,
        });
        await settings.populate("user", "name email role profileImage");
    }

    return settings;
};

export const settingsServices = {
    getMySettings,
    updateMySettings,
    resetMySettings,
    getUserSettings,
};

