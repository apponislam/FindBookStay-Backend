import mongoose from "mongoose";
import { SiteSettingsModel } from "./siteSettings.model";
import { siteSettingsRedis } from "./siteSettings.redis";

const parseNestedField = (val: any) => {
    if (typeof val === "string") {
        try {
            return JSON.parse(val);
        } catch {
            return val;
        }
    }
    return val;
};

const getSiteSettings = async () => {
    // 1. Check Redis cache first
    const cached = await siteSettingsRedis.getCachedSiteSettings();
    if (cached) {
        return cached;
    }

    // 2. Fetch from MongoDB
    let settings = await SiteSettingsModel.findOne().populate("updatedBy", "name email role profileImage");

    if (!settings) {
        settings = await SiteSettingsModel.create({});
    }

    // 3. Cache the fetched document
    await siteSettingsRedis.setCachedSiteSettings(settings.toObject ? settings.toObject() : settings);

    return settings;
};

const updateSiteSettings = async (adminId: string, payload: Record<string, any>) => {
    const adminObjectId = new mongoose.Types.ObjectId(adminId);

    // Build dot-notation update fields for deep partial updates
    const updateSet: Record<string, any> = {
        updatedBy: adminObjectId,
    };

    const directFields = [
        "siteName",
        "siteTagline",
        "siteLogo",
        "siteFavicon",
        "supportEmail",
        "supportPhone",
        "emergencyContact",
        "officeAddress",
    ];

    for (const field of directFields) {
        if (payload[field] !== undefined) {
            updateSet[field] = payload[field];
        }
    }

    if (payload.ogImage !== undefined) {
        updateSet["seo.ogImage"] = payload.ogImage;
    }

    const nestedGroups = ["socialLinks", "businessRules", "features", "appSettings", "maintenance", "seo"];

    for (const group of nestedGroups) {
        if (payload[group] !== undefined) {
            const parsed = parseNestedField(payload[group]);
            if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
                for (const [key, val] of Object.entries(parsed)) {
                    if (val !== undefined) {
                        updateSet[`${group}.${key}`] = val;
                    }
                }
            }
        }
    }

    let existing = await SiteSettingsModel.findOne();

    let updated;
    if (existing) {
        updated = await SiteSettingsModel.findByIdAndUpdate(
            existing._id,
            { $set: updateSet },
            { new: true, runValidators: true },
        ).populate("updatedBy", "name email role profileImage");
    } else {
        updated = await SiteSettingsModel.create({
            ...payload,
            updatedBy: adminObjectId,
        });
    }

    // Invalidate old cache and update with new settings
    await siteSettingsRedis.invalidateSiteSettings();
    if (updated) {
        await siteSettingsRedis.setCachedSiteSettings(updated.toObject ? updated.toObject() : updated);
    }

    return updated;
};

export const siteSettingsServices = {
    getSiteSettings,
    updateSiteSettings,
};
