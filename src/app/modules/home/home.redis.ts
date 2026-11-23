import crypto from "crypto";
import { redis, getCache, setCache } from "../../../utils/redis";

const HOME_CACHE_TTL = {
    DOC: 60 * 60, // 1 hour
    FEATURED: 15 * 60, // 15 mins
    STATS: 10 * 60, // 10 mins
    SEARCH: 3 * 60, // 3 mins
};

const KEYS = {
    docById: (id: string) => `home:doc:${id}`,
    docBySlug: (slug: string) => `home:slug:${slug.toLowerCase()}`,
    docByPropNum: (propNum: string) => `home:prop:${propNum}`,
    featured: (limit: number) => `home:featured:${limit}`,
    stats: () => `home:stats:overview`,
    search: (hash: string) => `home:search:${hash}`,
};

export const generateQueryFingerprint = (query: Record<string, any>): string => {
    const keys = Object.keys(query).sort();
    const parts: string[] = [];

    for (const key of keys) {
        const val = query[key];
        if (val !== undefined && val !== null && val !== "") {
            parts.push(`${key}=${String(val).trim().toLowerCase()}`);
        }
    }

    if (parts.length === 0) return "all_default";
    return crypto.createHash("md5").update(parts.join("&")).digest("hex");
};

const scanAndDelete = async (pattern: string): Promise<void> => {
    try {
        let cursor = "0";
        do {
            const [nextCursor, keys] = await redis.scan(cursor, "MATCH", pattern, "COUNT", 50);
            cursor = nextCursor;
            if (keys && keys.length > 0) {
                await redis.del(...keys);
            }
        } while (cursor !== "0");
    } catch (err) {
        console.error(`[Redis] Failed non-blocking purge for pattern ${pattern}:`, err);
    }
};

const getCachedHome = async (idOrSlugOrProp: string): Promise<any | null> => {
    let cached = await getCache<any>(KEYS.docById(idOrSlugOrProp));
    if (cached) return cached;

    cached = await getCache<any>(KEYS.docBySlug(idOrSlugOrProp));
    if (cached) return cached;

    cached = await getCache<any>(KEYS.docByPropNum(idOrSlugOrProp));
    return cached;
};

const setCachedHome = async (home: any, ttlSeconds: number = HOME_CACHE_TTL.DOC): Promise<void> => {
    if (!home || !home._id) return;

    const id = home._id.toString();
    const serialized = JSON.stringify(home);
    const pipeline = redis.pipeline();

    pipeline.set(KEYS.docById(id), serialized, "EX", ttlSeconds);

    if (home.slug) {
        pipeline.set(KEYS.docBySlug(home.slug), serialized, "EX", ttlSeconds);
    }

    if (home.propertyNumber) {
        pipeline.set(KEYS.docByPropNum(home.propertyNumber), serialized, "EX", ttlSeconds);
    }

    await pipeline.exec();
};

const invalidateHome = async (id: string, slug?: string, propertyNumber?: string): Promise<void> => {
    try {
        const pipeline = redis.pipeline();
        if (id) pipeline.del(KEYS.docById(id));
        if (slug) pipeline.del(KEYS.docBySlug(slug));
        if (propertyNumber) pipeline.del(KEYS.docByPropNum(propertyNumber));
        pipeline.del(KEYS.stats());
        await pipeline.exec();

        await Promise.all([
            scanAndDelete("home:featured:*"),
            scanAndDelete("home:search:*"),
        ]);
    } catch (err) {
        console.error("[Redis] Error during Home cache invalidation:", err);
    }
};

const getCachedSearch = async (hash: string): Promise<{ data: any[]; meta: any } | null> => {
    return getCache<{ data: any[]; meta: any }>(KEYS.search(hash));
};

const setCachedSearch = async (hash: string, result: { data: any[]; meta: any }): Promise<void> => {
    await setCache(KEYS.search(hash), result, HOME_CACHE_TTL.SEARCH);
};

const getCachedFeaturedHomes = async (limit: number): Promise<any[] | null> => {
    return getCache<any[]>(KEYS.featured(limit));
};

const setCachedFeaturedHomes = async (limit: number, homes: any[]): Promise<void> => {
    await setCache(KEYS.featured(limit), homes, HOME_CACHE_TTL.FEATURED);
};

const getCachedHomeStats = async (): Promise<any | null> => {
    return getCache<any>(KEYS.stats());
};

const setCachedHomeStats = async (stats: any): Promise<void> => {
    await setCache(KEYS.stats(), stats, HOME_CACHE_TTL.STATS);
};

export const homeRedis = {
    getCachedHome,
    setCachedHome,
    invalidateHome,
    getCachedSearch,
    setCachedSearch,
    getCachedFeaturedHomes,
    setCachedFeaturedHomes,
    getCachedHomeStats,
    setCachedHomeStats,
    generateQueryFingerprint,
};

