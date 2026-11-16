import { z } from "zod";
import { ReportTargetType, ReportReason, ReportPriority } from "./report.interface";

const createReportZodSchema = z
    .object({
        targetType: z.nativeEnum(ReportTargetType, {
            message: "Target type must be either LISTING or USER.",
        }),
        reportedListing: z.string().optional(),
        reportedUser: z.string().optional(),
        reason: z.nativeEnum(ReportReason, {
            message: "A valid report reason is required.",
        }),
        description: z
            .string({ message: "Description is required." })
            .min(10, "Description must be at least 10 characters.")
            .max(2000, "Description cannot exceed 2000 characters."),
        evidenceImages: z.array(z.string()).optional(),
    })
    .refine(
        (data) => {
            if (data.targetType === ReportTargetType.LISTING) {
                return !!data.reportedListing && data.reportedListing.trim().length > 0;
            }
            if (data.targetType === ReportTargetType.USER) {
                return !!data.reportedUser && data.reportedUser.trim().length > 0;
            }
            return true;
        },
        {
            message: "Must provide reportedListing for LISTING reports, or reportedUser for USER reports.",
            path: ["reportedListing"],
        }
    );

const updateReportStatusZodSchema = z.object({
    status: z.enum(["UNDER_REVIEW", "RESOLVED", "DISMISSED"], {
        message: "Status must be UNDER_REVIEW, RESOLVED, or DISMISSED.",
    }),
    priority: z.nativeEnum(ReportPriority).optional(),
    adminNotes: z.string().max(1000).optional(),
    actionTaken: z.string().max(500).optional(),
});

export const reportValidations = {
    createReportZodSchema,
    updateReportStatusZodSchema,
};

