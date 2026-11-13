import mongoose, { Schema } from "mongoose";
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
            default: "Point",
        },
        coordinates: {
            type: [Number], // [longitude, latitude]
        },
    },
};

const userSchemaDefinition: any = {
    name: {
        type: String,
        required: [true, "Name is required"],
        trim: true,
    },

    email: {
        type: String,
        required: [true, "Email is required"],
        lowercase: true,
        trim: true,
        match: [/.+\@.+\..+/, "Please enter a valid email address"],
    },

    password: {
        type: String,
        required: [true, "Password is required"],
    },

    role: {
        type: String,
        enum: ["ADMIN", "USER"],
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

// Authentication lookup (optimized for isDeleted filtering)
UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index({ email: 1, isDeleted: 1 });
UserSchema.index({ name: 1, isDeleted: 1 });
UserSchema.index({ role: 1, isDeleted: 1 });
UserSchema.index({ isActive: 1, isDeleted: 1 });
UserSchema.index({ isEmailVerified: 1, isDeleted: 1 });
UserSchema.index({ "presentAddress.location": "2dsphere" });
UserSchema.index({ "permanentAddress.location": "2dsphere" });

// Activity tracking optimization
UserSchema.index({ lastLogin: -1 });

export const UserModel = mongoose.model<User>("User", UserSchema);
