import axios from "axios";
import config from "../app/config";

export interface IGeocodeResult {
    latitude: number;
    longitude: number;
    exactAddress: string; // Normalized full formatted address
    addressName: string; // Specific location / street / premise name
    area: string; // Neighborhood / area (e.g. "Banani", "Gulshan")
    city: string; // Locality / city (e.g. "Dhaka")
    state: string; // Administrative region (e.g. "Dhaka Division")
    country: string; // Country name (e.g. "Bangladesh")
    zipCode: string; // Postal code (e.g. "1213")
    placeId?: string;
    locationType?: string; // ROOFTOP, RANGE_INTERPOLATED, GEOMETRIC_CENTER, APPROXIMATE
    source: "GOOGLE_MAPS" | "OSM_FALLBACK";
    raw?: any;
}

const getGoogleComponent = (components: any[], types: string[]): string => {
    if (!Array.isArray(components)) return "";
    const match = components.find((comp) => types.some((type) => comp.types?.includes(type)));
    return match ? match.long_name || match.short_name || "" : "";
};

/**
 * Geocode: Takes an address name / query string and returns latitude, longitude, and structured location components.
 * Primary: Google Maps Geocoding API | Fallback: OpenStreetMap Nominatim
 *
 * @param address - Address query string (e.g. "Banani Road 11, Dhaka" or "Gulshan 2, Dhaka")
 */
export const geocode = async (address: string): Promise<IGeocodeResult> => {
    if (!address || typeof address !== "string" || address.trim().length === 0) {
        throw new Error("Address query string cannot be empty.");
    }

    const cleanAddress = address.trim();
    const apiKey = config.maps_api_key;

    // 1. Google Maps Geocoding API
    if (apiKey) {
        try {
            const googleUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
                cleanAddress
            )}&key=${apiKey}`;
            const response = await axios.get(googleUrl, { timeout: 8000 });
            const data = response.data;

            if (data.status === "OK" && Array.isArray(data.results) && data.results.length > 0) {
                const first = data.results[0];
                const location = first.geometry?.location;

                if (location && typeof location.lat === "number" && typeof location.lng === "number") {
                    const components = first.address_components || [];

                    const streetNumber = getGoogleComponent(components, ["street_number"]);
                    const route = getGoogleComponent(components, ["route"]);
                    const premise = getGoogleComponent(components, ["premise", "subpremise"]);
                    const area =
                        getGoogleComponent(components, ["sublocality_level_1", "sublocality", "neighborhood"]) ||
                        getGoogleComponent(components, ["sublocality_level_2"]);
                    const city =
                        getGoogleComponent(components, ["locality"]) ||
                        getGoogleComponent(components, ["administrative_area_level_2"]);
                    const state = getGoogleComponent(components, ["administrative_area_level_1"]);
                    const country = getGoogleComponent(components, ["country"]);
                    const zipCode = getGoogleComponent(components, ["postal_code"]);

                    let addressName = "";
                    if (premise) {
                        addressName = route ? `${premise}, ${route}` : premise;
                    } else if (streetNumber && route) {
                        addressName = `${streetNumber} ${route}`;
                    } else if (route) {
                        addressName = route;
                    } else if (area) {
                        addressName = area;
                    } else {
                        addressName = first.formatted_address.split(",")[0]?.trim() || first.formatted_address;
                    }

                    return {
                        latitude: location.lat,
                        longitude: location.lng,
                        exactAddress: first.formatted_address,
                        addressName,
                        area,
                        city,
                        state,
                        country,
                        zipCode,
                        placeId: first.place_id,
                        locationType: first.geometry?.location_type,
                        source: "GOOGLE_MAPS",
                        raw: first,
                    };
                }
            }
        } catch (error: any) {
            console.error(`⚠️ [Google Maps Geocoding Error]: ${error.message}. Trying OSM fallback...`);
        }
    }

    // 2. OpenStreetMap Nominatim Fallback
    try {
        const osmUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
            cleanAddress
        )}&limit=1&addressdetails=1`;

        const response = await axios.get(osmUrl, {
            headers: { "User-Agent": "FindBookStay-Backend/1.0" },
            timeout: 8000,
        });

        const data = response.data;
        if (Array.isArray(data) && data.length > 0) {
            const first = data[0];
            const lat = parseFloat(first.lat);
            const lng = parseFloat(first.lon);

            if (!isNaN(lat) && !isNaN(lng)) {
                const addr = first.address || {};
                const area = addr.suburb || addr.neighbourhood || addr.residential || addr.subdistrict || "";
                const city = addr.city || addr.town || addr.municipality || addr.state_district || "";
                const state = addr.state || "";
                const country = addr.country || "";
                const zipCode = addr.postcode || "";

                const road = addr.road || addr.pedestrian || addr.footway || "";
                const houseNumber = addr.house_number || addr.building || "";
                const addressName = houseNumber && road ? `${houseNumber} ${road}` : road || area || city || cleanAddress;

                return {
                    latitude: lat,
                    longitude: lng,
                    exactAddress: first.display_name || cleanAddress,
                    addressName,
                    area,
                    city,
                    state,
                    country,
                    zipCode,
                    placeId: first.place_id ? String(first.place_id) : undefined,
                    locationType: first.type,
                    source: "OSM_FALLBACK",
                    raw: first,
                };
            }
        }
    } catch (osmError: any) {
        console.error(`❌ [OSM Geocoding Error]: ${osmError.message}`);
    }

    throw new Error(`Unable to find coordinates for address: "${cleanAddress}". Please check the location name.`);
};

export default geocode;

