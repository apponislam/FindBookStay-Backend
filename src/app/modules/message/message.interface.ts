import { Types } from "mongoose";
import { User } from "../auth/auth.interface";
import { IConversation } from "../conversation/conversation.interface";

export type MessageType = "TEXT" | "IMAGE";
export type MessageStatus = "SENT" | "DELIVERED" | "READ";

export interface IMessage {
    _id?: Types.ObjectId;
    conversation: Types.ObjectId | IConversation;
    sender: Types.ObjectId | User;
    recipient: Types.ObjectId | User;
    clientMessageId?: string;
    messageType: MessageType;
    text?: string;
    attachments?: string[];
    isRead: boolean;
    readAt?: Date | null;
    status: MessageStatus;
    isDeleted?: boolean;
    deletedFor?: Types.ObjectId[];
    createdAt?: Date;
    updatedAt?: Date;
}
