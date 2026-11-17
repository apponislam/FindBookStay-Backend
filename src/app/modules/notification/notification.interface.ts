import { Types } from "mongoose";
import { User } from "../auth/auth.interface";

export type NotificationType =
    | "BOOKING_CREATED"
    | "BOOKING_CONFIRMED"
    | "BOOKING_CANCELLED"
    | "MESSAGE_RECEIVED"
    | "PAYMENT_SUCCESS"
    | "REVIEW_RECEIVED"
    | "LISTING_APPROVED"
    | "LISTING_REJECTED"
    | "SYSTEM_ALERT"
    | "PROMOTION"
    | "GENERAL";

export interface INotification {
    _id?: Types.ObjectId;
    recipient: Types.ObjectId | User;
    sender?: Types.ObjectId | User | null;
    type: NotificationType;
    title: string;
    message: string;
    image?: string | null;
    link?: string | null;
    data?: Record<string, any>;
    isRead: boolean;
    readAt?: Date | null;
    isDeleted?: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}
