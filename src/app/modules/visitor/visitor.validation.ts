import { z } from "zod";

const trackVisitorZodSchema = z.object({
    visitorId: z.string().max(128).optional(),
    currentPath: z.string().max(500).optional().default("/"),
    referrer: z.string().max(500).optional().default("direct"),
    country: z.string().max(100).optional(),
    city: z.string().max(100).optional(),
    region: z.string().max(100).optional(),
    metadata: z.record(z.string(), z.any()).optional(),
});

export const visitorValidations = {
    trackVisitorZodSchema,
};
