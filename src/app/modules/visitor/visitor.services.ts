import mongoose from "mongoose";
import httpStatus from "http-status";
import ApiError from "../../../errors/ApiError";
import { ClientPlatform, DeviceType, IVisitor } from "./visitor.interface";
import { VisitorModel } from "./visitor.model";

const parseUserAgent = (
    userAgent?: string,
    explicitPlatform?: ClientPlatform,
): { browser: string; os: string; device: DeviceType; platform: ClientPlatform } => {
    if (!userAgent && !explicitPlatform) {
        return { browser: "Unknown", os: "Unknown", device: "Desktop", platform: "WEB" };
    }

    const ua = userAgent || "";
    let browser = "Unknown";
    let os = "Unknown";
    let device: DeviceType = "Desktop";
    let platform: ClientPlatform = explicitPlatform || "WEB";

    // Detect mobile apps or frameworks in UA (e.g. Flutter, React Native, Dart, OkHttp, CFNetwork, Alamofire)
    const isAppUA = /dart|okhttp|cfnetwork|alamofire|expo|reactnative|flutter|findbookstayapp/i.test(ua);

    // Device detection
    if (/tablet|ipad|playbook|silk/i.test(ua)) {
        device = "Tablet";
    } else if (/mobile|iphone|ipod|android|blackberry|opera mini|iemobile|wpdesktop/i.test(ua) || isAppUA) {
        device = "Mobile";
    }

    // OS detection
    if (/iphone|ipad|ipod/i.test(ua)) {
        os = "iOS";
        if (!explicitPlatform) platform = isAppUA ? "IOS" : "WEB";
    } else if (/android/i.test(ua)) {
        os = "Android";
        if (!explicitPlatform) platform = isAppUA ? "ANDROID" : "WEB";
    } else if (/windows nt 10/i.test(ua)) os = "Windows 10/11";
    else if (/windows nt 6.3/i.test(ua)) os = "Windows 8.1";
    else if (/windows nt 6.2/i.test(ua)) os = "Windows 8";
    else if (/windows nt 6.1/i.test(ua)) os = "Windows 7";
    else if (/windows/i.test(ua)) os = "Windows";
    else if (/macintosh|mac os x/i.test(ua)) os = "macOS";
    else if (/linux/i.test(ua)) os = "Linux";

    // Browser detection (for Web clients)
    if (isAppUA || explicitPlatform === "APP" || explicitPlatform === "ANDROID" || explicitPlatform === "IOS") {
        browser = "Mobile App";
        if (!explicitPlatform) platform = "APP";
    } else {
        if (/edg/i.test(ua)) browser = "Edge";
        else if (/chrome|crios/i.test(ua) && !/opr|opera/i.test(ua)) browser = "Chrome";
        else if (/firefox|fxios/i.test(ua)) browser = "Firefox";
        else if (/safari/i.test(ua) && !/chrome|crios/i.test(ua)) browser = "Safari";
        else if (/opr|opera/i.test(ua)) browser = "Opera";
        else if (/msie|trident/i.test(ua)) browser = "Internet Explorer";
    }

    return { browser, os, device, platform };
};

