import { Types } from "mongoose";
import httpStatus from "http-status";
import crypto from "crypto";
import ApiError from "../../../errors/ApiError";
import { IListing, ListingCategory, ListingStatus, AvailabilityStatus } from "./listing.interface";
import { ListingModel } from "./listing.model";
import { FavoriteModel } from "../favorite/favorite.model";
import { listingViewServices } from "../listingView/listingView.services";
import { lastViewedServices } from "../lastViewed/lastViewed.services";
import { UserModel } from "../auth/auth.model";
import { activityLogServices } from "../activityLog/activityLog.services";
import { listingRedis } from "./listing.redis";

/**
 * Update user category flags (hasHome, hasStay, hasTurf, hasProperty)
 */
const syncUserCategoryFlag = async (userId: Types.ObjectId, category: ListingCategory) => {
    try {
        const flagMap: Record<ListingCategory, string> = {
            [ListingCategory.HOME]: "hasHome",
            [ListingCategory.STAY]: "hasStay",
            [ListingCategory.TURF]: "hasTurf",
            [ListingCategory.PROPERTY]: "hasProperty",
        };

        const fieldName = flagMap[category];
        if (fieldName) {
            await UserModel.findByIdAndUpdate(userId, { [fieldName]: true });
        }
    } catch (err) {
        console.error("⚠️ [User Category Flag Sync Error]:", err);
    }
};

/**
 * Create a new listing
 */
const createListing = async (userId: string, userRole: string, payload: Partial<IListing>, meta?: { ip?: string; userAgent?: string }) => {
    const creatorId = new Types.ObjectId(userId);
    const ownerId = payload.owner ? new Types.ObjectId(payload.owner as any) : creatorId;

    // Admin created listings can be automatically approved & active
    const isAdmin = userRole === "ADMIN";
    const status = isAdmin ? ListingStatus.ACTIVE : ListingStatus.PENDING_APPROVAL;
    const isVerified = isAdmin;
    const approvedBy = isAdmin ? creatorId : undefined;
    const approvedAt = isAdmin ? new Date() : undefined;
    const publishedAt = isAdmin ? new Date() : undefined;

    // Generate unique slug
    let slug = payload.slug;
    if (!slug && payload.title) {
        const baseSlug = payload.title
            .toLowerCase()
            .trim()
            .replace(/[^\w\s-]/g, "")
            .replace(/[\s_-]+/g, "-")
            .replace(/^-+|-+$/g, "");
        const randomSuffix = crypto.randomBytes(3).toString("hex");
        slug = `${baseSlug || "listing"}-${randomSuffix}`;
    }

    const listingData: Partial<IListing> = {
        ...payload,
        createdBy: creatorId,
        owner: ownerId,
        slug,
        status,
        availabilityStatus: payload.availabilityStatus || AvailabilityStatus.AVAILABLE,
        isVerified,
        approvedBy,
        approvedAt,
        publishedAt,
        viewsCount: 0,
        favoritesCount: 0,
        bookmarksCount: 0,
        ratingAverage: 0,
        totalReviews: 0,
        isDeleted: false,
    };

    const listing = await ListingModel.create(listingData);

    // Sync user hasHome, hasStay, etc.
    if (payload.category) {
        await syncUserCategoryFlag(creatorId, payload.category);
    }

    // Audit Activity Log
    activityLogServices.createActivityLog({
        user: creatorId,
        role: userRole,
        action: "CREATE_LISTING",
        module: payload.category as any,
        description: `Created new ${payload.category} listing: "${listing.title}"`,
        status: "SUCCESS",
        ipAddress: meta?.ip,
        userAgent: meta?.userAgent,
        metadata: {
            listingId: listing._id,
            category: listing.category,
            subCategory: listing.subCategory,
            price: listing.price,
            status: listing.status,
        },
    });

    // Evict stale search & aggregate stats cache
    listingRedis.invalidateListing(listing._id.toString(), listing.slug, listing.propertyNumber, listing.category);

    return listing;
};

/**
 * Helpers for robust filter parsing
 */
const toBoolean = (val: any): boolean | undefined => {
    if (val === undefined || val === null || val === "") return undefined;
    if (typeof val === "boolean") return val;
    const str = String(val).toLowerCase().trim();
    if (str === "true" || str === "1") return true;
    if (str === "false" || str === "0") return false;
    return undefined;
};

const toArray = (val: any): string[] => {
    if (!val) return [];
    if (Array.isArray(val)) return val.map((s) => String(s).trim()).filter(Boolean);
    return String(val)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
};

/**
 * Get all listings with deep filtering across all verticals, full-text search, geo-radius, and pagination (Redis Cached)
 */
