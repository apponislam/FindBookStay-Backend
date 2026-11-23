import { redis, getCache, setCache, deleteCache } from "../../../utils/redis";
import { ISiteSettings } from "./siteSettings.interface";

const SITE_SETTINGS_CACHE_TTL = 24 * 60 * 60; // 24 hours
const SITE_SETTINGS_CACHE_KEY = "site:settings:public";

const getCachedSiteSettings = async (): Promise<ISiteSettings | null> => {
    return getCache<ISiteSettings>(SITE_SETTINGS_CACHE_KEY);
};

const setCachedSiteSettings = async (
    settings: ISiteSettings,
    ttlSeconds: number = SITE_SETTINGS_CACHE_TTL,
): Promise<void> => {
    if (!settings) return;
    await setCache(SITE_SETTINGS_CACHE_KEY, settings, ttlSeconds);
};

const invalidateSiteSettings = async (): Promise<void> => {
    try {
        await deleteCache(SITE_SETTINGS_CACHE_KEY);
    } catch (err) {
        console.error("[Redis] Failed to invalidate site settings cache:", err);
    }
};

export const siteSettingsRedis = {
    getCachedSiteSettings,
    setCachedSiteSettings,
    invalidateSiteSettings,
};

