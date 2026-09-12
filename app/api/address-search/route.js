import { NextResponse } from "next/server";

/**
 * Clean and deduplicate parts of an address into a readable formatted string.
 * e.g., ["12 Admiralty Way", "Lekki Phase 1", "Lagos", "Lagos", "Nigeria"]
 * -> "12 Admiralty Way, Lekki Phase 1, Lagos, Nigeria"
 */
function buildFormattedAddress(parts) {
  const cleaned = parts
    .map((p) => (typeof p === "string" ? p.trim() : ""))
    .filter(Boolean);

  const uniqueParts = [];
  for (const part of cleaned) {
    if (uniqueParts.length === 0) {
      uniqueParts.push(part);
    } else {
      const prev = uniqueParts[uniqueParts.length - 1].toLowerCase();
      const current = part.toLowerCase();
      // Skip adjacent duplicates or substring containment
      if (prev !== current && !prev.includes(current)) {
        uniqueParts.push(part);
      }
    }
  }

  return uniqueParts.join(", ");
}

/**
 * Normalizes a GeoJSON Feature from Photon into a standardized address object.
 */
function normalizePhotonFeature(feature, index) {
  const props = feature?.properties || {};
  const coords = feature?.geometry?.coordinates || [];

  const longitude = typeof coords[0] === "number" ? coords[0] : null;
  const latitude = typeof coords[1] === "number" ? coords[1] : null;

  const housenumber = props.housenumber || "";
  const streetName = props.street || "";
  const placeName = props.name || "";

  let streetLine = "";
  if (housenumber && streetName) {
    streetLine = `${housenumber} ${streetName}`;
  } else if (streetName) {
    streetLine = streetName;
  } else if (placeName) {
    streetLine = placeName;
  }

  if (placeName && streetName && placeName !== streetName && !placeName.includes(streetName)) {
    streetLine = housenumber ? `${placeName}, ${housenumber} ${streetName}` : `${placeName}, ${streetName}`;
  }

  const district = props.district || props.locality || props.suburb || props.neighborhood || "";
  const city = props.city || props.county || props.district || "";
  const state = props.state || "";
  const country = props.country || (props.countrycode === "NG" ? "Nigeria" : "Nigeria");
  const postcode = props.postcode || "";

  const formattedAddress = buildFormattedAddress([
    streetLine,
    district,
    city,
    state,
    country,
  ]);

  const id = `${props.osm_type || "feature"}-${props.osm_id || index}`;

  return {
    id,
    formattedAddress,
    street: streetLine,
    district,
    city,
    state,
    country,
    postcode,
    latitude,
    longitude,
    raw: props,
  };
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = (searchParams.get("q") || searchParams.get("query") || "").trim();
    const targetCountry = (searchParams.get("country") || "Nigeria").trim();

    if (!query || query.length < 3) {
      return NextResponse.json({ success: true, results: [] });
    }

    // Build Photon external request URL
    const photonUrl = new URL("https://photon.komoot.io/api/");
    photonUrl.searchParams.set("q", query);
    photonUrl.searchParams.set("limit", "8");
    photonUrl.searchParams.set("lang", "en");

    // Location bias toward Nigeria (Lagos coordinates: 6.5244, 3.3792)
    if (targetCountry.toLowerCase() === "nigeria" || !targetCountry) {
      photonUrl.searchParams.set("lat", "6.5244");
      photonUrl.searchParams.set("lon", "3.3792");
    }

    // Fetch from Photon API with 5-second timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(photonUrl.toString(), {
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "User-Agent": "VERANE-Atelier-Checkout/1.0",
      },
    }).finally(() => clearTimeout(timeoutId));

    if (!response.ok) {
      console.warn(`Photon address search returned HTTP status ${response.status}`);
      return NextResponse.json({ success: true, results: [] });
    }

    const data = await response.json();
    const features = Array.isArray(data?.features) ? data.features : [];

    const normalizedResults = features
      .map((feat, idx) => normalizePhotonFeature(feat, idx))
      .filter((item) => item.formattedAddress && item.formattedAddress.length > 5);

    // Prioritize Nigerian addresses if present
    normalizedResults.sort((a, b) => {
      const aIsNg = a.country.toLowerCase() === "nigeria" ? 1 : 0;
      const bIsNg = b.country.toLowerCase() === "nigeria" ? 1 : 0;
      return bIsNg - aIsNg;
    });

    return NextResponse.json({
      success: true,
      results: normalizedResults,
    });
  } catch (error) {
    if (error.name === "AbortError") {
      console.warn("Photon address search timed out after 5000ms");
    } else {
      console.error("Address search server error:", error);
    }

    // Return empty results gracefully to ensure checkout form never crashes
    return NextResponse.json({
      success: true,
      results: [],
    });
  }
}
