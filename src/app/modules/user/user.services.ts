import { Types } from "mongoose";
import httpStatus from "http-status";
import bcrypt from "bcrypt";
import config from "../../config";
import ApiError from "../../../errors/ApiError";
import { UserModel } from "../auth/auth.model";
import { User } from "../auth/auth.interface";
import { ListingModel } from "../listing/listing.model";
import { activityLogServices } from "../activityLog/activityLog.services";
import { IUserStats } from "./user.interface";

const toBoolean = (val: any): boolean | undefined => {
    if (val === undefined || val === null || val === "") return undefined;
    if (typeof val === "boolean") return val;
    const str = String(val).toLowerCase().trim();
    if (str === "true" || str === "1") return true;
    if (str === "false" || str === "0") return false;
    return undefined;
};

/**
 * Get all users with searching, filtering, and pagination (Admin only)
 */
const getAllUsers = async (filters: Record<string, any>) => {
    const query: any = {};

    // 1. Deletion status: default is false unless explicitly requested
    if (filters.isDeleted === "true" || filters.isDeleted === true) {
        query.isDeleted = true;
    } else if (filters.isDeleted === "all") {
        // No isDeleted filter
    } else {
        query.isDeleted = false;
    }

    // 2. Active status
    const isActive = toBoolean(filters.isActive);
    if (isActive !== undefined) {
        query.isActive = isActive;
    }

    // 3. Role filter
    if (filters.role) {
        query.role = String(filters.role).toUpperCase();
    }

    // 4. Verification filter
    const isEmailVerified = toBoolean(filters.isEmailVerified);
    if (isEmailVerified !== undefined) {
        query.isEmailVerified = isEmailVerified;
    }

    // 5. Publisher flags
    const hasHome = toBoolean(filters.hasHome);
    if (hasHome !== undefined) query.hasHome = hasHome;

    const hasStay = toBoolean(filters.hasStay);
    if (hasStay !== undefined) query.hasStay = hasStay;

    const hasTurf = toBoolean(filters.hasTurf);
    if (hasTurf !== undefined) query.hasTurf = hasTurf;

    const hasProperty = toBoolean(filters.hasProperty);
    if (hasProperty !== undefined) query.hasProperty = hasProperty;

    // 6. Search across name, email, phone, referralCode
    const rawSearch = filters.searchTerm || filters.search || filters.q;
    if (rawSearch && typeof rawSearch === "string" && rawSearch.trim().length > 0) {
        const term = rawSearch.trim();
        query.$or = [
            { name: { $regex: term, $options: "i" } },
            { email: { $regex: term, $options: "i" } },
            { phone: { $regex: term, $options: "i" } },
            { referralCode: { $regex: term, $options: "i" } },
        ];
    }

    // 7. Pagination & Sorting
    const page = Math.max(1, Number(filters.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(filters.limit) || 10));
    const skip = (page - 1) * limit;

    let sort: any = { createdAt: -1 };
    if (filters.sortBy) {
        const order = String(filters.sortOrder || "desc").toLowerCase() === "asc" ? 1 : -1;
        if (filters.sortBy === "name") sort = { name: order };
        else if (filters.sortBy === "email") sort = { email: order };
        else if (filters.sortBy === "lastLogin") sort = { lastLogin: order };
        else if (filters.sortBy === "createdAt") sort = { createdAt: order };
    }

    const [users, total] = await Promise.all([
        UserModel.find(query)
            .select("-password")
            .populate("disabledBy", "name email")
            .populate("referredBy", "name email referralCode")
            .sort(sort)
            .skip(skip)
            .limit(limit)
            .lean(),
        UserModel.countDocuments(query),
    ]);

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
        data: users,
    };
};

/**
 * Get single user by ID with populated details and total listings count
 */
const getUserById = async (userId: string) => {
    if (!Types.ObjectId.isValid(userId)) {
        throw new ApiError(httpStatus.BAD_REQUEST, "Invalid user ID format.");
    }

    const user = await UserModel.findById(userId)
        .select("-password")
        .populate("disabledBy", "name email role")
        .populate("referredBy", "name email referralCode")
        .lean();

    if (!user) {
        throw new ApiError(httpStatus.NOT_FOUND, "User account not found.");
    }

    // Aggregate user's active listings count
    const listingsCount = await ListingModel.countDocuments({
        createdBy: new Types.ObjectId(userId),
        isDeleted: false,
    });

    return {
        ...user,
        listingsCount,
    };
};

/**
 * Disable or Enable user account with reason note (Admin only)
 */
