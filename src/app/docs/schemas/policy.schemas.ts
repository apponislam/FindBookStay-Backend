export const policySchemas = {
    PolicyType: {
        type: "string",
        enum: ["TERMS_AND_CONDITIONS", "PRIVACY_POLICY", "ABOUT_US", "REFUND_POLICY", "CANCELLATION_POLICY", "COMMUNITY_GUIDELINES"],
        example: "TERMS_AND_CONDITIONS",
    },
    PolicyItem: {
        type: "object",
        properties: {
            _id: { type: "string", example: "673752e50ad7df43fbe02988" },
            type: { $ref: "#/components/schemas/PolicyType" },
            title: { type: "string", example: "Terms and Conditions of Service" },
            content: { type: "string", example: "Welcome to FindBookStay. By using our platform..." },
            slug: { type: "string", example: "terms-and-conditions" },
            version: { type: "string", example: "1.0.0" },
            isActive: { type: "boolean", example: true },
            lastUpdatedBy: { type: "string", nullable: true, example: "673752e50ad7df43fbe02951" },
            effectiveDate: { type: "string", format: "date-time" },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
        },
    },
    CreateOrUpdatePolicyRequest: {
        type: "object",
        required: ["type", "title", "content"],
        properties: {
            type: { $ref: "#/components/schemas/PolicyType" },
            title: { type: "string", example: "Terms & Conditions" },
            content: { type: "string", example: "Full legal content in Markdown or HTML..." },
            version: { type: "string", example: "1.0.0" },
            isActive: { type: "boolean", default: true },
            effectiveDate: { type: "string", format: "date-time" },
        },
    },
    UpdatePolicyRequest: {
        type: "object",
        properties: {
            title: { type: "string", example: "Updated Terms & Conditions" },
            content: { type: "string", example: "Revised policy clauses..." },
            version: { type: "string", example: "1.1.0" },
            isActive: { type: "boolean" },
            effectiveDate: { type: "string", format: "date-time" },
        },
    },
};
