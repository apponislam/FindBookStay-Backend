import mongoose, { Schema } from "mongoose";
import crypto from "crypto";
import { IVisitor, IVisitorSession } from "./visitor.interface";

const VisitorSessionSchema = new Schema<IVisitorSession>(
    {
        path: {
            type: String,
            required: true,
            trim: true,
        },
        referrer: {
            type: String,
            default: "direct",
            trim: true,
        },
        timestamp: {
            type: Date,
            default: Date.now,
        },
    },
    { _id: false },
);

const VisitorSchema = new Schema<IVisitor>(
    {
        visitorId: {
            type: String,
            unique: true,
            trim: true,
            uppercase: true,
            sparse: true,
        },
        user: {
            type: Schema.Types.ObjectId,
            ref: "User",
            default: null,
            index: true,
        },
        ipAddress: {
            type: String,
            default: null,
            trim: true,
        },
        userAgent: {
            type: String,
            default: null,
            trim: true,
        },
        device: {
            type: String,
            enum: ["Desktop", "Mobile", "Tablet", "Unknown"],
            default: "Desktop",
            index: true,
        },
        browser: {
            type: String,
            default: "Unknown",
            trim: true,
        },
        os: {
            type: String,
            default: "Unknown",
            trim: true,
        },
        country: {
            type: String,
            default: "Unknown",
            trim: true,
        },
        city: {
            type: String,
            default: "Unknown",
            trim: true,
        },
        region: {
            type: String,
            default: "Unknown",
            trim: true,
        },
        currentPath: {
            type: String,
            default: "/",
            trim: true,
        },
        referrer: {
            type: String,
            default: "direct",
            trim: true,
        },
        visitCount: {
            type: Number,
            default: 1,
            min: 1,
        },
        firstVisit: {
            type: Date,
            default: Date.now,
        },
        lastVisit: {
            type: Date,
            default: Date.now,
            index: true,
        },
        recentVisits: {
            type: [VisitorSessionSchema],
            default: [],
        },
        metadata: {
            type: Schema.Types.Mixed,
            default: {},
        },
    },
    {
        timestamps: true,
        versionKey: false,
    },
);

// Generate unique random visitor ID before save if not provided
VisitorSchema.pre("save", async function () {
    if (!this.visitorId) {
        const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        let isUnique = false;
        let code = "";

        while (!isUnique) {
            code = "";
            for (let i = 0; i < 10; i++) {
                code += chars.charAt(crypto.randomInt(0, chars.length));
            }

            const existing = await mongoose.models.Visitor?.findOne({ visitorId: code });
            if (!existing) {
                isUnique = true;
            }
        }

        this.visitorId = code;
    }
});

// Performance & Filtering Indexes
VisitorSchema.index({ visitorId: 1 }, { unique: true });
VisitorSchema.index({ user: 1 });
VisitorSchema.index({ lastVisit: -1 });
VisitorSchema.index({ createdAt: -1 });
VisitorSchema.index({ device: 1 });
VisitorSchema.index({ country: 1 });
VisitorSchema.index({ ipAddress: 1 });
VisitorSchema.index({ currentPath: 1 });

export const VisitorModel = mongoose.model<IVisitor>("Visitor", VisitorSchema);
