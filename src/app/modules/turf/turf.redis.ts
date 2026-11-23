import crypto from "crypto";
import { redis, getCache, setCache } from "../../../utils/redis";

const TURF_CACHE_TTL = {
    DOC: 60 * 60,
    FEATURED: 15 * 60,
    STATS: 10 * 60,
    SEARCH: 3 * 60,
};

const KEYS = {
    docById: (id: string) => `turf:doc:${id}`,
    docBySlug: (slug: string) => `turf:slug:${slug.toLowerCase()}`,
    docByPropNum: (propNum: string) => `turf:prop:${propNum}`,
    featured: (limit: number) => `turf:featured:${limit}`,
    stats: () => `turf:stats:overview`,
    search: (hash: string) => `turf:search:${hash}`,
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

const getCachedTurf = async (idOrSlugOrProp: string): Promise<any | null> => {
    let cached = await getCache<any>(KEYS.docById(idOrSlugOrProp));
    if (cached) return cached;

    cached = await getCache<any>(KEYS.docBySlug(idOrSlugOrProp));
    if (cached) return cached;

    cached = await getCache<any>(KEYS.docByPropNum(idOrSlugOrProp));
    return cached;
};

const setCachedTurf = async (turf: any, ttlSeconds: number = TURF_CACHE_TTL.DOC): Promise<void> => {
    if (!turf || !turf._id) return;

    const id = turf._id.toString();
    const serialized = JSON.stringify(turf);
    const pipeline = redis.pipeline();

    pipeline.set(KEYS.docById(id), serialized, "EX", ttlSeconds);

    if (turf.slug) {
        pipeline.set(KEYS.docBySlug(turf.slug), serialized, "EX", ttlSeconds);
    }

    if (turf.propertyNumber) {
        pipeline.set(KEYS.docByPropNum(turf.propertyNumber), serialized, "EX", ttlSeconds);
    }

    await pipeline.exec();
};

const invalidateTurf = async (id: string, slug?: string, propertyNumber?: string): Promise<void> => {
    try {
        const pipeline = redis.pipeline();
        if (id) pipeline.del(KEYS.docById(id));
        if (slug) pipeline.del(KEYS.docBySlug(slug));
        if (propertyNumber) pipeline.del(KEYS.docByPropNum(propertyNumber));
        pipeline.del(KEYS.stats());
        await pipeline.exec();

        await Promise.all([
            scanAndDelete("turf:featured:*"),
            scanAndDelete("turf:search:*"),
        ]);
    } catch (err) {
        console.error("[Redis] Error during Turf cache invalidation:", err);
    }
};

const getCachedSearch = async (hash: string): Promise<{ data: any[]; meta: any } | null> => {
    return getCache<{ data: any[]; meta: any }>(KEYS.search(hash));
};

const setCachedSearch = async (hash: string, result: { data: any[]; meta: any }): Promise<void> => {
    await setCache(KEYS.search(hash), result, TURF_CACHE_TTL.SEARCH);
};

const getCachedFeaturedTurfs = async (limit: number): Promise<any[] | null> => {
    return getCache<any[]>(KEYS.featured(limit));
};

const setCachedFeaturedTurfs = async (limit: number, turfs: any[]): Promise<void> => {
    await setCache(KEYS.featured(limit), turfs, TURF_CACHE_TTL.FEATURED);
};

const getCachedTurfStats = async (): Promise<any | null> => {
    return getCache<any>(KEYS.stats());
};

const setCachedTurfStats = async (stats: any): Promise<void> => {
    await setCache(KEYS.stats(), stats, TURF_CACHE_TTL.STATS);
};

export const turfRedis = {
    getCachedTurf,
    setCachedTurf,
    invalidateTurf,
    getCachedSearch,
    setCachedSearch,
    getCachedFeaturedTurfs,
    setCachedFeaturedTurfs,
    getCachedTurfStats,
    setCachedTurfStats,
    generateQueryFingerprint,
};

