export const addressSchemas = {
    AddressType: {
        type: "string",
        enum: ["COUNTRY", "STATE", "CITY", "AREA", "ZONE"],
        example: "CITY",
    },
    AddressItem: {
        type: "object",
        properties: {
            _id: { type: "string", example: "673752e50ad7df43fbe02951" },
            addressType: { $ref: "#/components/schemas/AddressType" },
            address: { type: "string", example: "Dhaka" },
            upperLevelAddress: {
                type: "string",
                nullable: true,
                example: "673752e50ad7df43fbe02950",
                description: "Parent address ObjectId in the administrative hierarchy (null for COUNTRY)",
            },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
        },
    },
    CreateAddressRequest: {
        type: "object",
        required: ["addressType", "address"],
        properties: {
            addressType: { $ref: "#/components/schemas/AddressType" },
            address: { type: "string", example: "Banani" },
            upperLevelAddress: {
                type: "string",
                nullable: true,
                example: "673752e50ad7df43fbe02951",
                description: "ObjectId of the upper level address (e.g. City ID for an Area)",
            },
        },
    },
    UpdateAddressRequest: {
        type: "object",
        properties: {
            addressType: { $ref: "#/components/schemas/AddressType" },
            address: { type: "string", example: "Gulshan-1" },
            upperLevelAddress: {
                type: "string",
                nullable: true,
                example: "673752e50ad7df43fbe02951",
            },
        },
    },
    AddressTreeNode: {
        type: "object",
        properties: {
            _id: { type: "string", example: "673752e50ad7df43fbe02950" },
            addressType: { $ref: "#/components/schemas/AddressType" },
            address: { type: "string", example: "Bangladesh" },
            children: {
                type: "array",
                items: { $ref: "#/components/schemas/AddressTreeNode" },
                description: "Recursive nested array of child administrative levels",
            },
        },
    },
    AddressParentsLineage: {
        type: "object",
        properties: {
            current: { $ref: "#/components/schemas/AddressItem" },
            lineage: {
                type: "array",
                items: { $ref: "#/components/schemas/AddressItem" },
                description: "Upstream breadcrumb ancestry from direct parent up to root Country",
            },
        },
    },
};

