import { Types } from "mongoose";
import httpStatus from "http-status";
import ApiError from "../../../errors/ApiError";
import { ToletModel } from "./tolet.model";
import { ITolet } from "./tolet.interface";

const createTolet = async (userId: string, data: Partial<ITolet>) => {
    if (!Types.ObjectId.isValid(userId)) {
        throw new ApiError(httpStatus.BAD_REQUEST, "Invalid user ID format.");
    }

    const tolet = await ToletModel.create({
        ...data,
        user: new Types.ObjectId(userId),
    });

    return tolet;
};

const getMyTolets = async (userId: string) => {
    if (!Types.ObjectId.isValid(userId)) {
        throw new ApiError(httpStatus.BAD_REQUEST, "Invalid user ID format.");
    }

    const tolets = await ToletModel.find({ user: new Types.ObjectId(userId) })
        .sort({ createdAt: -1 })
        .lean();

    return tolets;
};

const getToletById = async (id: string) => {
    if (!Types.ObjectId.isValid(id)) {
        throw new ApiError(httpStatus.BAD_REQUEST, "Invalid To-Let ID format.");
    }

    const tolet = await ToletModel.findById(id)
        .populate("user", "name email phone")
        .lean();

    if (!tolet) {
        throw new ApiError(httpStatus.NOT_FOUND, "To-Let data not found.");
    }

    return tolet;
};

const updateTolet = async (userId: string, id: string, data: Partial<ITolet>) => {
    if (!Types.ObjectId.isValid(id) || !Types.ObjectId.isValid(userId)) {
        throw new ApiError(httpStatus.BAD_REQUEST, "Invalid ID format.");
    }

    const tolet = await ToletModel.findOne({
        _id: new Types.ObjectId(id),
        user: new Types.ObjectId(userId),
    });

    if (!tolet) {
        throw new ApiError(httpStatus.NOT_FOUND, "To-Let record not found or unauthorized.");
    }

    const updated = await ToletModel.findByIdAndUpdate(
        id,
        { $set: data },
        { returnDocument: "after", runValidators: true }
    );

    return updated;
};

const deleteTolet = async (userId: string, id: string) => {
    if (!Types.ObjectId.isValid(id) || !Types.ObjectId.isValid(userId)) {
        throw new ApiError(httpStatus.BAD_REQUEST, "Invalid ID format.");
    }

    const tolet = await ToletModel.findOneAndDelete({
        _id: new Types.ObjectId(id),
        user: new Types.ObjectId(userId),
    });

    if (!tolet) {
        throw new ApiError(httpStatus.NOT_FOUND, "To-Let record not found or unauthorized.");
    }

    return {
        message: "To-Let record deleted successfully.",
    };
};

export const toletServices = {
    createTolet,
    getMyTolets,
    getToletById,
    updateTolet,
    deleteTolet,
};
