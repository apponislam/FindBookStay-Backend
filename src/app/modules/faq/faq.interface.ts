import { Types } from "mongoose";

export enum FAQCategory {
    GENERAL = "GENERAL",
    HOME = "HOME",
    STAY = "STAY",
    TURF = "TURF",
    PROPERTY = "PROPERTY",
    BOOKING = "BOOKING",
    PAYMENT = "PAYMENT",
    ACCOUNT = "ACCOUNT",
    HOST = "HOST",
}

export interface IFAQ {
    _id?: Types.ObjectId;
    question: string;
    answer: string;
    category: FAQCategory;
    tags?: string[];
    order: number;
    isActive: boolean;
    isDeleted: boolean;
    viewsCount?: number;
    helpfulCount?: number;
    notHelpfulCount?: number;
    createdBy?: Types.ObjectId;
    updatedBy?: Types.ObjectId;
    createdAt?: Date;
    updatedAt?: Date;
}

