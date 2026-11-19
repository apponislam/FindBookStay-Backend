import { z } from "zod";

const updateUserStatusZodSchema = z.object({
    isActive: z.boolean({
        message: "Status flag (isActive: true / false) is required.",
    }),
    reason: z
        .string()
        .max(500, "Reason cannot exceed 500 characters.")
        .optional(),
});

const changeUserPasswordByAdminZodSchema = z.object({
    newPassword: z
        .string({
            message: "New password is required.",
        })
        .min(6, "New password must be at least 6 characters."),
});

const updateUserByAdminZodSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters.").optional(),
    phone: z.string().optional(),
    role: z.enum(["ADMIN", "USER"]).optional(),
    isEmailVerified: z.boolean().optional(),
    isActive: z.boolean().optional(),
    language: z.string().optional(),
});

export const userValidations = {
    updateUserStatusZodSchema,
    changeUserPasswordByAdminZodSchema,
    updateUserByAdminZodSchema,
};

