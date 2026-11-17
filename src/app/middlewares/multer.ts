import multer from "multer";
import path from "path";
import fs from "fs";
import sharp from "sharp";
import { Request, Response, NextFunction } from "express";
import ApiError from "../../errors/ApiError";
import httpStatus from "http-status";

// Base upload directory at project root
export const UPLOAD_ROOT = path.join(process.cwd(), "uploads");

/**
 * Ensure directory exists synchronously
 */
export const ensureDirectoryExists = (dirPath: string): void => {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
};

/**
 * Image Optimization Options
 */
export interface ImageOptimizationOptions {
    maxWidth?: number;
    maxHeight?: number;
    quality?: number;
    format?: "webp" | "jpeg" | "png";
}

/**
 * Optimize an image buffer with Sharp (auto-rotate, resize, format, compress)
 */
export const optimizeBuffer = async (
    buffer: Buffer,
    subDir: string = "profile",
    options?: ImageOptimizationOptions
): Promise<{ filename: string; relativePath: string; fullPath: string; size: number }> => {
    const { maxWidth = 1000, maxHeight = 1000, quality = 80, format = "webp" } = options || {};
    const targetDir = path.join(UPLOAD_ROOT, subDir);
    ensureDirectoryExists(targetDir);

    const filename = `${subDir}-${Date.now()}-${Math.round(Math.random() * 1e9)}.${format}`;
    const fullPath = path.join(targetDir, filename);

    let pipeline = sharp(buffer)
        .rotate() // Automatically correct orientation based on EXIF metadata
        .resize({
            width: maxWidth,
            height: maxHeight,
            fit: "inside",
            withoutEnlargement: true,
        });

    if (format === "webp") {
        pipeline = pipeline.webp({ quality });
    } else if (format === "jpeg") {
        pipeline = pipeline.jpeg({ quality, mozjpeg: true });
    } else if (format === "png") {
        pipeline = pipeline.png({ quality, compressionLevel: 8 });
    }

    const info = await pipeline.toFile(fullPath);

    return {
        filename,
        relativePath: `/uploads/${subDir}/${filename}`,
        fullPath,
        size: info.size,
    };
};

/**
 * Optimize and save Base64 data URI string with Sharp to uploads/<subDir>
 * Returns relative public path: /uploads/<subDir>/filename.webp
 */
export const processBase64Image = async (
    rawImage: string | undefined,
    subDir: string = "profile",
    options?: ImageOptimizationOptions
): Promise<string | undefined> => {
    if (!rawImage || typeof rawImage !== "string") return rawImage;

    // Return as-is if already a valid URL or path
    if (rawImage.startsWith("/uploads/") || rawImage.startsWith("http://") || rawImage.startsWith("https://")) {
        return rawImage;
    }

    // Match data:image/<type>;base64,<data>
    const matches = rawImage.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
    if (!matches) {
        return rawImage;
    }

    try {
        const base64Data = matches[2];
        const buffer = Buffer.from(base64Data, "base64");

        const optimized = await optimizeBuffer(buffer, subDir, options);
        console.log(`⚡ [Sharp Optimized Base64]: ${optimized.relativePath} (${(optimized.size / 1024).toFixed(1)} KB)`);
        return optimized.relativePath;
    } catch (error) {
        console.error("❌ [Sharp Base64 Error] Failed to optimize base64 image:", error);
        return rawImage;
    }
};

/**
 * Allowed Image MIME Types
 */
const ALLOWED_IMAGE_MIME_TYPES = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/gif",
];

/**
 * File filter for images
 */
const imageFileFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    if (ALLOWED_IMAGE_MIME_TYPES.includes(file.mimetype.toLowerCase())) {
        cb(null, true);
    } else {
        cb(new ApiError(httpStatus.BAD_REQUEST, "Only image files (.jpg, .jpeg, .png, .webp, .gif) are allowed!"));
    }
};

/**
 * Create a Multer instance with memory storage (ideal for Sharp processing)
 */
export const createMulterMemoryUpload = (maxFileSizeMb: number = 10) => {
    return multer({
        storage: multer.memoryStorage(),
        fileFilter: imageFileFilter,
        limits: {
            fileSize: maxFileSizeMb * 1024 * 1024,
        },
    });
};

// Preset memory uploader
export const uploadMemory = createMulterMemoryUpload(10);

/**
 * All-in-one Profile Image Upload & Form-Data Sanitizer Middleware
 * 1. Accepts multipart/form-data with file fields: "profileImage", "image", or "file"
 * 2. Optimizes uploaded image with Sharp to modern WebP format
 * 3. If no file uploaded, checks for base64 string in req.body.profileImage and optimizes it with Sharp
 * 4. Parses stringified JSON fields (like 'data', 'presentAddress', 'permanentAddress')
 * 5. Sets req.body.profileImage to clean public URL (/uploads/profile/...)
 */
