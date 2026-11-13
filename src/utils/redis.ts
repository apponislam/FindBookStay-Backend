import Redis, { RedisOptions } from "ioredis";
import config from "../app/config";

const redisOptions: RedisOptions = {
    lazyConnect: false,
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    retryStrategy(times) {
        if (times > 5) {
            return null; // Stop retrying after 5 attempts
        }
        return Math.min(times * 200, 2000);
    },
};

const createRedisClient = (): Redis => {
    if (config.redis.url) {
        return new Redis(config.redis.url, redisOptions);
    }

    return new Redis({
        host: config.redis.host,
        port: config.redis.port,
        password: config.redis.password,
        ...redisOptions,
    });
};

export const redis = createRedisClient();

redis.on("connect", () => {
    console.log("⚡ [Redis] Connecting to Redis server...");
});

redis.on("ready", () => {
    console.log("✅ [Redis] Connected and ready to receive commands.");
});

redis.on("error", (error) => {
    console.error("❌ [Redis] Connection Error:", error?.message || error);
});

redis.on("close", () => {
    console.log("⚠️ [Redis] Connection closed.");
});

/**
 * Store data with optional TTL (Time To Live in seconds)
 */
export const setCache = async (key: string, value: any, ttlInSeconds?: number): Promise<boolean> => {
    try {
        const serialized = typeof value === "string" ? value : JSON.stringify(value);
        if (ttlInSeconds && ttlInSeconds > 0) {
            await redis.set(key, serialized, "EX", ttlInSeconds);
        } else {
            await redis.set(key, serialized);
        }
        return true;
    } catch (err) {
        console.error(`[Redis] Failed to set cache for key: ${key}`, err);
        return false;
    }
};

/**
 * Retrieve cached item and automatically parse JSON if possible
 */
export const getCache = async <T = any>(key: string): Promise<T | null> => {
    try {
        const data = await redis.get(key);
        if (!data) return null;

        try {
            return JSON.parse(data) as T;
        } catch {
            return data as unknown as T;
        }
    } catch (err) {
        console.error(`[Redis] Failed to get cache for key: ${key}`, err);
        return null;
    }
};

/**
 * Delete one or more keys from cache
 */
export const deleteCache = async (key: string | string[]): Promise<boolean> => {
    try {
        const keys = Array.isArray(key) ? key : [key];
        if (keys.length > 0) {
            await redis.del(...keys);
        }
        return true;
    } catch (err) {
        console.error(`[Redis] Failed to delete cache for key: ${key}`, err);
        return false;
    }
};

/**
 * Test whether Redis connection works and can read/write data
 */
export const testRedisConnection = async (): Promise<{ success: boolean; message: string; ping?: string }> => {
    try {
        if (redis.status !== "ready") {
            await redis.connect();
        }

        const pingResult = await redis.ping();
        const testKey = "__test_connection__";
        const testVal = `ok_${Date.now()}`;

        await redis.set(testKey, testVal, "EX", 10);
        const retrievedVal = await redis.get(testKey);
        await redis.del(testKey);

        if (retrievedVal === testVal) {
            return {
                success: true,
                message: "Redis is connected and operational (read/write verified)!",
                ping: pingResult,
            };
        }

        return {
            success: false,
            message: "Redis pinged successfully, but read/write verification failed.",
            ping: pingResult,
        };
    } catch (error: any) {
        return {
            success: false,
            message: `Redis connection failed: ${error?.message || error}`,
        };
    }
};