const getAllListings = async (filters: Record<string, any>, reqUser?: { _id?: string; role?: string }) => {
    // 1. Fast Query Fingerprint & Cache-Aside Lookup (< 2ms)
    const fingerprintInput = { ...filters, ...(reqUser?.role === "ADMIN" && { adminView: true }) };
    const queryHash = listingRedis.generateQueryFingerprint(fingerprintInput);
    const cachedSearch = await listingRedis.getCachedSearch(queryHash);

    let pureResult: { meta: any; data: any[] };

    if (cachedSearch) {
        pureResult = cachedSearch;
    } else {
        const query: any = { isDeleted: false };

    // 1. Category and SubCategory (supports single value or comma-separated list)
    if (filters.category) {
        const categories = toArray(filters.category);
        if (categories.length === 1) {
            query.category = categories[0];
        } else if (categories.length > 1) {
            query.category = { $in: categories };
        }
    }
    if (filters.subCategory || filters.subCategories) {
        const subCategories = toArray(filters.subCategory || filters.subCategories);
        if (subCategories.length === 1) {
            query.subCategory = subCategories[0];
        } else if (subCategories.length > 1) {
            query.subCategory = { $in: subCategories };
        }
    }

    // 2. Status handling:
    // If an Admin asks for specific status(es), honor them.
    // Public / non-admin requests strictly return ACTIVE listings.
    if (filters.status && reqUser?.role === "ADMIN") {
        const statuses = toArray(filters.status);
        if (statuses.length === 1) {
            query.status = statuses[0];
        } else if (statuses.length > 1) {
            query.status = { $in: statuses };
        }
    } else {
        query.status = ListingStatus.ACTIVE;
    }

    // 3. Availability Status (AVAILABLE, BOOKED, RENTED, SOLD)
    if (filters.availabilityStatus) {
        const availabilities = toArray(filters.availabilityStatus);
        if (availabilities.length === 1) {
            query.availabilityStatus = availabilities[0];
        } else if (availabilities.length > 1) {
            query.availabilityStatus = { $in: availabilities };
        }
    }

    // 4. Pricing Range & Currency
    if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
        query.price = {};
        if (filters.minPrice !== undefined && !isNaN(Number(filters.minPrice))) {
            query.price.$gte = Number(filters.minPrice);
        }
        if (filters.maxPrice !== undefined && !isNaN(Number(filters.maxPrice))) {
            query.price.$lte = Number(filters.maxPrice);
        }
    }
    if (filters.priceUnit) {
        const units = toArray(filters.priceUnit);
        query.priceUnit = units.length === 1 ? units[0] : { $in: units };
    }
    if (filters.currency) {
        query.currency = String(filters.currency).toUpperCase().trim();
    }
    const isNegotiable = toBoolean(filters.isNegotiable);
    if (isNegotiable !== undefined) {
        query.isNegotiable = isNegotiable;
    }
    if (filters.maxDeposit !== undefined || filters.securityDeposit !== undefined) {
        const dep = Number(filters.maxDeposit ?? filters.securityDeposit);
        if (!isNaN(dep)) {
            query.securityDeposit = { $lte: dep };
        }
    }

    // 5. Location Search
    if (filters.city) {
        query["location.city"] = { $regex: String(filters.city).trim(), $options: "i" };
    }
    if (filters.area) {
        query["location.area"] = { $regex: String(filters.area).trim(), $options: "i" };
    }
    if (filters.state) {
        query["location.state"] = { $regex: String(filters.state).trim(), $options: "i" };
    }
    if (filters.country) {
        query["location.country"] = { $regex: String(filters.country).trim(), $options: "i" };
    }
    if (filters.zipCode) {
        query["location.zipCode"] = { $regex: String(filters.zipCode).trim(), $options: "i" };
    }

    // 6. Geospatial Radius Search ($geoWithin / $centerSphere)
    if (filters.lat !== undefined && filters.lng !== undefined) {
        const lat = Number(filters.lat);
        const lng = Number(filters.lng);
        if (!isNaN(lat) && !isNaN(lng)) {
            const radiusInKm = Math.max(0.5, Number(filters.radiusInKm || filters.radius) || 10);
            const radiusInRadians = radiusInKm / 6378.1;
            query["location.geo"] = {
                $geoWithin: {
                    $centerSphere: [[lng, lat], radiusInRadians],
                },
            };
        }
    }

    // 7. Keyword Search across multiple fields & propertyNumber
    if (filters.propertyNumber) {
        query.propertyNumber = String(filters.propertyNumber).trim();
    }
    const rawSearch = filters.searchTerm || filters.search || filters.q;
    if (rawSearch && typeof rawSearch === "string" && rawSearch.trim().length > 0) {
        const term = rawSearch.trim();
        query.$or = [
            { title: { $regex: term, $options: "i" } },
            { propertyNumber: { $regex: term, $options: "i" } },
            { description: { $regex: term, $options: "i" } },
            { "location.address": { $regex: term, $options: "i" } },
            { "location.area": { $regex: term, $options: "i" } },
            { "location.city": { $regex: term, $options: "i" } },
            { "propertyDetails.developerName": { $regex: term, $options: "i" } },
        ];
    }

    // 8. Badges, Verification & Quality Flags
    const isFeatured = toBoolean(filters.isFeatured);
    if (isFeatured !== undefined) {
        query.isFeatured = isFeatured;
    }
    const isVerified = toBoolean(filters.isVerified);
    if (isVerified !== undefined) {
        query.isVerified = isVerified;
    }
    const bookingEnabled = toBoolean(filters.bookingEnabled);
    if (bookingEnabled !== undefined) {
        query.bookingEnabled = bookingEnabled;
    }
    if (filters.minRating !== undefined && !isNaN(Number(filters.minRating))) {
        query.ratingAverage = { $gte: Number(filters.minRating) };
    }
    if (filters.minReviews !== undefined && !isNaN(Number(filters.minReviews))) {
        query.totalReviews = { $gte: Number(filters.minReviews) };
    }

    // 9. Amenities & Rules
    if (filters.amenities) {
        const amenitiesList = toArray(filters.amenities);
        if (amenitiesList.length > 0) {
            query.amenities = filters.amenitiesMatch === "any" ? { $in: amenitiesList } : { $all: amenitiesList };
        }
    }
    if (filters.rules) {
        const rulesList = toArray(filters.rules);
        if (rulesList.length > 0) {
            query.rules = { $in: rulesList };
        }
    }

    // 10. Publisher / Owner Filtering
    if (filters.createdBy && Types.ObjectId.isValid(filters.createdBy)) {
        query.createdBy = new Types.ObjectId(filters.createdBy);
    }
    if (filters.owner && Types.ObjectId.isValid(filters.owner)) {
        query.owner = new Types.ObjectId(filters.owner);
    }

    // 11. Vertical-Specific Filters
    // HOME Details
    if (filters.targetTenant) {
        const tenants = toArray(filters.targetTenant);
        query["homeDetails.targetTenant"] = tenants.length === 1 ? tenants[0] : { $in: tenants };
    }
    if (filters.rentType) {
        const rents = toArray(filters.rentType);
        query["homeDetails.rentType"] = rents.length === 1 ? rents[0] : { $in: rents };
    }
    if (filters.bedrooms !== undefined || filters.minBedrooms !== undefined || filters.maxBedrooms !== undefined) {
        const minBeds = Number(filters.minBedrooms ?? filters.bedrooms);
        const maxBeds = Number(filters.maxBedrooms);
        const bedQuery: Record<string, number> = {};
        if (!isNaN(minBeds)) bedQuery.$gte = minBeds;
        if (!isNaN(maxBeds)) bedQuery.$lte = maxBeds;
        if (Object.keys(bedQuery).length > 0) query["homeDetails.bedrooms"] = bedQuery;
    }
    if (filters.bathrooms !== undefined || filters.minBathrooms !== undefined) {
        const baths = Number(filters.minBathrooms ?? filters.bathrooms);
        if (!isNaN(baths)) query["homeDetails.bathrooms"] = { $gte: baths };
    }
    if (filters.balconies !== undefined || filters.minBalconies !== undefined) {
        const balcs = Number(filters.minBalconies ?? filters.balconies);
        if (!isNaN(balcs)) query["homeDetails.balconies"] = { $gte: balcs };
    }
    if (filters.floorLevel !== undefined || filters.minFloor !== undefined || filters.maxFloor !== undefined) {
        const minFl = Number(filters.minFloor ?? filters.floorLevel);
        const maxFl = Number(filters.maxFloor);
        const flQuery: Record<string, number> = {};
        if (!isNaN(minFl)) flQuery.$gte = minFl;
        if (!isNaN(maxFl)) flQuery.$lte = maxFl;
        if (Object.keys(flQuery).length > 0) query["homeDetails.floorLevel"] = flQuery;
    }
    const isFurnished = toBoolean(filters.isFurnished);
    if (isFurnished !== undefined) query["homeDetails.isFurnished"] = isFurnished;

    const attachedBath = toBoolean(filters.attachedBath);
    if (attachedBath !== undefined) query["homeDetails.attachedBath"] = attachedBath;

    const mealSystemAvailable = toBoolean(filters.mealSystemAvailable);
    if (mealSystemAvailable !== undefined) query["homeDetails.mealSystemAvailable"] = mealSystemAvailable;

    const hasParking = toBoolean(filters.hasParking);
    if (hasParking !== undefined) {
        query["homeDetails.parkingSpaces"] = hasParking ? { $gt: 0 } : 0;
    } else if (filters.parkingSpaces !== undefined || filters.minParkingSpaces !== undefined) {
        const ps = Number(filters.minParkingSpaces ?? filters.parkingSpaces);
        if (!isNaN(ps)) query["homeDetails.parkingSpaces"] = { $gte: ps };
    }

    if (filters.availableFrom || filters.availableBefore) {
        const availDate = new Date(filters.availableBefore || filters.availableFrom);
        if (!isNaN(availDate.getTime())) {
            query["homeDetails.availableFrom"] = { $lte: availDate };
        }
    }

    const viewingAvailable = toBoolean(filters.viewingAvailable);
    if (viewingAvailable !== undefined) query["homeDetails.viewingAvailable"] = viewingAvailable;

    // STAY Details
    if (filters.stayType) {
        const stays = toArray(filters.stayType);
        query["stayDetails.stayType"] = stays.length === 1 ? stays[0] : { $in: stays };
    }
    if (filters.roomType) {
        const rooms = toArray(filters.roomType);
        query["stayDetails.roomType"] = rooms.length === 1 ? rooms[0] : { $in: rooms };
    }
    if (filters.maxGuests !== undefined || filters.guests !== undefined) {
        const g = Number(filters.guests ?? filters.maxGuests);
        if (!isNaN(g)) query["stayDetails.maxGuests"] = { $gte: g };
    }
    if (filters.bedCount !== undefined || filters.minBeds !== undefined) {
        const b = Number(filters.minBeds ?? filters.bedCount);
        if (!isNaN(b)) query["stayDetails.bedCount"] = { $gte: b };
    }
    const freeBreakfast = toBoolean(filters.freeBreakfast);
    if (freeBreakfast !== undefined) query["stayDetails.freeBreakfast"] = freeBreakfast;

    const childrenAllowed = toBoolean(filters.childrenAllowed);
    if (childrenAllowed !== undefined) query["stayDetails.childrenAllowed"] = childrenAllowed;

    const petsAllowed = toBoolean(filters.petsAllowed);
    if (petsAllowed !== undefined) query["stayDetails.petsAllowed"] = petsAllowed;

    const reception24 = toBoolean(filters.receptionAvailable24Hours);
    if (reception24 !== undefined) query["stayDetails.receptionAvailable24Hours"] = reception24;

    if (filters.cancellationPolicy) {
        const policies = toArray(filters.cancellationPolicy);
        query["stayDetails.cancellationPolicy"] = policies.length === 1 ? policies[0] : { $in: policies };
    }

    // TURF Details
    if (filters.sportType) {
        const sports = toArray(filters.sportType);
        query["turfDetails.sportType"] = sports.length === 1 ? sports[0] : { $in: sports };
    }
    if (filters.turfSize) {
        const sizes = toArray(filters.turfSize);
        query["turfDetails.turfSize"] = sizes.length === 1 ? sizes[0] : { $in: sizes };
    }
    if (filters.surfaceType) {
        const surfaces = toArray(filters.surfaceType);
        query["turfDetails.surfaceType"] = surfaces.length === 1 ? surfaces[0] : { $in: surfaces };
    }
    const hasFloodlights = toBoolean(filters.hasFloodlights);
    if (hasFloodlights !== undefined) query["turfDetails.hasFloodlights"] = hasFloodlights;

    const equipRental = toBoolean(filters.equipmentRentalAvailable);
    if (equipRental !== undefined) query["turfDetails.equipmentRentalAvailable"] = equipRental;

    const equipIncluded = toBoolean(filters.equipmentIncluded);
    if (equipIncluded !== undefined) query["turfDetails.equipmentIncluded"] = equipIncluded;

    const changingRoom = toBoolean(filters.changingRoomAvailable);
    if (changingRoom !== undefined) query["turfDetails.changingRoomAvailable"] = changingRoom;

    const shower = toBoolean(filters.showerAvailable);
    if (shower !== undefined) query["turfDetails.showerAvailable"] = shower;

    const turfParking = toBoolean(filters.parkingAvailable);
    if (turfParking !== undefined) query["turfDetails.parkingAvailable"] = turfParking;

    if (filters.capacity !== undefined || filters.minCapacity !== undefined) {
        const cap = Number(filters.minCapacity ?? filters.capacity);
        if (!isNaN(cap)) query["turfDetails.capacity"] = { $gte: cap };
    }

    // PROPERTY Details
    if (filters.propertyType) {
        const ptypes = toArray(filters.propertyType);
        query["propertyDetails.propertyType"] = ptypes.length === 1 ? ptypes[0] : { $in: ptypes };
    }
    if (filters.ownershipType) {
        const otypes = toArray(filters.ownershipType);
        query["propertyDetails.ownershipType"] = otypes.length === 1 ? otypes[0] : { $in: otypes };
    }
    if (filters.completionStatus) {
        const cstatuses = toArray(filters.completionStatus);
        query["propertyDetails.completionStatus"] = cstatuses.length === 1 ? cstatuses[0] : { $in: cstatuses };
    }
    const deedReady = toBoolean(filters.registeredDeedReady);
    if (deedReady !== undefined) query["propertyDetails.registeredDeedReady"] = deedReady;

    if (filters.developerName) {
        query["propertyDetails.developerName"] = { $regex: String(filters.developerName).trim(), $options: "i" };
    }
    if (filters.facingDirection) {
        query["propertyDetails.facingDirection"] = { $regex: String(filters.facingDirection).trim(), $options: "i" };
    }
    if (filters.propertyBedrooms !== undefined) {
        const pbeds = Number(filters.propertyBedrooms);
        if (!isNaN(pbeds)) query["propertyDetails.bedrooms"] = { $gte: pbeds };
    }
    if (filters.propertyBathrooms !== undefined) {
        const pbaths = Number(filters.propertyBathrooms);
        if (!isNaN(pbaths)) query["propertyDetails.bathrooms"] = { $gte: pbaths };
    }

    if (filters.minFlatSize !== undefined || filters.maxFlatSize !== undefined) {
        const flatQ: Record<string, number> = {};
        if (filters.minFlatSize !== undefined && !isNaN(Number(filters.minFlatSize))) flatQ.$gte = Number(filters.minFlatSize);
        if (filters.maxFlatSize !== undefined && !isNaN(Number(filters.maxFlatSize))) flatQ.$lte = Number(filters.maxFlatSize);
        if (Object.keys(flatQ).length > 0) query["propertyDetails.flatSizeSqFt"] = flatQ;
    }
    if (filters.minLandArea !== undefined || filters.maxLandArea !== undefined) {
        const landQ: Record<string, number> = {};
        if (filters.minLandArea !== undefined && !isNaN(Number(filters.minLandArea))) landQ.$gte = Number(filters.minLandArea);
        if (filters.maxLandArea !== undefined && !isNaN(Number(filters.maxLandArea))) landQ.$lte = Number(filters.maxLandArea);
        if (Object.keys(landQ).length > 0) query["propertyDetails.landAreaSqFt"] = landQ;
    }
    if (filters.minArea !== undefined || filters.maxArea !== undefined) {
        const minA = Number(filters.minArea);
        const maxA = Number(filters.maxArea);
        const areaConditions: any[] = [];
        const flatCond: any = {};
        const landCond: any = {};
        if (!isNaN(minA)) {
            flatCond.$gte = minA;
            landCond.$gte = minA;
        }
        if (!isNaN(maxA)) {
            flatCond.$lte = maxA;
            landCond.$lte = maxA;
        }
        if (Object.keys(flatCond).length > 0) areaConditions.push({ "propertyDetails.flatSizeSqFt": flatCond });
        if (Object.keys(landCond).length > 0) areaConditions.push({ "propertyDetails.landAreaSqFt": landCond });
        if (areaConditions.length > 0) {
            query.$and = query.$and || [];
            query.$and.push({ $or: areaConditions });
        }
    }

    // 12. Pagination & High-Performance Sorting
    const page = Math.max(1, Number(filters.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(filters.limit) || 12));
    const skip = (page - 1) * limit;

    let sort: any = { isFeatured: -1, createdAt: -1 };
    const sortBy = String(filters.sortBy || "").trim();
    const sortOrder = String(filters.sortOrder || "").toLowerCase() === "asc" ? 1 : -1;

    if (sortBy === "price_asc" || (sortBy === "price" && sortOrder === 1)) {
        sort = { price: 1, createdAt: -1 };
    } else if (sortBy === "price_desc" || (sortBy === "price" && sortOrder === -1)) {
        sort = { price: -1, createdAt: -1 };
    } else if (sortBy === "rating" || sortBy === "ratingAverage" || sortBy === "top_rated") {
        sort = { ratingAverage: -1, totalReviews: -1 };
    } else if (sortBy === "views" || sortBy === "viewsCount" || sortBy === "popular") {
        sort = { viewsCount: -1, createdAt: -1 };
    } else if (sortBy === "newest" || (sortBy === "createdAt" && sortOrder === -1)) {
        sort = { createdAt: -1 };
    } else if (sortBy === "oldest" || (sortBy === "createdAt" && sortOrder === 1)) {
        sort = { createdAt: 1 };
    } else if (sortBy === "featured") {
        sort = { isFeatured: -1, createdAt: -1 };
    } else if (sortBy === "favorites" || sortBy === "bookmarks") {
        sort = { favoritesCount: -1, createdAt: -1 };
    }

    // 13. Optional Field Selection / Projection
    let projection = "";
    if (filters.fields || filters.select) {
        projection = toArray(filters.fields || filters.select).join(" ");
    }

    let findQuery = ListingModel.find(query).sort(sort).skip(skip).limit(limit).populate("createdBy", "name email phone profileImage").populate("owner", "name email phone profileImage").lean();

    if (projection) {
        findQuery = findQuery.select(projection);
    }

        // Concurrent query and count for low latency
        const [listings, total] = await Promise.all([findQuery, ListingModel.countDocuments(query)]);
        const totalPages = Math.ceil(total / limit) || 1;

        pureResult = {
            meta: {
                page,
                limit,
                total,
                totalPages,
                hasNext: page < totalPages,
                hasPrev: page > 1,
            },
            data: listings,
        };

        // Populate search cache in Redis (3-minute TTL)
        await listingRedis.setCachedSearch(queryHash, pureResult);
    }

    // 2. Dynamic Personalization Overlay: attach isFavorite
    let enrichedListings: any[] = pureResult.data;
    if (reqUser?._id && pureResult.data.length > 0) {
        const listingIds = pureResult.data.map((l: any) => l._id);
        const favoriteListingIds = await FavoriteModel.find({
            user: new Types.ObjectId(reqUser._id),
            listing: { $in: listingIds },
            isDeleted: false,
        }).distinct("listing");

        const favoriteSet = new Set(favoriteListingIds.map((id: any) => id.toString()));
        enrichedListings = pureResult.data.map((l: any) => ({
            ...l,
            isFavorite: favoriteSet.has(l._id.toString()),
        }));
    } else {
        enrichedListings = pureResult.data.map((l: any) => ({
            ...l,
            isFavorite: false,
        }));
    }

    return {
        meta: pureResult.meta,
        data: enrichedListings,
    };
};