export const uploadProfileImage = (req: Request, res: Response, next: NextFunction): void => {
    const upload = uploadMemory.fields([
        { name: "profileImage", maxCount: 1 },
        { name: "image", maxCount: 1 },
        { name: "file", maxCount: 1 },
    ]);

    upload(req, res, async (err: any) => {
        if (err) {
            return next(err);
        }

        // 1. Parse stringified JSON fields if present in multipart/form-data
        if (req.body) {
            if (typeof req.body.data === "string") {
                try {
                    const parsed = JSON.parse(req.body.data);
                    req.body = { ...parsed, ...req.body };
                } catch {}
            }
            if (typeof req.body.presentAddress === "string") {
                try {
                    req.body.presentAddress = JSON.parse(req.body.presentAddress);
                } catch {}
            }
            if (typeof req.body.permanentAddress === "string") {
                try {
                    req.body.permanentAddress = JSON.parse(req.body.permanentAddress);
                } catch {}
            }
        }

        // 2. Process binary file if uploaded
        const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
        const file = files?.["profileImage"]?.[0] || files?.["image"]?.[0] || files?.["file"]?.[0];

        if (file && file.buffer) {
            try {
                const optimized = await optimizeBuffer(file.buffer, "profile", {
                    maxWidth: 1000,
                    maxHeight: 1000,
                    quality: 80,
                    format: "webp",
                });

                req.file = {
                    ...file,
                    filename: optimized.filename,
                    path: optimized.fullPath,
                    destination: path.join(UPLOAD_ROOT, "profile"),
                };
                req.body.profileImage = optimized.relativePath;

                console.log(`⚡ [Sharp Optimized Multer File]: ${optimized.relativePath} (${(optimized.size / 1024).toFixed(1)} KB)`);
            } catch (sharpError) {
                console.error("❌ [Sharp Optimization Error]:", sharpError);
                return next(new ApiError(httpStatus.BAD_REQUEST, "Failed to process and optimize uploaded image."));
            }
        } else if (req.body && req.body.profileImage && typeof req.body.profileImage === "string") {
            // 3. Process base64 string if sent in JSON
            try {
                req.body.profileImage = await processBase64Image(req.body.profileImage, "profile");
            } catch (sharpError) {
                console.error("❌ [Sharp Base64 Error]:", sharpError);
            }
        }

        next();
    });
};

/**
 * Listing Images Upload & Form-Data Sanitizer Middleware
 * 1. Accepts multipart/form-data with fields:
 *    - "featuredImage": single cover photo
 *    - "images": up to 15 gallery photos
 * 2. Optimizes uploaded files with Sharp into /uploads/listings/ in modern WebP format
 * 3. Handles base64 data URIs in JSON if files are passed as strings
 * 4. Parses nested JSON strings in multipart form-data (e.g. 'location', 'homeDetails', etc.)
 */