const updateUserStatus = async (
    userId: string,
    adminId: string,
    payload: { isActive: boolean; reason?: string },
    meta?: { ip?: string; userAgent?: string }
) => {
    if (!Types.ObjectId.isValid(userId)) {
        throw new ApiError(httpStatus.BAD_REQUEST, "Invalid user ID format.");
    }

    if (userId === adminId && payload.isActive === false) {
        throw new ApiError(httpStatus.FORBIDDEN, "Administrators cannot disable their own account.");
    }

    const user = await UserModel.findById(userId);
    if (!user) {
        throw new ApiError(httpStatus.NOT_FOUND, "User account not found.");
    }

    const prevStatus = user.isActive;
    user.isActive = payload.isActive;

    if (payload.isActive === false) {
        user.disabledReason = payload.reason?.trim() || "Disabled by administrator.";
        user.disabledAt = new Date();
        user.disabledBy = new Types.ObjectId(adminId);
    } else {
        user.disabledReason = null;
        user.disabledAt = null;
        user.disabledBy = null;
    }

    await user.save();

    // Audit log
    activityLogServices.createActivityLog({
        user: new Types.ObjectId(adminId),
        role: "ADMIN",
        action: payload.isActive ? "ENABLE_USER" : "DISABLE_USER",
        module: "USER" as any,
        description: `Admin ${payload.isActive ? "enabled" : "disabled"} account for user: ${user.email}. Status note: "${user.disabledReason || "N/A"}"`,
        status: "SUCCESS",
        ipAddress: meta?.ip,
        userAgent: meta?.userAgent,
        metadata: {
            targetUserId: user._id,
            previousStatus: prevStatus,
            newStatus: user.isActive,
            reason: user.disabledReason,
        },
    });

    return {
        _id: user._id,
        name: user.name,
        email: user.email,
        isActive: user.isActive,
        disabledReason: user.disabledReason,
        disabledAt: user.disabledAt,
        disabledBy: user.disabledBy,
    };
};

/**
 * Force password change for a user by Administrator
 */
const changeUserPasswordByAdmin = async (
    userId: string,
    adminId: string,
    newPassword: string,
    meta?: { ip?: string; userAgent?: string }
) => {
    if (!Types.ObjectId.isValid(userId)) {
        throw new ApiError(httpStatus.BAD_REQUEST, "Invalid user ID format.");
    }

    if (!newPassword || newPassword.length < 6) {
        throw new ApiError(httpStatus.BAD_REQUEST, "Password must be at least 6 characters long.");
    }

    const user = await UserModel.findById(userId);
    if (!user) {
        throw new ApiError(httpStatus.NOT_FOUND, "User account not found.");
    }

    const hashedPassword = await bcrypt.hash(newPassword, Number(config.bcrypt_salt_rounds));
    user.password = hashedPassword;
    await user.save();

    // Audit log
    activityLogServices.createActivityLog({
        user: new Types.ObjectId(adminId),
        role: "ADMIN",
        action: "UPDATE_PASSWORD",
        module: "USER" as any,
        description: `Admin forced password update for user account: ${user.email}`,
        status: "SUCCESS",
        ipAddress: meta?.ip,
        userAgent: meta?.userAgent,
        metadata: {
            targetUserId: user._id,
            targetEmail: user.email,
        },
    });

    return {
        message: "User password updated successfully by administrator.",
        userId: user._id,
    };
};

/**
 * Update user details by Administrator (role, name, phone, email verification, etc.)
 */
const updateUserByAdmin = async (
    userId: string,
    adminId: string,
    payload: Partial<User>,
    meta?: { ip?: string; userAgent?: string }
) => {
    if (!Types.ObjectId.isValid(userId)) {
        throw new ApiError(httpStatus.BAD_REQUEST, "Invalid user ID format.");
    }

    const user = await UserModel.findById(userId);
    if (!user) {
        throw new ApiError(httpStatus.NOT_FOUND, "User account not found.");
    }

    // Disallow password update via this endpoint
    const cleanPayload = { ...payload };
    delete cleanPayload.password;
    delete (cleanPayload as any)._id;

    // Check phone duplicate if updated
    if (cleanPayload.phone && cleanPayload.phone !== user.phone) {
        const existingPhone = await UserModel.findOne({
            phone: cleanPayload.phone.trim(),
            _id: { $ne: user._id },
            isDeleted: false,
        });
        if (existingPhone) {
            throw new ApiError(httpStatus.BAD_REQUEST, "Another account is already using this phone number.");
        }
    }

    const updatedUser = await UserModel.findByIdAndUpdate(
        userId,
        { $set: cleanPayload },
        { new: true, runValidators: true }
    ).select("-password");

    // Audit log
    activityLogServices.createActivityLog({
        user: new Types.ObjectId(adminId),
        role: "ADMIN",
        action: "UPDATE_PROFILE",
        module: "USER" as any,
        description: `Admin updated profile for user: ${user.email}`,
        status: "SUCCESS",
        ipAddress: meta?.ip,
        userAgent: meta?.userAgent,
        metadata: {
            targetUserId: user._id,
            updatedFields: Object.keys(cleanPayload),
        },
    });

    return updatedUser;
};

