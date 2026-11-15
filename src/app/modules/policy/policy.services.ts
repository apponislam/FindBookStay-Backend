import { Types } from "mongoose";
import httpStatus from "http-status";
import ApiError from "../../../errors/ApiError";
import { IPolicy } from "./policy.interface";
import { PolicyModel } from "./policy.model";

const normalizeTypeAndSlug = (input: string) => {
    const raw = input.trim();
    const typeUpper = raw.toUpperCase().replace(/-/g, "_");
    const slugLower = raw.toLowerCase().replace(/_/g, "-");
    return { typeUpper, slugLower };
};

// Create or update (upsert) a policy document by type
const createOrUpdatePolicy = async (data: Partial<IPolicy>, adminId?: string) => {
    if (!data.type || !data.title || !data.content) {
        throw new ApiError(
            httpStatus.BAD_REQUEST,
            "Please provide policy type, title, and content."
        );
    }

    const { typeUpper, slugLower } = normalizeTypeAndSlug(data.type);
    const slug = data.slug ? data.slug.toLowerCase().replace(/_/g, "-").trim() : slugLower;

    const payload: any = {
        type: typeUpper,
        title: data.title.trim(),
        content: data.content.trim(),
        slug,
        version: data.version || "1.0",
        isActive: data.isActive !== undefined ? data.isActive : true,
        effectiveDate: data.effectiveDate || new Date(),
    };

    if (adminId && Types.ObjectId.isValid(adminId)) {
        payload.lastUpdatedBy = new Types.ObjectId(adminId);
    }

    // Upsert: update existing policy of this type or create new
    const policy = await PolicyModel.findOneAndUpdate(
        { type: typeUpper },
        { $set: payload },
        { returnDocument: "after", upsert: true, runValidators: true }
    ).populate("lastUpdatedBy", "name email");

    return policy;
};

// Get all published policies (or include inactive for admin)
const getAllPolicies = async (query: any = {}) => {
    const filter: any = {};

    if (query.includeInactive !== "true") {
        filter.isActive = true;
    }

    if (query.search) {
        filter.$or = [
            { title: { $regex: query.search, $options: "i" } },
            { type: { $regex: query.search, $options: "i" } },
            { slug: { $regex: query.search, $options: "i" } },
        ];
    }

    const policies = await PolicyModel.find(filter)
        .populate("lastUpdatedBy", "name email")
        .sort({ updatedAt: -1 })
        .lean();

    return policies;
};

// Retrieve a single policy by type or slug (e.g., 'privacy-policy', 'TERMS_AND_CONDITIONS')
const getPolicyByTypeOrSlug = async (typeOrSlug: string) => {
    if (!typeOrSlug) {
        throw new ApiError(httpStatus.BAD_REQUEST, "Policy type or slug is required.");
    }

    const { typeUpper, slugLower } = normalizeTypeAndSlug(typeOrSlug);

    const policy = await PolicyModel.findOne({
        $or: [
            { type: typeUpper },
            { slug: slugLower },
            { slug: typeOrSlug.toLowerCase().trim() },
        ],
        isActive: true,
    }).populate("lastUpdatedBy", "name email");

    if (!policy) {
        throw new ApiError(
            httpStatus.NOT_FOUND,
            `The requested policy '${typeOrSlug}' could not be found or is not active.`
        );
    }

    return policy;
};

// Update an existing policy document by ID
const updatePolicyById = async (id: string, data: Partial<IPolicy>, adminId?: string) => {
    if (!Types.ObjectId.isValid(id)) {
        throw new ApiError(httpStatus.BAD_REQUEST, "The requested policy ID is invalid.");
    }

    const updatePayload: any = { ...data };

    if (data.type) {
        const { typeUpper, slugLower } = normalizeTypeAndSlug(data.type);
        updatePayload.type = typeUpper;
        if (!data.slug) {
            updatePayload.slug = slugLower;
        }
    }

    if (data.slug) {
        updatePayload.slug = data.slug.toLowerCase().replace(/_/g, "-").trim();
    }

    if (adminId && Types.ObjectId.isValid(adminId)) {
        updatePayload.lastUpdatedBy = new Types.ObjectId(adminId);
    }

    const updated = await PolicyModel.findByIdAndUpdate(
        id,
        { $set: updatePayload },
        { returnDocument: "after", runValidators: true }
    ).populate("lastUpdatedBy", "name email");

    if (!updated) {
        throw new ApiError(httpStatus.NOT_FOUND, "No policy found matching this ID to update.");
    }

    return updated;
};

// Delete a policy document by ID
const deletePolicyById = async (id: string) => {
    if (!Types.ObjectId.isValid(id)) {
        throw new ApiError(httpStatus.BAD_REQUEST, "The requested policy ID is invalid.");
    }

    const deleted = await PolicyModel.findByIdAndDelete(id);

    if (!deleted) {
        throw new ApiError(httpStatus.NOT_FOUND, "No policy found matching this ID to delete.");
    }

    return deleted;
};

export const policyServices = {
    createOrUpdatePolicy,
    getAllPolicies,
    getPolicyByTypeOrSlug,
    updatePolicyById,
    deletePolicyById,
};
