import mongoose from "mongoose";
import { SiteSettingsModel } from "./siteSettings.model";

const getSiteSettings = async () => {
    let settings = await SiteSettingsModel.findOne().populate("updatedBy", "name email role profileImage");

    if (!settings) {
        settings = await SiteSettingsModel.create({});
    }

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

    if (payload.socialLinks) {
        for (const [key, val] of Object.entries(payload.socialLinks)) {
            if (val !== undefined) updateSet[`socialLinks.${key}`] = val;
        }
    }

    if (payload.businessRules) {
        for (const [key, val] of Object.entries(payload.businessRules)) {
            if (val !== undefined) updateSet[`businessRules.${key}`] = val;
        }
    }

    if (payload.appSettings) {
        for (const [key, val] of Object.entries(payload.appSettings)) {
            if (val !== undefined) updateSet[`appSettings.${key}`] = val;
        }
    }

    if (payload.maintenance) {
        for (const [key, val] of Object.entries(payload.maintenance)) {
            if (val !== undefined) updateSet[`maintenance.${key}`] = val;
        }
    }

    if (payload.seo) {
        for (const [key, val] of Object.entries(payload.seo)) {
            if (val !== undefined) updateSet[`seo.${key}`] = val;
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

    return updated;
};

export const siteSettingsServices = {
    getSiteSettings,
    updateSiteSettings,
};

