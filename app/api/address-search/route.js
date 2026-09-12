import { NextResponse } from "next/server";

/**
 * Normalizes a Geoapify feature into the unified VÉRANE address DTO.
 */
function normalizeGeoapifyFeature(feature, index) {
  const prop = feature?.properties || {};
  const coords = feature?.geometry?.coordinates || [];

  const lon = typeof prop.lon === "number" ? prop.lon : (typeof coords[0] === "number" ? coords[0] : null);
  const lat = typeof prop.lat === "number" ? prop.lat : (typeof coords[1] === "number" ? coords[1] : null);

  const houseNumber = prop.housenumber || "";
  const street = prop.street || prop.name || "";

  let addressLine1 = prop.address_line1 || "";
  if (!addressLine1) {
    if (houseNumber && street) {
      addressLine1 = `${houseNumber} ${street}`;
    } else if (street) {
      addressLine1 = street;
    }
  }

  const district = prop.suburb || prop.district || prop.quarter || prop.neighbourhood || "";
  const city = prop.city || prop.county || prop.municipality || "";
  const state = prop.state || "";
  const country = prop.country || "Nigeria";
  const countryCode = (prop.country_code || "ng").toLowerCase();
  const postcode = prop.postcode || "";

  let addressLine2 = prop.address_line2 || "";
  if (!addressLine2) {
    addressLine2 = [district, city, state, country].filter(Boolean).join(", ");
  }

  let formattedAddress = prop.formatted || "";
  if (!formattedAddress) {
    formattedAddress = [addressLine1, district, city, state, country].filter(Boolean).join(", ");
  }

  const id = `geoapify-${prop.place_id || index}`;

  return {
    id,
    provider: "geoapify",
    formattedAddress,
    addressLine1,
    addressLine2,
    houseNumber,
    street,
    district,
    city,
    state,
    postcode,
    country,
    countryCode,
    latitude: lat,
    longitude: lon,
  };
}

/**
 * Normalizes a Lokate address item into the unified VÉRANE address DTO.
 */
function normalizeLokateItem(item, index) {
  const houseNumber = item.houseNumber || item.housenumber || item.house_number || "";
  const street = item.street || item.street_name || item.name || "";
  const district = item.district || item.area || item.suburb || item.locality || item.lga || "";
  const city = item.city || item.town || item.lga || "";
  const state = item.state || "";
  const country = item.country || "Nigeria";
  const countryCode = (item.countryCode || item.country_code || "ng").toLowerCase();
  const postcode = item.postcode || item.postalCode || item.postal_code || "";

  let addressLine1 = item.addressLine1 || item.address_line1 || "";
  if (!addressLine1) {
    addressLine1 = houseNumber && street ? `${houseNumber} ${street}` : street;
  }

  let addressLine2 = item.addressLine2 || item.address_line2 || "";
  if (!addressLine2) {
    addressLine2 = [district, city, state, country].filter(Boolean).join(", ");
  }

  let formattedAddress = item.formattedAddress || item.formatted || item.address || item.full_address || "";
  if (!formattedAddress) {
    formattedAddress = [addressLine1, district, city, state, country].filter(Boolean).join(", ");
  }

  const lat = typeof item.latitude === "number" ? item.latitude : (typeof item.lat === "number" ? item.lat : null);
  const lon = typeof item.longitude === "number" ? item.longitude : (typeof item.lon === "number" ? item.lon : (typeof item.lng === "number" ? item.lng : null));

  return {
    id: `lokate-${item.id || item.place_id || index}`,
    provider: "lokate",
    formattedAddress,
    addressLine1,
    addressLine2,
    houseNumber,
    street,
    district,
    city,
    state,
    postcode,
    country,
    countryCode,
    latitude: lat,
    longitude: lon,
  };
}

/**
 * Query Geoapify Address Autocomplete API (Tier 1).
 * Hard restricted to Nigeria using filter=countrycode:ng.
 */
async function queryGeoapify(query) {
  const apiKey = process.env.GEOAPIFY_API_KEY ? process.env.GEOAPIFY_API_KEY.trim() : "";
  if (!apiKey) return null;

  const url = new URL("https://api.geoapify.com/v1/geocode/autocomplete");
  url.searchParams.set("text", query);
  url.searchParams.set("filter", "countrycode:ng");
  url.searchParams.set("apiKey", apiKey);
  url.searchParams.set("limit", "8");
  url.searchParams.set("lang", "en");

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(url.toString(), {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    }).finally(() => clearTimeout(timeoutId));

    if (!response.ok) {
      console.warn(`Geoapify autocomplete returned HTTP status ${response.status}`);
      return null;
    }

    const data = await response.json();
    const features = Array.isArray(data?.features) ? data.features : [];

    const results = features
      .map((feat, idx) => normalizeGeoapifyFeature(feat, idx))
      .filter((item) => item.formattedAddress && item.formattedAddress.length > 5);

    return results.length > 0 ? results : null;
  } catch (err) {
    if (err.name === "AbortError") {
      console.warn("Geoapify API request timed out (5000ms)");
    } else {
      console.error("Geoapify API error:", err);
    }
    return null;
  }
}

/**
 * Query Lokate Nigeria Address Search API (Tier 2 Fallback).
 */
async function queryLokate(query) {
  const apiKey = process.env.LOKATE_API_KEY ? process.env.LOKATE_API_KEY.trim() : "";
  if (!apiKey) return null;

  const endpoints = [
    "https://api.uselokate.com/v1/autocomplete",
    "https://api.uselokate.com/v1/addresses/search",
    "https://www.uselokate.com/api/v1/search",
  ];

  for (const ep of endpoints) {
    try {
      const url = new URL(ep);
      url.searchParams.set("q", query);
      url.searchParams.set("query", query);
      url.searchParams.set("country", "NG");

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const response = await fetch(url.toString(), {
        signal: controller.signal,
        headers: {
          Accept: "application/json",
          "x-api-key": apiKey,
          Authorization: `Bearer ${apiKey}`,
        },
      }).finally(() => clearTimeout(timeoutId));

      if (response.ok) {
        const data = await response.json();
        const items = Array.isArray(data?.data) ? data.data : (Array.isArray(data?.results) ? data.results : (Array.isArray(data) ? data : []));

        const results = items
          .map((it, idx) => normalizeLokateItem(it, idx))
          .filter((item) => item.formattedAddress && item.formattedAddress.length > 5);

        if (results.length > 0) {
          return results;
        }
      }
    } catch {
      // Try next endpoint if any
    }
  }

  return null;
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = (searchParams.get("q") || searchParams.get("query") || "").trim();

    // HARD REQUIREMENT: minimum 5 meaningful characters before searching
    if (!query || query.length < 5) {
      return NextResponse.json({ success: true, results: [] });
    }

    // TIER 1: Geoapify Nigeria-only
    let results = await queryGeoapify(query);

    // TIER 2: Lokate Fallback if Geoapify returned zero usable results
    if (!results || results.length === 0) {
      results = await queryLokate(query);
    }

    return NextResponse.json({
      success: true,
      results: results || [],
    });
  } catch (error) {
    console.error("VÉRANE Address search API server exception:", error);

    return NextResponse.json({
      success: true,
      results: [],
    });
  }
}