const trackVisitor = async (payload: {
    visitorId?: string;
    platform?: ClientPlatform;
    device?: DeviceType;
    deviceModel?: string;
    deviceBrand?: string;
    appVersion?: string;
    buildNumber?: string;
    fcmToken?: string;
    currentPath?: string;
    currentScreen?: string;
    referrer?: string;
    country?: string;
    city?: string;
    region?: string;
    metadata?: Record<string, any>;
    ipAddress?: string;
    userAgent?: string;
    userId?: string | null;
}) => {
    const {
        visitorId,
        platform: explicitPlatform,
        device: explicitDevice,
        deviceModel,
        deviceBrand,
        appVersion,
        buildNumber,
        fcmToken,
        currentPath = "/",
        currentScreen,
        referrer = "direct",
        country,
        city,
        region,
        metadata,
        ipAddress,
        userAgent,
        userId,
    } = payload;

    const parsedUA = parseUserAgent(userAgent, explicitPlatform);

    // Resolve final platform and device
    let finalPlatform: ClientPlatform = explicitPlatform || parsedUA.platform;
    if (!explicitPlatform && (appVersion || deviceModel || currentScreen)) {
        finalPlatform = parsedUA.os === "iOS" ? "IOS" : parsedUA.os === "Android" ? "ANDROID" : "APP";
    }

    const finalDevice: DeviceType = explicitDevice || (finalPlatform !== "WEB" ? (parsedUA.device === "Tablet" ? "Tablet" : "Mobile") : parsedUA.device);
    const finalBrowser = finalPlatform !== "WEB" && parsedUA.browser === "Unknown" ? "Mobile App" : parsedUA.browser;

    const now = new Date();
    const sessionItem = {
        path: currentPath || currentScreen || "/",
        screenName: currentScreen,
        referrer,
        timestamp: now,
    };

    let userObjectId: mongoose.Types.ObjectId | null = null;
    if (userId && mongoose.Types.ObjectId.isValid(userId)) {
        userObjectId = new mongoose.Types.ObjectId(userId);
    }

    const existingVisitor = visitorId ? await VisitorModel.findOne({ visitorId }) : null;

    if (existingVisitor) {
        // Increment visit count and update dynamic visitor session info
        const updateFields: any = {
            $inc: { visitCount: 1 },
            $set: {
                lastVisit: now,
                currentPath,
                currentScreen: currentScreen || existingVisitor.currentScreen,
                referrer,
                ipAddress: ipAddress || existingVisitor.ipAddress,
                userAgent: userAgent || existingVisitor.userAgent,
                platform: finalPlatform,
                device: finalDevice,
                browser: finalBrowser !== "Unknown" ? finalBrowser : existingVisitor.browser,
                os: parsedUA.os !== "Unknown" ? parsedUA.os : existingVisitor.os,
                ...(deviceModel && { deviceModel }),
                ...(deviceBrand && { deviceBrand }),
                ...(appVersion && { appVersion }),
                ...(buildNumber && { buildNumber }),
                ...(fcmToken && { fcmToken }),
                ...(country && { country }),
                ...(city && { city }),
                ...(region && { region }),
                ...(metadata && { metadata: { ...existingVisitor.metadata, ...metadata } }),
                ...(userObjectId && { user: userObjectId }),
            },
            $push: {
                recentVisits: {
                    $each: [sessionItem],
                    $slice: -20, // Keep last 20 recent visits
                },
            },
        };

        const updated = await VisitorModel.findOneAndUpdate({ visitorId }, updateFields, {
            new: true,
            runValidators: true,
        }).populate("user", "name email role profileImage");

        return updated;
    } else {
        // Create new visitor profile; visitorId is auto-generated in VisitorSchema pre("save") if not provided
        const visitorData: any = {
            user: userObjectId,
            ipAddress,
            userAgent,
            platform: finalPlatform,
            device: finalDevice,
            browser: finalBrowser,
            os: parsedUA.os,
            deviceModel: deviceModel || null,
            deviceBrand: deviceBrand || null,
            appVersion: appVersion || null,
            buildNumber: buildNumber || null,
            fcmToken: fcmToken || null,
            country: country || "Unknown",
            city: city || "Unknown",
            region: region || "Unknown",
            currentPath,
            currentScreen: currentScreen || null,
            referrer,
            visitCount: 1,
            firstVisit: now,
            lastVisit: now,
            recentVisits: [sessionItem],
            metadata: metadata || {},
        };

        if (visitorId) {
            visitorData.visitorId = visitorId;
        }

        const newVisitor = await VisitorModel.create(visitorData);
        return newVisitor;
    }
};

const getAllVisitors = async (query: Record<string, any>) => {
    const { search, platform, device, browser, os, country, city, isUser, startDate, endDate, page = 1, limit = 10, sortBy = "lastVisit", sortOrder = "desc" } = query;

    const filter: any = {};

    // Search query: visitorId, ipAddress, currentPath, currentScreen, deviceModel, browser, os, country, city
    if (search && typeof search === "string" && search.trim() !== "") {
        const searchRegex = new RegExp(search.trim(), "i");
        filter.$or = [
            { visitorId: searchRegex },
            { ipAddress: searchRegex },
            { currentPath: searchRegex },
            { currentScreen: searchRegex },
            { deviceModel: searchRegex },
            { browser: searchRegex },
            { os: searchRegex },
            { country: searchRegex },
            { city: searchRegex },
        ];
    }

    if (platform && typeof platform === "string") {
        filter.platform = platform.toUpperCase();
    }

    if (device && typeof device === "string") {
        filter.device = device;
    }

    if (browser && typeof browser === "string") {
        filter.browser = new RegExp(browser.trim(), "i");
    }

    if (os && typeof os === "string") {
        filter.os = new RegExp(os.trim(), "i");
    }

    if (country && typeof country === "string") {
        filter.country = new RegExp(country.trim(), "i");
    }

    if (city && typeof city === "string") {
        filter.city = new RegExp(city.trim(), "i");
    }

    if (isUser !== undefined) {
        if (isUser === "true" || isUser === true) {
            filter.user = { $ne: null };
        } else if (isUser === "false" || isUser === false) {
            filter.user = null;
        }
    }

    // Date range filtering on lastVisit
    if (startDate || endDate) {
        filter.lastVisit = {};
        if (startDate) {
            filter.lastVisit.$gte = new Date(startDate);
        }
        if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            filter.lastVisit.$lte = end;
        }
    }

    const pageNumber = Math.max(1, Number(page));
    const limitNumber = Math.max(1, Number(limit));
    const skip = (pageNumber - 1) * limitNumber;

    const sortObject: any = {};
    sortObject[sortBy] = sortOrder === "asc" ? 1 : -1;

    const [visitors, total] = await Promise.all([VisitorModel.find(filter).sort(sortObject).skip(skip).limit(limitNumber).populate("user", "name email role profileImage").lean(), VisitorModel.countDocuments(filter)]);

    const totalPages = Math.ceil(total / limitNumber);

    return {
        data: visitors,
        meta: {
            page: pageNumber,
            limit: limitNumber,
            total,
            totalPages,
            hasNext: pageNumber < totalPages,
            hasPrev: pageNumber > 1,
        },
    };
};

