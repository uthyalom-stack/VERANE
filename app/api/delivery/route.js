import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { NIGERIA_LOCATIONS, NIGERIAN_STATES } from "@/lib/nigeria-locations";

/*
|--------------------------------------------------------------------------
| Public Delivery Lookup API for Customer Checkout
|--------------------------------------------------------------------------
*/

/**
 * Calculates delivery fees based on country, state, and city, returning available location options.
 * @param {Request} request - The Next.js request object with country, state, and city query parameters.
 * @returns {Promise<NextResponse>} JSON response with delivery fee, pricing mode, and available location options.
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);

    const country = searchParams.get("country") || "Nigeria";
    const state = searchParams.get("state") || "";
    const city = searchParams.get("city") || "";

    let fee = 0;
    let pricingMode = "STATE_DEFAULT";
    let matchedLocationName = "";

    // Options for checkout dropdowns
    let availableCountries = ["Nigeria", "International"];
    let availableStates = [];
    let availableCities = [];

    // Fetch international locations if database is connected
    const intlLocations = await prisma.deliveryLocation.findMany({
      where: { enabled: true, country: { not: "Nigeria" } },
      select: { country: true },
    });

    const customIntlCountries = Array.from(new Set(intlLocations.map((l) => l.country)));
    availableCountries = Array.from(new Set([...availableCountries, ...customIntlCountries]));

    if (country.toLowerCase() === "nigeria") {
      availableStates = NIGERIAN_STATES;

      if (!state) {
        return NextResponse.json({
          success: true,
          fee: 0,
          pricingMode: "STATE_DEFAULT",
          matchedLocationName: "Select State",
          options: {
            countries: availableCountries,
            states: availableStates,
            cities: [],
          },
        });
      }

      // Find exact or case-insensitive state key in NIGERIA_LOCATIONS
      const matchedStateKey = NIGERIAN_STATES.find(
        (s) => s.toLowerCase() === state.trim().toLowerCase()
      );

      if (!matchedStateKey || !NIGERIA_LOCATIONS[matchedStateKey]) {
        return NextResponse.json(
          {
            success: false,
            error: `Invalid or unrecognized Nigerian state "${state}".`,
          },
          { status: 400 }
        );
      }

      availableCities = NIGERIA_LOCATIONS[matchedStateKey];

      // Find saved DeliveryState for this state from DB
      const dbState = await prisma.deliveryState.findUnique({
        where: { state: matchedStateKey },
        include: {
          cities: {
            where: { enabled: true },
          },
        },
      });

      if (!dbState || !dbState.enabled) {
        return NextResponse.json(
          {
            success: false,
            error: `Delivery rates for "${matchedStateKey}" are currently unconfigured or disabled.`,
          },
          { status: 503 }
        );
      }

      pricingMode = dbState.pricingMode;

      if (pricingMode === "CITY_SPECIFIC" && city) {
        const matchedCity = dbState.cities.find(
          (c) => c.city.toLowerCase() === city.trim().toLowerCase()
        );

        if (matchedCity && matchedCity.fee !== null && matchedCity.fee !== undefined) {
          const rawCityFee = Number(matchedCity.fee);
          if (!Number.isFinite(rawCityFee) || rawCityFee < 0) {
            return NextResponse.json(
              { success: false, error: `Invalid delivery fee configured for city "${matchedCity.city}".` },
              { status: 422 }
            );
          }
          fee = rawCityFee;
          matchedLocationName = `${matchedStateKey} - ${matchedCity.city} (City Rate)`;
        } else {
          // Fall back to state default fee if city rate not found
          if (dbState.defaultFee === null || dbState.defaultFee === undefined) {
            return NextResponse.json(
              { success: false, error: `Delivery fee for city "${city}" in "${matchedStateKey}" is not configured.` },
              { status: 422 }
            );
          }
          const rawDefaultFee = Number(dbState.defaultFee);
          if (!Number.isFinite(rawDefaultFee) || rawDefaultFee < 0) {
            return NextResponse.json(
              { success: false, error: `Delivery fee for city "${city}" in "${matchedStateKey}" is not configured.` },
              { status: 422 }
            );
          }
          fee = rawDefaultFee;
          matchedLocationName = `${matchedStateKey} (State Default Fallback)`;
        }
      } else {
        const rawDefaultFee = Number(dbState.defaultFee);
        if (!Number.isFinite(rawDefaultFee) || rawDefaultFee < 0) {
          return NextResponse.json(
            { success: false, error: `Delivery fee for "${matchedStateKey}" is missing or malformed.` },
            { status: 422 }
          );
        }
        fee = rawDefaultFee;
        matchedLocationName = `${matchedStateKey} (State Default Rate)`;
      }
    } else {
      const matchedIntl = await prisma.deliveryLocation.findFirst({
        where: {
          country: { equals: country, mode: "insensitive" },
          enabled: true,
        },
      });

      if (matchedIntl) {
        const rawIntlFee = Number(matchedIntl.fee);
        if (!Number.isFinite(rawIntlFee) || rawIntlFee < 0) {
          return NextResponse.json(
            { success: false, error: `Invalid delivery fee configured for "${country}".` },
            { status: 422 }
          );
        }
        fee = rawIntlFee;
        matchedLocationName = `${country} (International Rate)`;
      } else {
        // Default standard international rate when unconfigured
        fee = 15000;
        matchedLocationName = `${country} (Standard International Rate)`;
      }
    }

    // Final sanity check before returning success
    if (typeof fee !== "number" || !Number.isFinite(fee) || fee < 0) {
      return NextResponse.json(
        { success: false, error: "Failed to calculate valid non-zero delivery price." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      fee,
      pricingMode,
      matchedLocationName,
      options: {
        countries: availableCountries,
        states: availableStates,
        cities: availableCities,
      },
    });
  } catch (error) {
    console.error("GET /api/delivery error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to calculate delivery rates due to a server database error.",
      },
      { status: 500 }
    );
  }
}
