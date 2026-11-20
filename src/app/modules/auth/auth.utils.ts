import { Address } from "./auth.interface";
import { geocode } from "../../../utils/geocode";
import crypto from "crypto";
import axios from "axios";
import config from "../../config";

export const buildAddressString = (addr?: Partial<Address>): string => {
    if (!addr) return "";
    return [addr.street, addr.city, addr.state, addr.zipCode, addr.country]
        .filter((part): part is string => typeof part === "string" && part.trim().length > 0)
        .join(", ")
        .trim();
};

export const areAddressesEqual = (addr1?: Partial<Address>, addr2?: Partial<Address>): boolean => {
    if (!addr1 || !addr2) return false;
    const str1 = buildAddressString(addr1).toLowerCase();
    const str2 = buildAddressString(addr2).toLowerCase();
    return str1.length > 0 && str1 === str2;
};

export const hasValidCoordinates = (addr?: Address): boolean => {
    return Boolean(
        addr?.location?.coordinates &&
        Array.isArray(addr.location.coordinates) &&
        addr.location.coordinates.length === 2 &&
        typeof addr.location.coordinates[0] === "number" &&
        typeof addr.location.coordinates[1] === "number" &&
        !isNaN(addr.location.coordinates[0]) &&
        !isNaN(addr.location.coordinates[1])
    );
};

/**
 * Resolves coordinates for user addresses:
 * - If presentAddress and permanentAddress are the same (or sameAsPresent === true),
 *   it calls geocode ONCE and shares the coordinates between both.
 * - If addresses are different, it resolves coordinates independently.
 * - If coordinates already exist, skips geocoding.
 * - Cleans up invalid/missing location fields so MongoDB 2dsphere index doesn't throw.
 */
export const resolveUserAddresses = async (
    presentAddress?: Address,
    permanentAddress?: Address,
    sameAsPresent?: boolean
): Promise<{ presentAddress?: Address; permanentAddress?: Address }> => {
    let resolvedPresent: Address | undefined = presentAddress ? { ...presentAddress } : undefined;
    let resolvedPermanent: Address | undefined = permanentAddress ? { ...permanentAddress } : undefined;

    if (sameAsPresent && resolvedPresent) {
        resolvedPermanent = { ...resolvedPresent };
    }

    const isSame =
        Boolean(sameAsPresent && resolvedPresent) ||
        areAddressesEqual(resolvedPresent, resolvedPermanent);

    const presentHasCoords = hasValidCoordinates(resolvedPresent);
    const permHasCoords = hasValidCoordinates(resolvedPermanent);

    if (isSame && resolvedPresent) {
        // Both addresses are the same: geocode only ONCE and copy coordinates
        if (presentHasCoords) {
            if (resolvedPermanent) {
                resolvedPermanent.location = { ...resolvedPresent.location! };
            }
        } else if (permHasCoords && resolvedPermanent) {
            resolvedPresent.location = { ...resolvedPermanent.location! };
        } else {
            const query = buildAddressString(resolvedPresent);
            if (query) {
                try {
                    const geo = await geocode(query);
                    if (geo && typeof geo.latitude === "number" && typeof geo.longitude === "number") {
                        const locObj = {
                            type: "Point" as const,
                            coordinates: [geo.longitude, geo.latitude] as [number, number],
                        };
                        resolvedPresent.location = locObj;
                        if (resolvedPermanent) {
                            resolvedPermanent.location = { ...locObj };
                        }
                    }
                } catch (err: any) {
                    console.warn(`⚠️ [Address Geocode Failed for "${query}"]: ${err.message}`);
                }
            }
        }
    } else {
        // Different addresses: geocode independently if coordinates missing
        if (resolvedPresent && !presentHasCoords) {
            const query = buildAddressString(resolvedPresent);
            if (query) {
                try {
                    const geo = await geocode(query);
                    if (geo && typeof geo.latitude === "number" && typeof geo.longitude === "number") {
                        resolvedPresent.location = {
                            type: "Point" as const,
                            coordinates: [geo.longitude, geo.latitude] as [number, number],
                        };
                    }
                } catch (err: any) {
                    console.warn(`⚠️ [Present Address Geocode Failed for "${query}"]: ${err.message}`);
                }
            }
        }

        if (resolvedPermanent && !permHasCoords) {
            const query = buildAddressString(resolvedPermanent);
            if (query) {
                try {
                    const geo = await geocode(query);
                    if (geo && typeof geo.latitude === "number" && typeof geo.longitude === "number") {
                        resolvedPermanent.location = {
                            type: "Point" as const,
                            coordinates: [geo.longitude, geo.latitude] as [number, number],
                        };
                    }
                } catch (err: any) {
                    console.warn(`⚠️ [Permanent Address Geocode Failed for "${query}"]: ${err.message}`);
                }
            }
        }
    }

    // Clean up empty or invalid locations so MongoDB 2dsphere index doesn't throw
    if (resolvedPresent && !hasValidCoordinates(resolvedPresent)) {
        delete resolvedPresent.location;
    }
    if (resolvedPermanent && !hasValidCoordinates(resolvedPermanent)) {
        delete resolvedPermanent.location;
    }

    return {
        presentAddress: resolvedPresent,
        permanentAddress: resolvedPermanent,
    };
};

/**
 * 1. Cloudflare Turnstile / Bot Verification
 */
export const verifyTurnstileToken = async (token?: string, clientIp?: string): Promise<boolean> => {
    const secretKey = (config as any).turnstile_secret_key || process.env.TURNSTILE_SECRET_KEY;
    if (!secretKey) {
        // In local/dev environments without Turnstile configured, bypass safely
        return true;
    }

    if (!token) {
        return false;
    }

    try {
        const formData = new URLSearchParams();
        formData.append("secret", secretKey);
        formData.append("response", token);
        if (clientIp) {
            formData.append("remoteip", clientIp);
        }

        const response = await axios.post("https://challenges.cloudflare.com/turnstile/v0/siteverify", formData.toString(), {
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            timeout: 5000,
        });

        return Boolean(response.data?.success);
    } catch (err: any) {
        console.error("❌ [Turnstile Verification Error]:", err?.message || err);
        return false;
    }
};

/**
 * 2. Generate or resolve deterministic device fingerprint identifier
 */
export const resolveDeviceIdentifier = (
    clientDeviceId?: string,
    userAgent?: string,
    clientIp?: string
): string => {
    if (clientDeviceId && clientDeviceId.trim().length > 3) {
        return clientDeviceId.trim();
    }
    const rawSignature = `${userAgent || "unknown-ua"}|${clientIp || "unknown-ip"}`;
    return crypto.createHash("sha256").update(rawSignature).digest("hex").slice(0, 32);
};

/**
 * 3. Normalize image paths to relative web-accessible URLs (/uploads/...)
 * Strips local absolute filesystem paths (e.g. E:\... or C:\...) and converts Windows backslashes.
 */
export const normalizeImagePath = (img?: string): string | undefined => {
    if (!img || typeof img !== "string") return undefined;
    const normalized = img.replace(/\\/g, "/");
    const uploadsIndex = normalized.indexOf("/uploads/");
    if (uploadsIndex !== -1) {
        return normalized.slice(uploadsIndex);
    }
    if (normalized.startsWith("uploads/")) {
        return `/${normalized}`;
    }
    return normalized;
};


