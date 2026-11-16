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
