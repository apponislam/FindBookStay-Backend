import { Types } from "mongoose";
import httpStatus from "http-status";
import ApiError from "../../../errors/ApiError";
import { FAQModel } from "./faq.model";
import { IFAQ, FAQCategory } from "./faq.interface";

const toBoolean = (val: any): boolean | undefined => {
    if (val === undefined || val === null || val === "") return undefined;
    if (typeof val === "boolean") return val;
    const str = String(val).toLowerCase().trim();
    if (str === "true" || str === "1") return true;
    if (str === "false" || str === "0") return false;
    return undefined;
};

/**
 * Create a new FAQ entry (Admin only)
 */
const createFAQ = async (payload: Partial<IFAQ>, adminId: string) => {
    const adminObjId = new Types.ObjectId(adminId);

    // Auto-calculate order if not provided
    let order = payload.order;
    if (order === undefined || isNaN(order)) {
        const lastFaq = await FAQModel.findOne({
            category: payload.category || FAQCategory.GENERAL,
            isDeleted: false,
        }).sort({ order: -1 });
        order = lastFaq ? (lastFaq.order || 0) + 1 : 0;
    }

    const faq = await FAQModel.create({
        ...payload,
        order,
        createdBy: adminObjId,
        updatedBy: adminObjId,
        viewsCount: 0,
        helpfulCount: 0,
        notHelpfulCount: 0,
        isDeleted: false,
    });

    return faq;
};

/**
 * Get all FAQs with searching, category filtering, and optional grouping
 */
const getAllFAQs = async (filters: Record<string, any>, isAdmin: boolean = false) => {
    const query: any = { isDeleted: false };

    // Public visitors only see active FAQs; Admins can see all or filter by status
    if (!isAdmin) {
        query.isActive = true;
    } else {
        const isActive = toBoolean(filters.isActive);
        if (isActive !== undefined) {
            query.isActive = isActive;
        }
    }

    // Category filter
    if (filters.category) {
        const categories = String(filters.category)
            .split(",")
            .map((c) => c.trim().toUpperCase())
            .filter(Boolean);
        if (categories.length === 1) {
            query.category = categories[0];
        } else if (categories.length > 1) {
            query.category = { $in: categories };
        }
    }

    // Search query
    const rawSearch = filters.searchTerm || filters.search || filters.q;
    if (rawSearch && typeof rawSearch === "string" && rawSearch.trim().length > 0) {
        const term = rawSearch.trim();
        query.$or = [
            { question: { $regex: term, $options: "i" } },
            { answer: { $regex: term, $options: "i" } },
            { tags: { $regex: term, $options: "i" } },
        ];
    }

    // Fetch FAQs sorted by order and creation
    const faqs = await FAQModel.find(query)
        .sort({ order: 1, createdAt: -1 })
        .populate("createdBy", "name email")
        .populate("updatedBy", "name email")
        .lean();

    // Grouping support (e.g. ?grouped=true returns { GENERAL: [...], HOME: [...] })
    const isGrouped = toBoolean(filters.grouped);
    let resultData: any = faqs;

    if (isGrouped) {
        resultData = faqs.reduce((acc: Record<string, any[]>, curr: any) => {
            const cat = curr.category || FAQCategory.GENERAL;
            if (!acc[cat]) acc[cat] = [];
            acc[cat].push(curr);
            return acc;
        }, {});
    }

    // Category counts breakdown
    const categoryCounts = await FAQModel.aggregate([
        { $match: { isDeleted: false, ...(isAdmin ? {} : { isActive: true }) } },
        { $group: { _id: "$category", count: { $sum: 1 } } },
    ]);

    const counts: Record<string, number> = {};
    categoryCounts.forEach((c) => {
        counts[c._id] = c.count;
    });

    return {
        meta: {
            total: faqs.length,
            counts,
            isGrouped: Boolean(isGrouped),
        },
        data: resultData,
    };
};

/**
 * Get single FAQ by ID
 */
const getFAQById = async (id: string, incrementView: boolean = true) => {
    if (!Types.ObjectId.isValid(id)) {
        throw new ApiError(httpStatus.BAD_REQUEST, "Invalid FAQ ID format.");
    }

    const faq = await FAQModel.findOne({ _id: id, isDeleted: false })
        .populate("createdBy", "name email")
        .populate("updatedBy", "name email");

    if (!faq) {
        throw new ApiError(httpStatus.NOT_FOUND, "The requested FAQ entry could not be found.");
    }

    if (incrementView) {
        FAQModel.updateOne({ _id: id }, { $inc: { viewsCount: 1 } }).exec();
    }

    return faq;
};

/**
 * Update FAQ entry (Admin only)
 */
