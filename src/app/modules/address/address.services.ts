import { Types } from "mongoose";
import httpStatus from "http-status";
import ApiError from "../../../errors/ApiError";
import { IAddress } from "./address.interface";
import { AddressModel } from "./address.model";

const createAddress = async (data: Partial<IAddress>) => {
    if (!data.address || !data.addressType) {
        throw new ApiError(httpStatus.BAD_REQUEST, "Address and addressType are required");
    }

    if (data.upperLevelAddress) {
        if (!Types.ObjectId.isValid(data.upperLevelAddress as any)) {
            throw new ApiError(httpStatus.BAD_REQUEST, "Invalid upper-level address ID");
        }

        const parent = await AddressModel.findById(data.upperLevelAddress);
        if (!parent) {
            throw new ApiError(httpStatus.NOT_FOUND, "Upper-level address not found");
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
        throw new ApiError(httpStatus.BAD_REQUEST, "Invalid address ID");
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
        throw new ApiError(httpStatus.NOT_FOUND, "Address not found");
    }

    return address;
};

const updateAddress = async (id: string, data: Partial<IAddress>) => {
    if (!Types.ObjectId.isValid(id)) {
        throw new ApiError(httpStatus.BAD_REQUEST, "Invalid address ID");
    }

    if (data.upperLevelAddress) {
        if (data.upperLevelAddress.toString() === id) {
            throw new ApiError(httpStatus.BAD_REQUEST, "An address cannot reference itself as upper-level address");
        }

        if (!Types.ObjectId.isValid(data.upperLevelAddress as any)) {
            throw new ApiError(httpStatus.BAD_REQUEST, "Invalid upper-level address ID");
        }

        const parent = await AddressModel.findById(data.upperLevelAddress);
        if (!parent) {
            throw new ApiError(httpStatus.NOT_FOUND, "Upper-level address not found");
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
        throw new ApiError(httpStatus.NOT_FOUND, "Address not found");
    }

    return updated;
};

const deleteAddress = async (id: string) => {
    if (!Types.ObjectId.isValid(id)) {
        throw new ApiError(httpStatus.BAD_REQUEST, "Invalid address ID");
    }

    const deleted = await AddressModel.findByIdAndDelete(id);

    if (!deleted) {
        throw new ApiError(httpStatus.NOT_FOUND, "Address not found");
    }

    return deleted;
};

export const addressServices = {
    createAddress,
    getAllAddresses,
    getAddressById,
    updateAddress,
    deleteAddress,
};