/**
 * Get listing by ID, Slug, or Property Number (Redis Cache-Aside + Personalization Overlay)
 */
const getListingByIdOrSlug = async (idOrSlug: string, reqUser?: { _id?: string; role?: string }, meta?: { ip?: string; userAgent?: string; visitorId?: string }) => {
    // 1. Fast Cache-Aside lookup in Redis (< 2ms)
    let listing: any = await listingRedis.getCachedListing(idOrSlug);

    if (!listing) {
        const isId = Types.ObjectId.isValid(idOrSlug);
        const filter: any = isId
            ? {
                  $or: [
                      { _id: idOrSlug },
                      { slug: idOrSlug.toLowerCase() },
                      { propertyNumber: idOrSlug },
                  ],
                  isDeleted: false,
              }
            : {
                  $or: [
                      { slug: idOrSlug.toLowerCase() },
                      { propertyNumber: idOrSlug },
                  ],
                  isDeleted: false,
              };

        const dbListing = await ListingModel.findOne(filter)
            .populate("createdBy", "name email phone profileImage")
            .populate("owner", "name email phone profileImage")
            .lean();

        if (!dbListing) {
            throw new ApiError(httpStatus.NOT_FOUND, "The requested listing could not be found.");
        }

        listing = dbListing;

        // Cache the pure listing in Redis for active listings
        if (listing.status === ListingStatus.ACTIVE) {
            await listingRedis.setCachedListing(listing);
        }
    }

    // Access control: if listing is not ACTIVE, only creator or ADMIN can view it
    if (listing.status !== ListingStatus.ACTIVE) {
        const isOwner = reqUser?._id && listing.createdBy?._id?.toString() === reqUser._id.toString();
        const isAdmin = reqUser?.role === "ADMIN";

        if (!isOwner && !isAdmin) {
            throw new ApiError(httpStatus.FORBIDDEN, "This listing is currently pending approval or inactive and is not publicly visible.");
        }
    }

    // Dynamic Personalization Overlay: Check if caller has favorited this listing
    let isFavorite = false;
    if (reqUser?._id) {
        const fav = await FavoriteModel.exists({
            user: new Types.ObjectId(reqUser._id),
            listing: listing._id,
            isDeleted: false,
        });
        isFavorite = Boolean(fav);
    }

    // Fire-and-forget unique view tracking in background (zero latency, deduplicated per 24h, excludes owner/admin)
    setImmediate(() => {
        listingViewServices.recordListingView(listing._id as Types.ObjectId, listing.createdBy, listing.owner, reqUser, meta);

        // If user is authenticated, also automatically track in their last viewed history (max 10 items)
        if (reqUser?._id) {
            lastViewedServices.recordLastViewed(reqUser._id, listing._id as Types.ObjectId, listing.category);
        }
    });

    return {
        ...listing,
        isFavorite,
    };
};

