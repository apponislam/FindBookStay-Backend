import axios from "axios";
import config from "../app/config";

export interface IReverseGeocodeResult {
    exactAddress: string; // Full formatted address (e.g. "House 42, Road 11, Banani, Dhaka 1213, Bangladesh")
    addressName: string; // Specific location / street / premise name
    area: string; // Neighborhood / sublocality (e.g. "Banani")
    city: string; // Locality / city (e.g. "Dhaka")
    state: string; // Administrative area (e.g. "Dhaka Division")
    country: string; // Country name (e.g. "Bangladesh")
    zipCode: string; // Postal code (e.g. "1213")
    latitude: number;
    longitude: number;
    placeId?: string;
    source: "GOOGLE_MAPS" | "OSM_FALLBACK";
    raw?: any;
}

const getGoogleComponent = (components: any[], types: string[]): string => {
    if (!Array.isArray(components)) return "";
    const match = components.find((comp) => types.some((type) => comp.types?.includes(type)));
    return match ? match.long_name || match.short_name || "" : "";
};

/**
 * Reverse Geocode: Takes latitude & longitude and returns the exact address name and structured location components.
 * Primary: Google Maps Geocoding API | Fallback: OpenStreetMap Nominatim
 *
 * @param latitude - Latitude coordinate (-90 to 90)
 * @param longitude - Longitude coordinate (-180 to 180)
 */
export const reverseGeocode = async (
    latitude: number | string,
    longitude: number | string
): Promise<IReverseGeocodeResult> => {
    const lat = typeof latitude === "string" ? parseFloat(latitude) : latitude;
    const lng = typeof longitude === "string" ? parseFloat(longitude) : longitude;

    if (isNaN(lat) || isNaN(lng)) {
        throw new Error(`Invalid coordinates: lat=${latitude}, lng=${longitude}`);
    }

    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        throw new Error(`Coordinates out of bounds: lat must be -90..90, lng must be -180..180.`);
    }

    const apiKey = config.maps_api_key;

    // 1. Google Maps Reverse Geocoding
    if (apiKey) {
        try {
            const googleUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`;
            const response = await axios.get(googleUrl, { timeout: 8000 });
            const data = response.data;

            if (data.status === "OK" && Array.isArray(data.results) && data.results.length > 0) {
                const first = data.results[0];
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
                    exactAddress: first.formatted_address,
                    addressName,
                    area,
                    city,
                    state,
                    country,
                    zipCode,
                    latitude: lat,
                    longitude: lng,
                    placeId: first.place_id,
                    source: "GOOGLE_MAPS",
                    raw: first,
                };
            }
        } catch (error: any) {
            console.error(`⚠️ [Google Maps Reverse Geocoding Error]: ${error.message}. Trying OSM fallback...`);
        }
    }

    // 2. OpenStreetMap Nominatim Fallback
    try {
        const osmUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`;
        const response = await axios.get(osmUrl, {
            headers: { "User-Agent": "FindBookStay-Backend/1.0" },
            timeout: 8000,
        });

        const data = response.data;
        if (data && data.address) {
            const addr = data.address;
            const area = addr.suburb || addr.neighbourhood || addr.residential || addr.subdistrict || "";
            const city = addr.city || addr.town || addr.municipality || addr.state_district || "";
            const state = addr.state || "";
            const country = addr.country || "";
            const zipCode = addr.postcode || "";

            const road = addr.road || addr.pedestrian || addr.footway || "";
            const houseNumber = addr.house_number || addr.building || "";
            const addressName = houseNumber && road ? `${houseNumber} ${road}` : road || area || city || "Unknown Location";

            return {
                exactAddress: data.display_name || addressName,
                addressName,
                area,
                city,
                state,
                country,
                zipCode,
                latitude: lat,
                longitude: lng,
                placeId: data.place_id ? String(data.place_id) : undefined,
                source: "OSM_FALLBACK",
                raw: data,
            };
        }
    } catch (osmError: any) {
        console.error(`❌ [OSM Reverse Geocoding Error]: ${osmError.message}`);
    }

    return {
        exactAddress: `Coordinates: ${lat.toFixed(5)}, ${lng.toFixed(5)}`,
        addressName: `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
        area: "",
        city: "",
        state: "",
        country: "",
        zipCode: "",
        latitude: lat,
        longitude: lng,
        source: "GOOGLE_MAPS",
    };
};

export default reverseGeocode;

