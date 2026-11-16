import { Address } from "./auth.interface";
import { geocode } from "../../../utils/geocode";

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

