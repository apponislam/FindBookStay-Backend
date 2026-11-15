import { Types } from "mongoose";

export const POLICY_TYPES = [
    "TERMS_AND_CONDITIONS",
    "PRIVACY_POLICY",
    "ABOUT_US",
    "REFUND_POLICY",
    "CANCELLATION_POLICY",
    "COMMUNITY_GUIDELINES",
] as const;

export type PolicyType = (typeof POLICY_TYPES)[number] | (string & {});

export interface IPolicy {
    type: PolicyType;
    title: string;
    content: string;
    slug?: string;
    version?: string;
    isActive: boolean;
    lastUpdatedBy?: Types.ObjectId | null;
    effectiveDate?: Date;
    createdAt?: Date;
    updatedAt?: Date;
}
