import { redis } from "../../../utils/redis";

const NOTIFICATION_TTL = {
    UNREAD_COUNT: 7 * 24 * 60 * 60, // 7 days
    DEBOUNCE_PUSH: 10, // 10 seconds debounce to prevent push notification storms
};

const KEYS = {
    unreadCount: (userId: string) => `notification:unread:${userId}`,
    pushDebounce: (userId: string, type: string, ref: string = "default") => `notification:debounce:${userId}:${type}:${ref}`,
};

/**
 * Get cached unread notifications count from Redis
 */
const getCachedUnreadCount = async (userId: string): Promise<number | null> => {
    try {
        const val = await redis.get(KEYS.unreadCount(userId));
        return val !== null ? Math.max(0, parseInt(val, 10)) : null;
    } catch {
        return null;
    }
};

/**
 * Set cached unread count in Redis
 */
const setCachedUnreadCount = async (userId: string, count: number, ttlSeconds: number = NOTIFICATION_TTL.UNREAD_COUNT): Promise<void> => {
    try {
        await redis.set(KEYS.unreadCount(userId), String(Math.max(0, count)), "EX", ttlSeconds);
    } catch (err) {
        console.error(`[Redis] Error setting unread count for user ${userId}:`, err);
    }
};

/**
 * Atomically increment unread notifications counter
 */
const incrementUnreadCount = async (userId: string, delta: number = 1): Promise<number> => {
    try {
        const key = KEYS.unreadCount(userId);
        const newCount = await redis.incrby(key, delta);
        await redis.expire(key, NOTIFICATION_TTL.UNREAD_COUNT);
        return newCount;
    } catch {
        return 0;
    }
};

/**
 * Atomically decrement unread notifications counter (ensures it never drops below 0)
 */
const decrementUnreadCount = async (userId: string, delta: number = 1): Promise<number> => {
    try {
        const key = KEYS.unreadCount(userId);
        const newCount = await redis.decrby(key, delta);
        if (newCount < 0) {
            await redis.set(key, "0", "EX", NOTIFICATION_TTL.UNREAD_COUNT);
            return 0;
        }
        await redis.expire(key, NOTIFICATION_TTL.UNREAD_COUNT);
        return newCount;
    } catch {
        return 0;
    }
};

/**
 * Reset unread notifications counter to 0 (on read-all)
 */
const resetUnreadCount = async (userId: string): Promise<void> => {
    try {
        await redis.set(KEYS.unreadCount(userId), "0", "EX", NOTIFICATION_TTL.UNREAD_COUNT);
    } catch (err) {
        console.error(`[Redis] Error resetting unread count for user ${userId}:`, err);
    }
};

/**
 * Invalidate user notification cache
 */
const invalidateNotificationCache = async (userId: string): Promise<void> => {
    try {
        await redis.del(KEYS.unreadCount(userId));
    } catch (err) {
        console.error(`[Redis] Error invalidating notification cache for user ${userId}:`, err);
    }
};

/**
 * Anti-Storm Debounce Guard:
 * Prevents spamming lock-screen push notifications if multiple events trigger within windowSeconds
 */
const shouldDebouncePush = async (userId: string, type: string, ref: string = "default", windowSeconds: number = NOTIFICATION_TTL.DEBOUNCE_PUSH): Promise<boolean> => {
    try {
        const key = KEYS.pushDebounce(userId, type, ref);
        const acquired = await redis.set(key, "1", "EX", windowSeconds, "NX");
        return !acquired; // True if debounced (blocked), False if allowed
    } catch {
        return false;
    }
};

export const notificationRedis = {
    getCachedUnreadCount,
    setCachedUnreadCount,
    incrementUnreadCount,
    decrementUnreadCount,
    resetUnreadCount,
    invalidateNotificationCache,
    shouldDebouncePush,
};