const getVisitorById = async (id: string) => {
    let query: any = { visitorId: id };
    if (mongoose.Types.ObjectId.isValid(id)) {
        query = { $or: [{ _id: new mongoose.Types.ObjectId(id) }, { visitorId: id }] };
    }

    const visitor = await VisitorModel.findOne(query).populate("user", "name email role profileImage phone");
    if (!visitor) {
        throw new ApiError(httpStatus.NOT_FOUND, "Visitor record not found.");
    }

    return visitor;
};

const getVisitorAnalytics = async (query: Record<string, any> = {}) => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [totalVisitors, todayVisitors, thisWeekVisitors, thisMonthVisitors, registeredCount, guestsCount, totalVisitsAgg, platformAgg, deviceAgg, browserAgg, topPagesAgg, topCountriesAgg] = await Promise.all([
        VisitorModel.countDocuments(),
        VisitorModel.countDocuments({ lastVisit: { $gte: startOfToday } }),
        VisitorModel.countDocuments({ lastVisit: { $gte: sevenDaysAgo } }),
        VisitorModel.countDocuments({ lastVisit: { $gte: thirtyDaysAgo } }),
        VisitorModel.countDocuments({ user: { $ne: null } }),
        VisitorModel.countDocuments({ user: null }),
        VisitorModel.aggregate([{ $group: { _id: null, totalVisits: { $sum: "$visitCount" } } }]),
        VisitorModel.aggregate([{ $group: { _id: "$platform", count: { $sum: 1 } } }]),
        VisitorModel.aggregate([{ $group: { _id: "$device", count: { $sum: 1 } } }]),
        VisitorModel.aggregate([{ $group: { _id: "$browser", count: { $sum: 1 } } }, { $sort: { count: -1 } }, { $limit: 6 }]),
        VisitorModel.aggregate([{ $group: { _id: "$currentPath", count: { $sum: "$visitCount" } } }, { $sort: { count: -1 } }, { $limit: 10 }]),
        VisitorModel.aggregate([{ $match: { country: { $ne: "Unknown" } } }, { $group: { _id: "$country", count: { $sum: 1 } } }, { $sort: { count: -1 } }, { $limit: 10 }]),
    ]);

    const totalVisits = totalVisitsAgg[0]?.totalVisits || 0;

    const platformBreakdown = platformAgg.reduce((acc: any, cur: any) => {
        acc[cur._id || "WEB"] = cur.count;
        return acc;
    }, {});

    const deviceBreakdown = deviceAgg.reduce((acc: any, cur: any) => {
        acc[cur._id || "Unknown"] = cur.count;
        return acc;
    }, {});

    const browserBreakdown = browserAgg.map((item: any) => ({
        browser: item._id || "Unknown",
        count: item.count,
    }));

    const topPages = topPagesAgg.map((item: any) => ({
        path: item._id || "/",
        visits: item.count,
    }));

    const topCountries = topCountriesAgg.map((item: any) => ({
        country: item._id,
        visitors: item.count,
    }));

    return {
        summary: {
            totalVisitors,
            totalVisits,
            todayVisitors,
            thisWeekVisitors,
            thisMonthVisitors,
            registeredUsers: registeredCount,
            guestVisitors: guestsCount,
        },
        platformBreakdown,
        deviceBreakdown,
        browserBreakdown,
        topPages,
        topCountries,
    };
};

const deleteVisitor = async (id: string) => {
    let query: any = { visitorId: id };
    if (mongoose.Types.ObjectId.isValid(id)) {
        query = { $or: [{ _id: new mongoose.Types.ObjectId(id) }, { visitorId: id }] };
    }

    const deleted = await VisitorModel.findOneAndDelete(query);
    if (!deleted) {
        throw new ApiError(httpStatus.NOT_FOUND, "Visitor record not found.");
    }

    return { message: "Visitor record deleted successfully." };
};

export const visitorServices = {
    trackVisitor,
    getAllVisitors,
    getVisitorById,
    getVisitorAnalytics,
    deleteVisitor,
};
