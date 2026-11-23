import { Types } from "mongoose";
import crypto from "crypto";
import httpStatus from "http-status";
import ApiError from "../../../errors/ApiError";
import { HomeModel } from "../home/home.model";
import { StayModel } from "../stay/stay.model";
import { TurfModel } from "../turf/turf.model";
import { PropertyModel } from "../property/property.model";
import { ListingViewModel } from "./listingView.model";

/**
 * Asynchronously record a unique listing view and atomically increment viewsCount if eligible.
 * Deduplicates per user/visitor/IP within a 24-hour sliding TTL window.
 * Skips counting if the viewer is the listing creator/owner or an admin.
 */
const recordListingView = async (
    listingId: Types.ObjectId,
    createdBy: Types.ObjectId | any,
    owner: Types.ObjectId | any,
    reqUser?: { _id?: string; role?: string },
    meta?: { ip?: string; userAgent?: string; visitorId?: string }
) => {
    try {
        const viewerId = reqUser?._id?.toString();
        const creatorId = createdBy?._id ? createdBy._id.toString() : createdBy?.toString();
        const ownerId = owner?._id ? owner._id.toString() : owner?.toString();

        // 1. Skip if the viewer is the listing creator or owner
        const isOwner = viewerId && (viewerId === creatorId || (ownerId && viewerId === ownerId));
        if (isOwner) return;

        // 2. Skip if the viewer is an Admin
        const isAdmin = reqUser?.role === "ADMIN";
        if (isAdmin) return;

        // 3. Determine unique visitor identifier
        let identifier: string;
        if (viewerId) {
            identifier = `usr_${viewerId}`;
        } else if (meta?.visitorId) {
            identifier = `vis_${meta.visitorId}`;
        } else {
            const raw = `${meta?.ip || "unknown"}_${meta?.userAgent || "unknown"}`;
            const hash = crypto.createHash("md5").update(raw).digest("hex");
            identifier = `ip_${hash}`;
        }

        // 4. Attempt to insert view record.
        // If a view record with { listing: listingId, identifier } already exists within 24h,
        // MongoDB's unique compound index throws duplicate key error (code 11000).
        await ListingViewModel.create({
            listing: listingId,
            identifier,
            user: viewerId ? new Types.ObjectId(viewerId) : null,
            ipAddress: meta?.ip || null,
            userAgent: meta?.userAgent || null,
            visitorId: meta?.visitorId || null,
            viewedAt: new Date(),
        });

        // 5. New unique view confirmed: atomically increment viewsCount on the listing
        await Promise.all([
            HomeModel.updateOne({ _id: listingId }, { $inc: { viewsCount: 1 } }),
            StayModel.updateOne({ _id: listingId }, { $inc: { viewsCount: 1 } }),
            TurfModel.updateOne({ _id: listingId }, { $inc: { viewsCount: 1 } }),
            PropertyModel.updateOne({ _id: listingId }, { $inc: { viewsCount: 1 } }),
        ]);
    } catch (err: any) {
        // E11000 duplicate key error means this visitor already viewed this listing within the 24h TTL window.
        if (err.code === 11000) {
            return; // Deduplicated silently
        }
        console.error("⚠️ [Listing View Tracking Error]:", err.message);
    }
};

/**
 * Get listing view analytics (Owner or Admin only)
 */
const getListingViewAnalytics = async (
    listingId: string,
    reqUser: { _id: string; role: string }
) => {
    const [home, stay, turf, property] = await Promise.all([
        HomeModel.findById(listingId).select("title createdBy owner viewsCount"),
        StayModel.findById(listingId).select("title createdBy owner viewsCount"),
        TurfModel.findById(listingId).select("title createdBy owner viewsCount"),
        PropertyModel.findById(listingId).select("title createdBy owner viewsCount"),
    ]);
    const listing = home || stay || turf || property;

    if (!listing) {
        throw new ApiError(httpStatus.NOT_FOUND, "Listing not found.");
    }

    const isOwner =
        listing.createdBy?.toString() === reqUser._id.toString() ||
        listing.owner?.toString() === reqUser._id.toString();
    const isAdmin = reqUser.role === "ADMIN";

    if (!isOwner && !isAdmin) {
        throw new ApiError(httpStatus.FORBIDDEN, "You are not authorized to view analytics for this listing.");
    }

    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [uniqueViewsLast24h, recentViews] = await Promise.all([
        ListingViewModel.countDocuments({
            listing: new Types.ObjectId(listingId),
            createdAt: { $gte: twentyFourHoursAgo },
        }),
        ListingViewModel.find({ listing: new Types.ObjectId(listingId) })
            .sort({ viewedAt: -1 })
            .limit(10)
            .select("viewedAt userAgent ipAddress")
            .lean(),
    ]);

    return {
        listingId: listing._id,
        listingTitle: listing.title,
        allTimeViewsCount: listing.viewsCount || 0,
        uniqueViewsLast24h,
        recentViews,
    };
};

export const listingViewServices = {
    recordListingView,
    getListingViewAnalytics,
};
