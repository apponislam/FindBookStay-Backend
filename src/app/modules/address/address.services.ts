import { Types } from "mongoose";
import httpStatus from "http-status";
import ApiError from "../../../errors/ApiError";
import { IAddress } from "./address.interface";
import { AddressModel } from "./address.model";

const createAddress = async (data: Partial<IAddress>) => {
    if (!data.address || !data.addressType) {
        throw new ApiError(httpStatus.BAD_REQUEST, "Please provide both the address name and a valid address type.");
    }

    if (data.upperLevelAddress) {
        if (!Types.ObjectId.isValid(data.upperLevelAddress as any)) {
            throw new ApiError(httpStatus.BAD_REQUEST, "The selected upper-level address ID is invalid. Please select a valid parent location.");
        }

        const parent = await AddressModel.findById(data.upperLevelAddress);
        if (!parent) {
            throw new ApiError(httpStatus.NOT_FOUND, "The selected upper-level parent address could not be found.");
        }
    }

    const address = await AddressModel.create({
        addressType: data.addressType.toUpperCase() as any,
        address: data.address,
        upperLevelAddress: data.upperLevelAddress || null,
    });

    return address;
};

const getAllAddresses = async (query: any) => {
    const filter: any = {};

    if (query.addressType) {
        filter.addressType = query.addressType.toUpperCase();
    }

    if (query.upperLevelAddress !== undefined) {
        if (query.upperLevelAddress === "null" || query.upperLevelAddress === null) {
            filter.upperLevelAddress = null;
        } else if (Types.ObjectId.isValid(query.upperLevelAddress)) {
            filter.upperLevelAddress = new Types.ObjectId(query.upperLevelAddress);
        }
    }

    if (query.search) {
        filter.address = { $regex: query.search, $options: "i" };
    }

    const addresses = await AddressModel.find(filter)
        .populate({
            path: "upperLevelAddress",
            select: "address addressType upperLevelAddress",
            populate: {
                path: "upperLevelAddress",
                select: "address addressType upperLevelAddress",
            },
        })
        .sort({ createdAt: -1 })
        .lean();

    return addresses;
};

const getAddressById = async (id: string) => {
    if (!Types.ObjectId.isValid(id)) {
        throw new ApiError(httpStatus.BAD_REQUEST, "The requested address ID is invalid.");
    }

    const address = await AddressModel.findById(id).populate({
        path: "upperLevelAddress",
        select: "address addressType upperLevelAddress",
        populate: {
            path: "upperLevelAddress",
            select: "address addressType upperLevelAddress",
        },
    });

    if (!address) {
        throw new ApiError(httpStatus.NOT_FOUND, "No address found matching this ID.");
    }

    return address;
};

// Get immediate children of a parent address, or root parents when parentId is 'root' or 'null'
const getChildrenByParentId = async (parentId: string) => {
    let query: any = {};

    if (parentId === "root" || parentId === "null") {
        query.upperLevelAddress = null;
    } else {
        if (!Types.ObjectId.isValid(parentId)) {
            throw new ApiError(httpStatus.BAD_REQUEST, "The provided parent address ID is invalid.");
        }
        query.upperLevelAddress = new Types.ObjectId(parentId);
    }

    const children = await AddressModel.find(query)
        .populate("upperLevelAddress", "address addressType")
        .sort({ address: 1 })
        .lean();

    return children;
};

// Get full nested hierarchical tree (Country -> State -> City -> Area -> Zone)
const getAddressTree = async () => {
    const allAddresses = await AddressModel.find().sort({ address: 1 }).lean();

    const addressMap = new Map<string, any>();
    allAddresses.forEach((item) => {
        addressMap.set(item._id.toString(), { ...item, children: [] });
    });

    const tree: any[] = [];
    addressMap.forEach((node) => {
        if (node.upperLevelAddress && addressMap.has(node.upperLevelAddress.toString())) {
            addressMap.get(node.upperLevelAddress.toString()).children.push(node);
        } else {
            tree.push(node);
        }
    });

    return tree;
};

// Traverse upwards and get complete parent lineage / breadcrumb chain from root to this address
const getParentsByAddressId = async (id: string) => {
    if (!Types.ObjectId.isValid(id)) {
        throw new ApiError(httpStatus.BAD_REQUEST, "The requested address ID is invalid.");
    }

    const breadcrumbs: any[] = [];
    let currentId: Types.ObjectId | null = new Types.ObjectId(id);

    while (currentId) {
        const current: any = await AddressModel.findById(currentId).lean();
        if (!current) break;

        breadcrumbs.unshift(current);
        currentId = current.upperLevelAddress ? new Types.ObjectId(current.upperLevelAddress) : null;
    }

    if (breadcrumbs.length === 0) {
        throw new ApiError(httpStatus.NOT_FOUND, "No address found matching this ID.");
    }

    return breadcrumbs;
};

const updateAddress = async (id: string, data: Partial<IAddress>) => {
    if (!Types.ObjectId.isValid(id)) {
        throw new ApiError(httpStatus.BAD_REQUEST, "The requested address ID is invalid.");
    }

    if (data.upperLevelAddress) {
        if (data.upperLevelAddress.toString() === id) {
            throw new ApiError(httpStatus.BAD_REQUEST, "An address cannot be set as its own upper-level parent location.");
        }

        if (!Types.ObjectId.isValid(data.upperLevelAddress as any)) {
            throw new ApiError(httpStatus.BAD_REQUEST, "The selected upper-level address ID is invalid. Please select a valid parent location.");
        }

        const parent = await AddressModel.findById(data.upperLevelAddress);
        if (!parent) {
            throw new ApiError(httpStatus.NOT_FOUND, "The selected upper-level parent address could not be found.");
        }
    }

    if (data.addressType) {
        data.addressType = data.addressType.toUpperCase() as any;
    }

    const updated = await AddressModel.findByIdAndUpdate(
        id,
        { $set: data },
        { returnDocument: "after", runValidators: true }
    ).populate({
        path: "upperLevelAddress",
        select: "address addressType upperLevelAddress",
    });

    if (!updated) {
        throw new ApiError(httpStatus.NOT_FOUND, "No address found matching this ID to update.");
    }

    return updated;
};

const deleteAddress = async (id: string) => {
    if (!Types.ObjectId.isValid(id)) {
        throw new ApiError(httpStatus.BAD_REQUEST, "The requested address ID is invalid.");
    }

    const childCount = await AddressModel.countDocuments({ upperLevelAddress: new Types.ObjectId(id) });
    if (childCount > 0) {
        throw new ApiError(
            httpStatus.CONFLICT,
            `Cannot delete this address because ${childCount} child location(s) are currently attached to it. Please reassign or remove them first.`
        );
    }

    const deleted = await AddressModel.findByIdAndDelete(id);

    if (!deleted) {
        throw new ApiError(httpStatus.NOT_FOUND, "No address found matching this ID to delete.");
    }

    return deleted;
};

export const addressServices = {
    createAddress,
    getAllAddresses,
    getAddressById,
    getChildrenByParentId,
    getAddressTree,
    getParentsByAddressId,
    updateAddress,
    deleteAddress,
};