/**
 * Get user's own listings
 */
const getMyListings = async (userId: string, filters: Record<string, any>) => {
    const query: any = {
        createdBy: new Types.ObjectId(userId),
        isDeleted: false,
    };

    if (filters.category) query.category = filters.category;
    if (filters.status) query.status = filters.status;
    if (filters.availabilityStatus) query.availabilityStatus = filters.availabilityStatus;

    if (filters.searchTerm) {
        const term = filters.searchTerm.trim();
        query.$or = [{ title: { $regex: term, $options: "i" } }, { description: { $regex: term, $options: "i" } }, { "location.address": { $regex: term, $options: "i" } }, { "location.city": { $regex: term, $options: "i" } }];
    }

    const page = Math.max(1, Number(filters.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(filters.limit) || 10));
    const skip = (page - 1) * limit;

    const [listings, total] = await Promise.all([ListingModel.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(), ListingModel.countDocuments(query)]);

    const totalPages = Math.ceil(total / limit) || 1;

    return {
        meta: {
            page,
            limit,
            total,
            totalPages,
            hasNext: page < totalPages,
            hasPrev: page > 1,
        },
        data: listings,
    };
};

/**
 * Update listing
 */
const updateListing = async (id: string, userId: string, userRole: string, payload: Partial<IListing>, meta?: { ip?: string; userAgent?: string }) => {
    if (!Types.ObjectId.isValid(id)) {
        throw new ApiError(httpStatus.BAD_REQUEST, "Invalid listing ID format.");
    }

    const listing = await ListingModel.findOne({ _id: id, isDeleted: false });
    if (!listing) {
        throw new ApiError(httpStatus.NOT_FOUND, "Listing not found.");
    }

    const isAdmin = userRole === "ADMIN";
    const isOwner = listing.createdBy.toString() === userId.toString();

    if (!isAdmin && !isOwner) {
        throw new ApiError(httpStatus.FORBIDDEN, "You do not have permission to modify this listing.");
    }

    // Sanitize administrative fields if caller is not an Admin
    if (!isAdmin) {
        delete payload.isVerified;
        delete payload.isFeatured;
        delete payload.status;
        delete payload.approvedBy;
        delete payload.approvedAt;
        delete payload.rejectionReason;
    }

    // Regenerate slug if title is updated
    if (payload.title && payload.title !== listing.title) {
        const baseSlug = payload.title
            .toLowerCase()
            .trim()
            .replace(/[^\w\s-]/g, "")
            .replace(/[\s_-]+/g, "-")
            .replace(/^-+|-+$/g, "");
        const randomSuffix = crypto.randomBytes(3).toString("hex");
        payload.slug = `${baseSlug || "listing"}-${randomSuffix}`;
    }

    const updated = await ListingModel.findByIdAndUpdate(id, payload, {
        new: true,
        runValidators: true,
    })
        .populate("createdBy", "name email phone profileImage")
        .populate("owner", "name email phone profileImage");

    // Audit log
    activityLogServices.createActivityLog({
        user: new Types.ObjectId(userId),
        role: userRole,
        action: "UPDATE_LISTING",
        module: (listing.category as any) || "SYSTEM",
        description: `Updated listing "${listing.title}"`,
        status: "SUCCESS",
        ipAddress: meta?.ip,
        userAgent: meta?.userAgent,
        metadata: { listingId: listing._id },
    });

    // Evict cache
    listingRedis.invalidateListing(id, (updated as any)?.slug || listing.slug, (updated as any)?.propertyNumber || listing.propertyNumber, listing.category);

    return updated;
};