const updateFAQ = async (id: string, payload: Partial<IFAQ>, adminId: string) => {
    if (!Types.ObjectId.isValid(id)) {
        throw new ApiError(httpStatus.BAD_REQUEST, "Invalid FAQ ID format.");
    }

    const faq = await FAQModel.findOne({ _id: id, isDeleted: false });
    if (!faq) {
        throw new ApiError(httpStatus.NOT_FOUND, "The requested FAQ entry could not be found.");
    }

    const updated = await FAQModel.findByIdAndUpdate(
        id,
        {
            $set: {
                ...payload,
                updatedBy: new Types.ObjectId(adminId),
            },
        },
        { new: true, runValidators: true }
    )
        .populate("createdBy", "name email")
        .populate("updatedBy", "name email");

    return updated;
};

/**
 * Delete FAQ entry (Admin only)
 */
const deleteFAQ = async (id: string, hardDelete: boolean = false) => {
    if (!Types.ObjectId.isValid(id)) {
        throw new ApiError(httpStatus.BAD_REQUEST, "Invalid FAQ ID format.");
    }

    const faq = await FAQModel.findById(id);
    if (!faq) {
        throw new ApiError(httpStatus.NOT_FOUND, "FAQ not found.");
    }

    if (hardDelete) {
        await FAQModel.findByIdAndDelete(id);
    } else {
        faq.isDeleted = true;
        faq.isActive = false;
        await faq.save();
    }

    return {
        message: `FAQ ${hardDelete ? "permanently deleted" : "deleted"} successfully.`,
    };
};

/**
 * Bulk reorder FAQs (Admin only)
 */
const reorderFAQs = async (items: { id: string; order: number }[]) => {
    const bulkOps = items
        .filter((item) => Types.ObjectId.isValid(item.id))
        .map((item) => ({
            updateOne: {
                filter: { _id: new Types.ObjectId(item.id) },
                update: { $set: { order: Number(item.order) || 0 } },
            },
        }));

    if (bulkOps.length > 0) {
        await FAQModel.bulkWrite(bulkOps);
    }

    return {
        message: `${bulkOps.length} FAQs reordered successfully.`,
    };
};

/**
 * Submit feedback on FAQ (Helpful or Not Helpful)
 */
const submitFAQFeedback = async (id: string, type: "helpful" | "notHelpful") => {
    if (!Types.ObjectId.isValid(id)) {
        throw new ApiError(httpStatus.BAD_REQUEST, "Invalid FAQ ID format.");
    }

    const incField = type === "helpful" ? { helpfulCount: 1 } : { notHelpfulCount: 1 };
    const updated = await FAQModel.findOneAndUpdate(
        { _id: id, isDeleted: false },
        { $inc: incField },
        { new: true }
    ).select("question helpfulCount notHelpfulCount");

    if (!updated) {
        throw new ApiError(httpStatus.NOT_FOUND, "FAQ not found.");
    }

    return {
        message: "Thank you for your feedback!",
        data: updated,
    };
};

/**
 * Get FAQ statistics for Admin Dashboard
 */
const getFAQStats = async () => {
    const [total, active, inactive, helpfulStats, categoryStats] = await Promise.all([
        FAQModel.countDocuments({ isDeleted: false }),
        FAQModel.countDocuments({ isDeleted: false, isActive: true }),
        FAQModel.countDocuments({ isDeleted: false, isActive: false }),
        FAQModel.aggregate([
            { $match: { isDeleted: false } },
            {
                $group: {
                    _id: null,
                    totalViews: { $sum: "$viewsCount" },
                    totalHelpful: { $sum: "$helpfulCount" },
                    totalNotHelpful: { $sum: "$notHelpfulCount" },
                },
            },
        ]),
        FAQModel.aggregate([
            { $match: { isDeleted: false } },
            {
                $group: {
                    _id: "$category",
                    total: { $sum: 1 },
                    active: { $sum: { $cond: ["$isActive", 1, 0] } },
                },
            },
        ]),
    ]);

    const totals = helpfulStats[0] || { totalViews: 0, totalHelpful: 0, totalNotHelpful: 0 };

    return {
        totalFAQs: total,
        activeFAQs: active,
        inactiveFAQs: inactive,
        totalViews: totals.totalViews,
        totalHelpfulVotes: totals.totalHelpful,
        totalNotHelpfulVotes: totals.totalNotHelpful,
        categories: categoryStats.reduce((acc: any, curr) => {
            acc[curr._id] = { total: curr.total, active: curr.active };
            return acc;
        }, {}),
    };
};

export const faqServices = {
    createFAQ,
    getAllFAQs,
    getFAQById,
    updateFAQ,
    deleteFAQ,
    reorderFAQs,
    submitFAQFeedback,
    getFAQStats,
};

