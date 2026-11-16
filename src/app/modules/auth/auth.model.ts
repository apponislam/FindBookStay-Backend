import mongoose, { Schema } from "mongoose";
import crypto from "crypto";
import { User } from "./auth.interface";

const addressSchemaDefinition = {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String,
    location: {
        type: {
            type: String,
            enum: ["Point"],
        },
        coordinates: {
            type: [Number], // [longitude, latitude]
        },
    },
};

const userSchemaDefinition: any = {
    name: {
        type: String,
        required: [true, "Please provide your full name."],
        trim: true,
    },

    email: {
        type: String,
        required: [true, "Please provide your email address."],
        lowercase: true,
        trim: true,
        match: [/.+\@.+\..+/, "Please enter a valid email address (e.g., name@example.com)."],
    },

    password: {
        type: String,
        required: [true, "Please enter a secure password."],
    },

    role: {
        type: String,
        enum: {
            values: ["ADMIN", "USER"],
            message: "Invalid account role '{VALUE}'. Role must be USER or ADMIN.",
        },
        default: "USER",
        required: true,
    },

    phone: {
        type: String,
    },

    profileImage: {
        type: String,
    },

    language: {
        type: String,
    },

    presentAddress: addressSchemaDefinition,
    permanentAddress: addressSchemaDefinition,

    liveLocation: {
        type: {
            type: String,
            enum: ["Point"],
        },
        coordinates: {
            type: [Number], // [longitude, latitude]
        },
        updatedAt: {
            type: Date,
        },
        heading: Number,
        speed: Number,
    },

    referralCode: {
        type: String,
        trim: true,
        uppercase: true,
    },

    referredBy: {
        type: Schema.Types.ObjectId,
        ref: "User",
        default: null,
    },

    isWrongReferral: {
        type: Boolean,
        default: false,
    },

    wrongReferralCode: {
        type: String,
        trim: true,
        default: null,
    },

    fcmTokens: {
        type: [String],
        default: [],
    },

    hasHome: {
        type: Boolean,
        default: false,
    },

    hasStay: {
        type: Boolean,
        default: false,
    },

    hasTurf: {
        type: Boolean,
        default: false,
    },

    hasProperty: {
        type: Boolean,
        default: false,
    },

    isActive: {
        type: Boolean,
        default: true,
    },

    isEmailVerified: {
        type: Boolean,
        default: false,
    },

    isDeleted: {
        type: Boolean,
        default: false,
    },

    lastLogin: {
        type: Date,
    },
};

const UserSchema = new Schema<User>(userSchemaDefinition, {
    timestamps: true,
    versionKey: false,

    toJSON: {
        transform(doc, ret: Partial<User>) {
            delete ret.password;
            return ret;
        },
    },
});

// Generate unique random referral code before save and verify no duplicates exist
UserSchema.pre("save", async function () {
    if (!this.referralCode) {
        const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        let isUnique = false;
        let code = "";

        while (!isUnique) {
            code = "";
            for (let i = 0; i < 8; i++) {
                code += chars.charAt(crypto.randomInt(0, chars.length));
            }

            const existing = await mongoose.models.User?.findOne({ referralCode: code });
            if (!existing) {
                isUnique = true;
            }
        }

        this.referralCode = code;
    }
});

// Authentication lookup (optimized for isDeleted filtering)
UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index({ email: 1, isDeleted: 1 });
UserSchema.index({ name: 1, isDeleted: 1 });
UserSchema.index({ role: 1, isDeleted: 1 });
UserSchema.index({ isActive: 1, isDeleted: 1 });
UserSchema.index({ isEmailVerified: 1, isDeleted: 1 });
UserSchema.index({ "presentAddress.location": "2dsphere" });
UserSchema.index({ "permanentAddress.location": "2dsphere" });
UserSchema.index({ liveLocation: "2dsphere" }, { sparse: true });

// Referral indexes
UserSchema.index({ referralCode: 1 }, { unique: true, sparse: true });
UserSchema.index({ referredBy: 1 });
UserSchema.index({ isWrongReferral: 1 });

// Activity tracking optimization
UserSchema.index({ lastLogin: -1 });

export const UserModel = mongoose.model<User>("User", UserSchema);