/**
 * Soft delete listing
 */
const deleteListing = async (id: string, userId: string, userRole: string, meta?: { ip?: string; userAgent?: string }) => {
    if (!Types.ObjectId.isValid(id)) {
        throw new ApiError(httpStatus.BAD_REQUEST, "Invalid listing ID format.");
    }

    const listing = await ListingModel.findOne({ _id: id, isDeleted: false });
    if (!listing) {
        throw new ApiError(httpStatus.NOT_FOUND, "Listing not found.");
    }

    const isAdmin = userRole === "ADMIN";
    const isOwner = listing.createdBy.toString() === userId.toString();

    if (!isAdmin && !isOwner) {
        throw new ApiError(httpStatus.FORBIDDEN, "You do not have permission to delete this listing.");
    }

    listing.isDeleted = true;
    await listing.save();

    // Evict cache
    listingRedis.invalidateListing(id, listing.slug, listing.propertyNumber, listing.category);

    // Audit log
    activityLogServices.createActivityLog({
        user: new Types.ObjectId(userId),
        role: userRole,
        action: "DELETE_LISTING",
        module: (listing.category as any) || "SYSTEM",
        description: `Soft deleted listing "${listing.title}"`,
        status: "SUCCESS",
        ipAddress: meta?.ip,
        userAgent: meta?.userAgent,
        metadata: { listingId: listing._id },
    });

    return { message: "Listing deleted successfully." };
};

