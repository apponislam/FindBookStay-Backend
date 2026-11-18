import { Types } from "mongoose";

export interface IListingView {
    _id?: Types.ObjectId;
    listing: Types.ObjectId;
    identifier: string; // "usr_<userId>" or "vis_<visitorId>" or "ip_<hash(ip+ua)>"
    user?: Types.ObjectId | null;
    ipAddress?: string | null;
    userAgent?: string | null;
    visitorId?: string | null;
    viewedAt: Date;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface IListingViewStats {
    totalViews: number;
    uniqueViews24h: number;
    viewsByDevice?: { device: string; count: number }[];
}
