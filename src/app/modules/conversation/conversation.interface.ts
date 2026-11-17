import { Types } from "mongoose";
import { User } from "../auth/auth.interface";
import { IListing } from "../listing/listing.interface";
import { IMessage } from "../message/message.interface";

export interface IConversation {
    _id?: Types.ObjectId;
    participants: (Types.ObjectId | User)[];
    listing?: Types.ObjectId | IListing | null;
    lastMessage?: Types.ObjectId | IMessage | null;
    lastMessageText?: string;
    lastMessageAt?: Date;
    unreadCounts?: Record<string, number>; // Map of userId -> count of unread messages
    archivedBy?: Types.ObjectId[];
    isBlocked?: boolean;
    blockedBy?: Types.ObjectId | null;
    createdAt?: Date;
    updatedAt?: Date;
}