/**
 * Approve or Reject Listing (Admin Only)
 */
const approveOrRejectListing = async (id: string, adminId: string, payload: { status: "ACTIVE" | "REJECTED"; rejectionReason?: string }, meta?: { ip?: string; userAgent?: string }) => {
    if (!Types.ObjectId.isValid(id)) {
        throw new ApiError(httpStatus.BAD_REQUEST, "Invalid listing ID format.");
    }

    const listing = await ListingModel.findOne({ _id: id, isDeleted: false });
    if (!listing) {
        throw new ApiError(httpStatus.NOT_FOUND, "Listing not found.");
    }

    if (payload.status === "ACTIVE") {
        listing.status = ListingStatus.ACTIVE;
        listing.isVerified = true;
        listing.approvedBy = new Types.ObjectId(adminId);
        listing.approvedAt = new Date();
        listing.publishedAt = listing.publishedAt || new Date();
        listing.rejectionReason = undefined;
    } else {
        listing.status = ListingStatus.REJECTED;
        listing.rejectionReason = payload.rejectionReason || "Listing does not comply with marketplace standards.";
    }

    await listing.save();

    // Audit log
    activityLogServices.createActivityLog({
        user: new Types.ObjectId(adminId),
        role: "ADMIN",
        action: payload.status === "ACTIVE" ? "APPROVE_LISTING" : "REJECT_LISTING",
        module: (listing.category as any) || "SYSTEM",
        description: `${payload.status === "ACTIVE" ? "Approved" : "Rejected"} listing "${listing.title}"`,
        status: "SUCCESS",
        ipAddress: meta?.ip,
        userAgent: meta?.userAgent,
        metadata: {
            listingId: listing._id,
            newStatus: listing.status,
            rejectionReason: listing.rejectionReason,
        },
    });

    // Evict stale search & aggregate stats cache
    listingRedis.invalidateListing(listing._id.toString(), listing.slug, listing.propertyNumber, listing.category);

    return listing;
};