/**
 * Delete or Soft-delete user account by Administrator
 */
const deleteUserByAdmin = async (
    userId: string,
    adminId: string,
    hardDelete: boolean = false,
    meta?: { ip?: string; userAgent?: string }
) => {
    if (!Types.ObjectId.isValid(userId)) {
        throw new ApiError(httpStatus.BAD_REQUEST, "Invalid user ID format.");
    }

    if (userId === adminId) {
        throw new ApiError(httpStatus.FORBIDDEN, "Administrators cannot delete their own account.");
    }

    const user = await UserModel.findById(userId);
    if (!user) {
        throw new ApiError(httpStatus.NOT_FOUND, "User account not found.");
    }

    if (hardDelete) {
        await UserModel.findByIdAndDelete(userId);
    } else {
        user.isDeleted = true;
        user.isActive = false;
        user.disabledReason = "Account deleted by administrator.";
        user.disabledAt = new Date();
        user.disabledBy = new Types.ObjectId(adminId);
        await user.save();

        // Also soft-delete listings created by this user
        await ListingModel.updateMany(
            { createdBy: user._id, isDeleted: false },
            { $set: { isDeleted: true } }
        );
    }

    // Audit log
    activityLogServices.createActivityLog({
        user: new Types.ObjectId(adminId),
        role: "ADMIN",
        action: hardDelete ? "HARD_DELETE_USER" : "DELETE_ACCOUNT",
        module: "USER" as any,
        description: `Admin ${hardDelete ? "permanently deleted" : "soft deleted"} user: ${user.email}`,
        status: "SUCCESS",
        ipAddress: meta?.ip,
        userAgent: meta?.userAgent,
        metadata: {
            targetUserId: user._id,
            targetEmail: user.email,
            hardDelete,
        },
    });

    return {
        message: `User account ${hardDelete ? "permanently deleted" : "deactivated and deleted"} successfully.`,
    };
};

/**
 * Get comprehensive User Analytics & Statistics for Admin Dashboard
 */
const getUserStats = async (): Promise<IUserStats> => {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
        totalUsers,
        activeUsers,
        disabledUsers,
        deletedUsers,
        verifiedUsers,
        adminCount,
        homeOwners,
        stayHosts,
        turfManagers,
        propertyDealers,
        newUsersLast7Days,
        newUsersLast30Days,
    ] = await Promise.all([
        UserModel.countDocuments({ isDeleted: false }),
        UserModel.countDocuments({ isDeleted: false, isActive: true }),
        UserModel.countDocuments({ isDeleted: false, isActive: false }),
        UserModel.countDocuments({ isDeleted: true }),
        UserModel.countDocuments({ isDeleted: false, isEmailVerified: true }),
        UserModel.countDocuments({ isDeleted: false, role: "ADMIN" }),
        UserModel.countDocuments({ isDeleted: false, hasHome: true }),
        UserModel.countDocuments({ isDeleted: false, hasStay: true }),
        UserModel.countDocuments({ isDeleted: false, hasTurf: true }),
        UserModel.countDocuments({ isDeleted: false, hasProperty: true }),
        UserModel.countDocuments({ isDeleted: false, createdAt: { $gte: sevenDaysAgo } }),
        UserModel.countDocuments({ isDeleted: false, createdAt: { $gte: thirtyDaysAgo } }),
    ]);

    return {
        totalUsers,
        activeUsers,
        disabledUsers,
        deletedUsers,
        verifiedUsers,
        adminCount,
        publishers: {
            home: homeOwners,
            stay: stayHosts,
            turf: turfManagers,
            property: propertyDealers,
        },
        newUsersLast7Days,
        newUsersLast30Days,
    };
};

export const userServices = {
    getAllUsers,
    getUserById,
    updateUserStatus,
    changeUserPasswordByAdmin,
    updateUserByAdmin,
    deleteUserByAdmin,
    getUserStats,
};
