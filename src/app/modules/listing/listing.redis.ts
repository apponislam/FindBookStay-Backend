import crypto from "crypto";
import { redis, getCache, setCache } from "../../../utils/redis";

// Cache Time-To-Live constants in seconds
const LISTING_CACHE_TTL = {
    DOC: 60 * 60, // 1 hour for individual listing details
    FEATURED: 15 * 60, // 15 minutes for homepage featured collections
    STATS: 10 * 60, // 10 minutes for marketplace aggregate metrics
    SEARCH: 3 * 60, // 3 minutes for search & filter result sets
};

// Key patterns
const KEYS = {
    docById: (id: string) => `listing:doc:${id}`,
    docBySlug: (slug: string) => `listing:slug:${slug.toLowerCase()}`,
    docByPropNum: (propNum: string) => `listing:prop:${propNum}`,
    featured: (category: string, limit: number) => `listing:featured:${category}:${limit}`,
    stats: () => `listing:stats:overview`,
    search: (hash: string) => `listing:search:${hash}`,
};

/**
 * Generate a deterministic hash for search/filter query parameters.
 * Keys are sorted so query permutations (e.g. ?city=Dhaka&page=1 and ?page=1&city=Dhaka)
 * map to the identical cache entry.
 */
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

/**
 * Non-blocking cursor-based cache purge using Redis SCAN
 */
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

/* ==========================================================================
   A. Single Listing Cache-Aside
   ========================================================================== */

const getCachedListing = async (idOrSlugOrProp: string): Promise<any | null> => {
    // 1. Try ID
    let cached = await getCache<any>(KEYS.docById(idOrSlugOrProp));
    if (cached) return cached;

    // 2. Try Slug
    cached = await getCache<any>(KEYS.docBySlug(idOrSlugOrProp));
    if (cached) return cached;

    // 3. Try Property Number
    cached = await getCache<any>(KEYS.docByPropNum(idOrSlugOrProp));
    return cached;
};

const setCachedListing = async (listing: any, ttlSeconds: number = LISTING_CACHE_TTL.DOC): Promise<void> => {
    if (!listing || !listing._id) return;

    const id = listing._id.toString();
    const serialized = JSON.stringify(listing);
    const pipeline = redis.pipeline();

    // Store primary by ID
    pipeline.set(KEYS.docById(id), serialized, "EX", ttlSeconds);

    // Alias by Slug
    if (listing.slug) {
        pipeline.set(KEYS.docBySlug(listing.slug), serialized, "EX", ttlSeconds);
    }

    // Alias by Property Number
    if (listing.propertyNumber) {
        pipeline.set(KEYS.docByPropNum(listing.propertyNumber), serialized, "EX", ttlSeconds);
    }

    await pipeline.exec();
};

/* ==========================================================================
   B. Featured Listings Cache
   ========================================================================== */

const getCachedFeatured = async (category: string = "all", limit: number = 8): Promise<any[] | null> => {
    return getCache<any[]>(KEYS.featured(category, limit));
};

const setCachedFeatured = async (category: string = "all", limit: number = 8, listings: any[], ttlSeconds: number = LISTING_CACHE_TTL.FEATURED): Promise<void> => {
    await setCache(KEYS.featured(category, limit), listings, ttlSeconds);
};

/* ==========================================================================
   C. Marketplace Overview Stats Cache
   ========================================================================== */

const getCachedStats = async (): Promise<any | null> => {
    return getCache<any>(KEYS.stats());
};

const setCachedStats = async (stats: any, ttlSeconds: number = LISTING_CACHE_TTL.STATS): Promise<void> => {
    await setCache(KEYS.stats(), stats, ttlSeconds);
};

/* ==========================================================================
   D. Search & Query Results Cache
   ========================================================================== */

const getCachedSearch = async (queryHash: string): Promise<any | null> => {
    return getCache<any>(KEYS.search(queryHash));
};

const setCachedSearch = async (queryHash: string, data: any, ttlSeconds: number = LISTING_CACHE_TTL.SEARCH): Promise<void> => {
    await setCache(KEYS.search(queryHash), data, ttlSeconds);
};

/* ==========================================================================
   E. Smart Cache Invalidation (Write-Through Eviction)
   ========================================================================== */

const invalidateListing = async (listingId: string, slug?: string, propertyNumber?: string, category?: string): Promise<void> => {
    const pipeline = redis.pipeline();

    // 1. Delete single item cache and aliases
    pipeline.del(KEYS.docById(listingId));
    if (slug) pipeline.del(KEYS.docBySlug(slug));
    if (propertyNumber) pipeline.del(KEYS.docByPropNum(propertyNumber));

    // 2. Invalidate overview stats
    pipeline.del(KEYS.stats());

    // 3. Invalidate featured collections
    pipeline.del(KEYS.featured("all", 8));
    if (category) {
        pipeline.del(KEYS.featured(category, 8));
    }

    await pipeline.exec();

    // 4. Non-blocking purge of stale query/search result sets
    scanAndDelete("listing:search:*");
    scanAndDelete("listing:featured:*");
};

export const listingRedis = {
    generateQueryFingerprint,
    getCachedListing,
    setCachedListing,
    getCachedFeatured,
    setCachedFeatured,
    getCachedStats,
    setCachedStats,
    getCachedSearch,
    setCachedSearch,
    invalidateListing,
};