export const uploadListingImages = (req: Request, res: Response, next: NextFunction): void => {
    const upload = uploadMemory.fields([
        { name: "featuredImage", maxCount: 1 },
        { name: "images", maxCount: 15 },
        { name: "image", maxCount: 1 },
    ]);

    upload(req, res, async (err: any) => {
        if (err) {
            return next(err);
        }

        // 1. Parse stringified JSON fields in multipart/form-data
        if (req.body) {
            if (typeof req.body.data === "string") {
                try {
                    const parsed = JSON.parse(req.body.data);
                    req.body = { ...parsed, ...req.body };
                } catch {}
            }

            const jsonFields = [
                "location",
                "highlights",
                "amenities",
                "rules",
                "nearbyPlaces",
                "bookingRules",
                "minimumBookingDuration",
                "maximumBookingDuration",
                "homeDetails",
                "stayDetails",
                "turfDetails",
                "propertyDetails",
                "images",
            ];

            for (const field of jsonFields) {
                if (typeof req.body[field] === "string") {
                    try {
                        req.body[field] = JSON.parse(req.body[field]);
                    } catch {
                        // If it's comma-separated list like amenities="Wifi,AC,Pool", split it
                        if (["amenities", "rules", "nearbyPlaces"].includes(field) && req.body[field].includes(",")) {
                            req.body[field] = req.body[field].split(",").map((item: string) => item.trim());
                        }
                    }
                }
            }

            // Convert numeric/boolean strings in form-data
            const numericFields = ["price", "originalPrice", "securityDeposit"];
            for (const numField of numericFields) {
                if (req.body[numField] !== undefined && typeof req.body[numField] === "string") {
                    const parsedNum = Number(req.body[numField]);
                    if (!isNaN(parsedNum)) req.body[numField] = parsedNum;
                }
            }

            const booleanFields = ["isNegotiable", "bookingEnabled", "isFeatured", "isVerified"];
            for (const boolField of booleanFields) {
                if (typeof req.body[boolField] === "string") {
                    req.body[boolField] = req.body[boolField] === "true";
                }
            }
        }

        const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
        const uploadedImages: string[] = Array.isArray(req.body.images) ? [...req.body.images] : [];

        // 2. Process Binary Uploads with Sharp
        try {
            // A. Single featured image
            const featuredFile = files?.["featuredImage"]?.[0] || files?.["image"]?.[0];
            if (featuredFile && featuredFile.buffer) {
                const optimized = await optimizeBuffer(featuredFile.buffer, "listings", {
                    maxWidth: 1920,
                    maxHeight: 1200,
                    quality: 80,
                    format: "webp",
                });
                req.body.featuredImage = optimized.relativePath;
                console.log(`⚡ [Sharp Optimized Featured Image]: ${optimized.relativePath} (${(optimized.size / 1024).toFixed(1)} KB)`);
            }

            // B. Multiple gallery images
            const galleryFiles = files?.["images"] || [];
            if (galleryFiles.length > 0) {
                for (const gFile of galleryFiles) {
                    if (gFile && gFile.buffer) {
                        const optimized = await optimizeBuffer(gFile.buffer, "listings", {
                            maxWidth: 1920,
                            maxHeight: 1200,
                            quality: 80,
                            format: "webp",
                        });
                        uploadedImages.push(optimized.relativePath);
                    }
                }
            }
        } catch (sharpError) {
            console.error("❌ [Sharp Listing Images Error]:", sharpError);
            return next(new ApiError(httpStatus.BAD_REQUEST, "Failed to optimize uploaded listing images."));
        }

        // 3. Process Base64 strings if passed in body
        if (req.body.featuredImage && typeof req.body.featuredImage === "string") {
            try {
                req.body.featuredImage = await processBase64Image(req.body.featuredImage, "listings", {
                    maxWidth: 1920,
                    maxHeight: 1200,
                    quality: 80,
                    format: "webp",
                });
            } catch (err) {
                console.error("❌ [Sharp Base64 Featured Image Error]:", err);
            }
        }

        if (Array.isArray(uploadedImages) && uploadedImages.length > 0) {
            const processedList: string[] = [];
            for (const img of uploadedImages) {
                if (typeof img === "string" && img.startsWith("data:image/")) {
                    const optimizedUrl = await processBase64Image(img, "listings", {
                        maxWidth: 1920,
                        maxHeight: 1200,
                        quality: 80,
                        format: "webp",
                    });
                    if (optimizedUrl) processedList.push(optimizedUrl);
                } else if (typeof img === "string") {
                    processedList.push(img);
                }
            }
            req.body.images = processedList;
        } else if (uploadedImages.length > 0) {
            req.body.images = uploadedImages;
        }

        // Default featuredImage to first gallery image if not set
        if (!req.body.featuredImage && Array.isArray(req.body.images) && req.body.images.length > 0) {
            req.body.featuredImage = req.body.images[0];
        }

        next();
    });
};

/**
 * Chat Message Attachments Upload Middleware
 * 1. Accepts up to 5 attachments under field name "attachments", "files", or "images"
 * 2. Optimizes image buffers with Sharp into /uploads/messages/ as modern WebP
 * 3. Handles base64 images if passed in JSON body
 * 4. Injects array of public URLs into req.body.attachments
 */
export const uploadMessageAttachments = (req: Request, res: Response, next: NextFunction): void => {
    const upload = uploadMemory.fields([
        { name: "attachments", maxCount: 5 },
        { name: "files", maxCount: 5 },
        { name: "images", maxCount: 5 },
        { name: "image", maxCount: 1 },
    ]);

    upload(req, res, async (err: any) => {
        if (err) {
            return next(err);
        }

        // Safe JSON parsing for multipart form-data
        if (req.body && typeof req.body.data === "string") {
            try {
                const parsed = JSON.parse(req.body.data);
                req.body = { ...parsed, ...req.body };
            } catch {}
        }

        if (req.body && typeof req.body.location === "string") {
            try {
                req.body.location = JSON.parse(req.body.location);
            } catch {}
        }

        const uploadedList: string[] = [];
        const filesMap = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;

        if (filesMap) {
            const allFiles = [
                ...(filesMap["attachments"] || []),
                ...(filesMap["files"] || []),
                ...(filesMap["images"] || []),
                ...(filesMap["image"] || []),
            ];

            try {
                for (const file of allFiles) {
                    const optimized = await optimizeBuffer(file.buffer, "messages", {
                        maxWidth: 1600,
                        maxHeight: 1600,
                        quality: 80,
                        format: "webp",
                    });
                    uploadedList.push(optimized.relativePath);
                }
            } catch (sharpErr) {
                console.error("❌ [Sharp Message Attachments Error]:", sharpErr);
                return next(new ApiError(httpStatus.BAD_REQUEST, "Failed to optimize uploaded message attachments."));
            }
        }

        if (uploadedList.length > 0) {
            req.body.attachments = uploadedList;
            if (!req.body.messageType || req.body.messageType === "TEXT") {
                req.body.messageType = "IMAGE";
            }
        }

        next();
    });
};

