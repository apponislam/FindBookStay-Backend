import { Types } from "mongoose";
import { User } from "../auth/auth.interface";
import { IConversation } from "../conversation/conversation.interface";

export type MessageType = "TEXT" | "IMAGE" | "LOCATION";
export type MessageStatus = "SENT" | "DELIVERED" | "READ";

export interface IMessageLocation {
    latitude: number;
    longitude: number;
    addressName?: string;
}

export interface IMessage {
    _id?: Types.ObjectId;
    conversation: Types.ObjectId | IConversation;
    sender: Types.ObjectId | User;
    recipient: Types.ObjectId | User;
    messageType: MessageType;
    text?: string;
    attachments?: string[];
    location?: IMessageLocation;
    isRead: boolean;
    readAt?: Date | null;
    status: MessageStatus;
    isDeleted?: boolean;
    deletedFor?: Types.ObjectId[];
    createdAt?: Date;
    updatedAt?: Date;
}
