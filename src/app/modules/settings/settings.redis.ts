import { getCache, setCache, deleteCache } from "../../../utils/redis";
import { ISettings } from "./settings.interface";

const USER_SETTINGS_CACHE_TTL = 60 * 60; // 1 hour
const getCacheKey = (userId: string) => `user:settings:${userId}`;

const getCachedUserSettings = async (userId: string): Promise<ISettings | null> => {
    return getCache<ISettings>(getCacheKey(userId));
};

const setCachedUserSettings = async (
    userId: string,
    settings: ISettings,
    ttlSeconds: number = USER_SETTINGS_CACHE_TTL,
): Promise<void> => {
    if (!settings || !userId) return;
    await setCache(getCacheKey(userId), settings, ttlSeconds);
};

const invalidateUserSettings = async (userId: string): Promise<void> => {
    try {
        await deleteCache(getCacheKey(userId));
    } catch (err) {
        console.error(`[Redis] Failed to invalidate settings cache for user ${userId}:`, err);
    }
};

export const settingsRedis = {
    getCachedUserSettings,
    setCachedUserSettings,
    invalidateUserSettings,
};

