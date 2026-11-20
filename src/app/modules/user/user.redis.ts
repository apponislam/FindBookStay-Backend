import { getCache, setCache, deleteCache } from "../../../utils/redis";
import { IUserStats } from "./user.interface";

const USER_CACHE_TTL = {
    STATS: 10 * 60, // 10 minutes for aggregate user metrics
    PROFILE: 60 * 60, // 1 hour for individual user profile
};

const KEYS = {
    stats: () => "user:stats:overview",
    profile: (userId: string) => `user:profile:${userId}`,
};

const getCachedUserStats = async (): Promise<IUserStats | null> => {
    return getCache<IUserStats>(KEYS.stats());
};

const setCachedUserStats = async (stats: IUserStats, ttlSeconds: number = USER_CACHE_TTL.STATS): Promise<void> => {
    await setCache(KEYS.stats(), stats, ttlSeconds);
};

const getCachedUserProfile = async (userId: string): Promise<any | null> => {
    return getCache<any>(KEYS.profile(userId));
};

const setCachedUserProfile = async (userId: string, profileData: any, ttlSeconds: number = USER_CACHE_TTL.PROFILE): Promise<void> => {
    await setCache(KEYS.profile(userId), profileData, ttlSeconds);
};

const invalidateUser = async (userId: string): Promise<void> => {
    await deleteCache([KEYS.profile(userId), KEYS.stats()]);
};

const invalidateUserStats = async (): Promise<void> => {
    await deleteCache(KEYS.stats());
};

export const userRedis = {
    getCachedUserStats,
    setCachedUserStats,
    getCachedUserProfile,
    setCachedUserProfile,
    invalidateUser,
    invalidateUserStats,
};