/**
 * Toggle Featured Status (Admin Only)
 */
const toggleFeatureStatus = async (id: string, adminId: string) => {
    if (!Types.ObjectId.isValid(id)) {
        throw new ApiError(httpStatus.BAD_REQUEST, "Invalid listing ID format.");
    }

    const listing = await ListingModel.findOne({ _id: id, isDeleted: false });
    if (!listing) {
        throw new ApiError(httpStatus.NOT_FOUND, "Listing not found.");
    }

    listing.isFeatured = !listing.isFeatured;
    await listing.save();

    // Evict stale search & aggregate stats cache
    listingRedis.invalidateListing(listing._id.toString(), listing.slug, listing.propertyNumber, listing.category);

    return listing;
};

/**
 * Toggle Verified Status (Admin Only)
 */
const toggleVerification = async (id: string, adminId: string) => {
    if (!Types.ObjectId.isValid(id)) {
        throw new ApiError(httpStatus.BAD_REQUEST, "Invalid listing ID format.");
    }

    const listing = await ListingModel.findOne({ _id: id, isDeleted: false });
    if (!listing) {
        throw new ApiError(httpStatus.NOT_FOUND, "Listing not found.");
    }

    listing.isVerified = !listing.isVerified;
    await listing.save();

    // Evict stale search & aggregate stats cache
    listingRedis.invalidateListing(listing._id.toString(), listing.slug, listing.propertyNumber, listing.category);

    return listing;
};

