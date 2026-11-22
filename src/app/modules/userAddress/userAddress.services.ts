import { Types } from "mongoose";
import httpStatus from "http-status";
import ApiError from "../../../errors/ApiError";
import { IUserAddress } from "./userAddress.interface";
import { UserAddressModel } from "./userAddress.model";

const createUserAddress = async (userId: string, data: Partial<IUserAddress>) => {
    if (!Types.ObjectId.isValid(userId)) {
        throw new ApiError(httpStatus.BAD_REQUEST, "Invalid user ID format.");
    }

    const userObjectId = new Types.ObjectId(userId);

    // Count user's current active addresses
    const existingCount = await UserAddressModel.countDocuments({
        user: userObjectId,
        isDeleted: false,
    });

    // If first address or explicitly marked as default, set isDefault = true
    const shouldBeDefault = existingCount === 0 || data.isDefault === true;

    if (shouldBeDefault) {
        // Unset any previous default address for this user
        await UserAddressModel.updateMany({ user: userObjectId }, { $set: { isDefault: false } });
    }

    const newAddress = await UserAddressModel.create({
        ...data,
        user: userObjectId,
        isDefault: shouldBeDefault,
        isDeleted: false,
    });

    return newAddress;
};

const getMyUserAddresses = async (userId: string) => {
    if (!Types.ObjectId.isValid(userId)) {
        throw new ApiError(httpStatus.BAD_REQUEST, "Invalid user ID format.");
    }

    const addresses = await UserAddressModel.find({
        user: new Types.ObjectId(userId),
        isDeleted: false,
    })
        .sort({ isDefault: -1, createdAt: -1 })
        .lean();

    return addresses;
};

const getUserAddressById = async (userId: string, addressId: string) => {
    if (!Types.ObjectId.isValid(addressId)) {
        throw new ApiError(httpStatus.BAD_REQUEST, "Invalid address ID format.");
    }

    const address = await UserAddressModel.findOne({
        _id: new Types.ObjectId(addressId),
        user: new Types.ObjectId(userId),
        isDeleted: false,
    }).lean();

    if (!address) {
        throw new ApiError(httpStatus.NOT_FOUND, "Saved address not found.");
    }

    return address;
};

const updateUserAddress = async (userId: string, addressId: string, data: Partial<IUserAddress>) => {
    if (!Types.ObjectId.isValid(addressId)) {
        throw new ApiError(httpStatus.BAD_REQUEST, "Invalid address ID format.");
    }

    const userObjectId = new Types.ObjectId(userId);
    const addressObjectId = new Types.ObjectId(addressId);

    const existingAddress = await UserAddressModel.findOne({
        _id: addressObjectId,
        user: userObjectId,
        isDeleted: false,
    });

    if (!existingAddress) {
        throw new ApiError(httpStatus.NOT_FOUND, "Saved address not found.");
    }

    // If making this address the default, unset all others
    if (data.isDefault === true) {
        await UserAddressModel.updateMany({ user: userObjectId, _id: { $ne: addressObjectId } }, { $set: { isDefault: false } });
    }

    const updated = await UserAddressModel.findByIdAndUpdate(addressObjectId, { $set: data }, { returnDocument: "after", runValidators: true });

    return updated;
};

const setDefaultUserAddress = async (userId: string, addressId: string) => {
    if (!Types.ObjectId.isValid(addressId)) {
        throw new ApiError(httpStatus.BAD_REQUEST, "Invalid address ID format.");
    }

    const userObjectId = new Types.ObjectId(userId);
    const addressObjectId = new Types.ObjectId(addressId);

    const address = await UserAddressModel.findOne({
        _id: addressObjectId,
        user: userObjectId,
        isDeleted: false,
    });

    if (!address) {
        throw new ApiError(httpStatus.NOT_FOUND, "Saved address not found.");
    }

    // Unset all others
    await UserAddressModel.updateMany({ user: userObjectId }, { $set: { isDefault: false } });

    // Set target address as default
    address.isDefault = true;
    await address.save();

    return address;
};

const deleteUserAddress = async (userId: string, addressId: string) => {
    if (!Types.ObjectId.isValid(addressId)) {
        throw new ApiError(httpStatus.BAD_REQUEST, "Invalid address ID format.");
    }

    const userObjectId = new Types.ObjectId(userId);
    const addressObjectId = new Types.ObjectId(addressId);

    const address = await UserAddressModel.findOne({
        _id: addressObjectId,
        user: userObjectId,
        isDeleted: false,
    });

    if (!address) {
        throw new ApiError(httpStatus.NOT_FOUND, "Saved address not found.");
    }

    const wasDefault = address.isDefault;

    // Soft delete
    address.isDeleted = true;
    address.isDefault = false;
    await address.save();

    // If the deleted address was default, promote the latest remaining active address to default
    if (wasDefault) {
        const remainingLatest = await UserAddressModel.findOne({
            user: userObjectId,
            isDeleted: false,
        }).sort({ createdAt: -1 });

        if (remainingLatest) {
            remainingLatest.isDefault = true;
            await remainingLatest.save();
        }
    }

    return {
        message: "Saved address deleted successfully.",
    };
};

export const userAddressServices = {
    createUserAddress,
    getMyUserAddresses,
    getUserAddressById,
    updateUserAddress,
    setDefaultUserAddress,
    deleteUserAddress,
};
