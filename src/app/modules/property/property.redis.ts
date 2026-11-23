import crypto from "crypto";
import { redis, getCache, setCache } from "../../../utils/redis";

const PROPERTY_CACHE_TTL = {
    DOC: 60 * 60,
    FEATURED: 15 * 60,
    STATS: 10 * 60,
    SEARCH: 3 * 60,
};

const KEYS = {
    docById: (id: string) => `property:doc:${id}`,
    docBySlug: (slug: string) => `property:slug:${slug.toLowerCase()}`,
    docByPropNum: (propNum: string) => `property:prop:${propNum}`,
    featured: (limit: number) => `property:featured:${limit}`,
    stats: () => `property:stats:overview`,
    search: (hash: string) => `property:search:${hash}`,
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

const getCachedProperty = async (idOrSlugOrProp: string): Promise<any | null> => {
    let cached = await getCache<any>(KEYS.docById(idOrSlugOrProp));
    if (cached) return cached;

    cached = await getCache<any>(KEYS.docBySlug(idOrSlugOrProp));
    if (cached) return cached;

    cached = await getCache<any>(KEYS.docByPropNum(idOrSlugOrProp));
    return cached;
};

const setCachedProperty = async (prop: any, ttlSeconds: number = PROPERTY_CACHE_TTL.DOC): Promise<void> => {
    if (!prop || !prop._id) return;

    const id = prop._id.toString();
    const serialized = JSON.stringify(prop);
    const pipeline = redis.pipeline();

    pipeline.set(KEYS.docById(id), serialized, "EX", ttlSeconds);

    if (prop.slug) {
        pipeline.set(KEYS.docBySlug(prop.slug), serialized, "EX", ttlSeconds);
    }

    if (prop.propertyNumber) {
        pipeline.set(KEYS.docByPropNum(prop.propertyNumber), serialized, "EX", ttlSeconds);
    }

    await pipeline.exec();
};

const invalidateProperty = async (id: string, slug?: string, propertyNumber?: string): Promise<void> => {
    try {
        const pipeline = redis.pipeline();
        if (id) pipeline.del(KEYS.docById(id));
        if (slug) pipeline.del(KEYS.docBySlug(slug));
        if (propertyNumber) pipeline.del(KEYS.docByPropNum(propertyNumber));
        pipeline.del(KEYS.stats());
        await pipeline.exec();

        await Promise.all([
            scanAndDelete("property:featured:*"),
            scanAndDelete("property:search:*"),
        ]);
    } catch (err) {
        console.error("[Redis] Error during Property cache invalidation:", err);
    }
};

const getCachedSearch = async (hash: string): Promise<{ data: any[]; meta: any } | null> => {
    return getCache<{ data: any[]; meta: any }>(KEYS.search(hash));
};

const setCachedSearch = async (hash: string, result: { data: any[]; meta: any }): Promise<void> => {
    await setCache(KEYS.search(hash), result, PROPERTY_CACHE_TTL.SEARCH);
};

const getCachedFeaturedProperties = async (limit: number): Promise<any[] | null> => {
    return getCache<any[]>(KEYS.featured(limit));
};

const setCachedFeaturedProperties = async (limit: number, properties: any[]): Promise<void> => {
    await setCache(KEYS.featured(limit), properties, PROPERTY_CACHE_TTL.FEATURED);
};

const getCachedPropertyStats = async (): Promise<any | null> => {
    return getCache<any>(KEYS.stats());
};

const setCachedPropertyStats = async (stats: any): Promise<void> => {
    await setCache(KEYS.stats(), stats, PROPERTY_CACHE_TTL.STATS);
};

export const propertyRedis = {
    getCachedProperty,
    setCachedProperty,
    invalidateProperty,
    getCachedSearch,
    setCachedSearch,
    getCachedFeaturedProperties,
    setCachedFeaturedProperties,
    getCachedPropertyStats,
    setCachedPropertyStats,
    generateQueryFingerprint,
};