/**
 * Update Availability Status (Owner or Admin)
 */
const updateAvailabilityStatus = async (id: string, userId: string, userRole: string, availabilityStatus: AvailabilityStatus) => {
    if (!Types.ObjectId.isValid(id)) {
        throw new ApiError(httpStatus.BAD_REQUEST, "Invalid listing ID format.");
    }

    const listing = await ListingModel.findOne({ _id: id, isDeleted: false });
    if (!listing) {
        throw new ApiError(httpStatus.NOT_FOUND, "Listing not found.");
    }

    const isAdmin = userRole === "ADMIN";
    const isOwner = listing.createdBy.toString() === userId.toString();

    if (!isAdmin && !isOwner) {
        throw new ApiError(httpStatus.FORBIDDEN, "You do not have permission to update this listing.");
    }

    listing.availabilityStatus = availabilityStatus;
    await listing.save();

    // Evict stale search & aggregate stats cache
    listingRedis.invalidateListing(listing._id.toString(), listing.slug, listing.propertyNumber, listing.category);

    return listing;
};

/**
 * Get Featured Listings across or within a category (Redis Cache-Aside)
 */
const getFeaturedListings = async (category?: ListingCategory, limit: number = 8) => {
    const catKey = category || "all";
    const numLimit = Number(limit) || 8;

    // 1. Fast Cache-Aside lookup (< 2ms)
    const cached = await listingRedis.getCachedFeatured(catKey, numLimit);
    if (cached) {
        return cached;
    }

    const query: any = {
        isFeatured: true,
        status: ListingStatus.ACTIVE,
        isDeleted: false,
    };
    if (category) query.category = category;

    const listings = await ListingModel.find(query)
        .sort({ createdAt: -1 })
        .limit(numLimit)
        .populate("createdBy", "name email phone profileImage")
        .lean();

    // 2. Populate Redis Cache
    await listingRedis.setCachedFeatured(catKey, numLimit, listings);

    return listings;
};

/**
 * Get Marketplace Overview Statistics (Redis Cache-Aside)
 */
const getListingStats = async () => {
    // 1. Fast Cache-Aside lookup
    const cached = await listingRedis.getCachedStats();
    if (cached) {
        return cached;
    }

    const [total, active, pending, categories, topCities] = await Promise.all([
        ListingModel.countDocuments({ isDeleted: false }),
        ListingModel.countDocuments({ status: ListingStatus.ACTIVE, isDeleted: false }),
        ListingModel.countDocuments({ status: ListingStatus.PENDING_APPROVAL, isDeleted: false }),
        ListingModel.aggregate([
            { $match: { isDeleted: false } },
            {
                $group: {
                    _id: "$category",
                    total: { $sum: 1 },
                    active: {
                        $sum: {
                            $cond: [{ $eq: ["$status", ListingStatus.ACTIVE] }, 1, 0],
                        },
                    },
                },
            },
        ]),
        ListingModel.aggregate([
            { $match: { status: ListingStatus.ACTIVE, isDeleted: false } },
            {
                $group: {
                    _id: "$location.city",
                    count: { $sum: 1 },
                },
            },
            { $sort: { count: -1 } },
            { $limit: 10 },
        ]),
    ]);

    const stats = {
        totalListings: total,
        activeListings: active,
        pendingApprovalListings: pending,
        categories: categories.reduce((acc: any, curr) => {
            acc[curr._id] = { total: curr.total, active: curr.active };
            return acc;
        }, {}),
        topCities: topCities.map((c) => ({ city: c._id, count: c.count })),
    };

    // 2. Populate Redis Cache
    await listingRedis.setCachedStats(stats);

    return stats;
};

export const listingServices = {
    createListing,
    getAllListings,
    getListingByIdOrSlug,
    getMyListings,
    updateListing,
    deleteListing,
    approveOrRejectListing,
    toggleFeatureStatus,
    toggleVerification,
    updateAvailabilityStatus,
    getFeaturedListings,
    getListingStats,
};
