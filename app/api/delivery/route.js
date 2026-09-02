import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { NIGERIA_LOCATIONS, NIGERIAN_STATES } from "@/lib/nigeria-locations";

/*
|--------------------------------------------------------------------------
| Public Delivery Lookup API for Customer Checkout
|--------------------------------------------------------------------------
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
    try {
      const intlLocations = await prisma.deliveryLocation.findMany({
        where: { enabled: true, country: { not: "Nigeria" } },
        select: { country: true },
      });

      const customIntlCountries = Array.from(new Set(intlLocations.map((l) => l.country)));
      availableCountries = Array.from(new Set([...availableCountries, ...customIntlCountries]));
    } catch (dbErr) {
      console.warn("Delivery API DB lookup warning (intl locations):", dbErr.message);
    }

    if (country.toLowerCase() === "nigeria") {
      availableStates = NIGERIAN_STATES;

      // Find exact or case-insensitive state key in NIGERIA_LOCATIONS
      const matchedStateKey = state
        ? NIGERIAN_STATES.find((s) => s.toLowerCase() === state.trim().toLowerCase())
        : null;

      if (matchedStateKey && NIGERIA_LOCATIONS[matchedStateKey]) {
        availableCities = NIGERIA_LOCATIONS[matchedStateKey];

        try {
          // Find saved DeliveryState for this state if DB is accessible
          const dbState = await prisma.deliveryState.findUnique({
            where: { state: matchedStateKey },
            include: {
              cities: {
                where: { enabled: true },
              },
            },
          });

          if (dbState && dbState.enabled) {
            pricingMode = dbState.pricingMode;

            if (pricingMode === "CITY_SPECIFIC" && city) {
              const matchedCity = dbState.cities.find(
                (c) => c.city.toLowerCase() === city.toLowerCase()
              );

              if (matchedCity && Number(matchedCity.fee) >= 0) {
                fee = Number(matchedCity.fee);
                matchedLocationName = `${state} - ${matchedCity.city} (City Rate)`;
              } else {
                fee = Number(dbState.defaultFee || 0);
                matchedLocationName = `${state} (State Default Fallback)`;
              }
            } else {
              fee = Number(dbState.defaultFee || 0);
              matchedLocationName = `${state} (State Default Rate)`;
            }
          }
        } catch (dbErr) {
          console.warn("Delivery API DB lookup warning (state/city rate):", dbErr.message);
        }
      }
    } else {
      try {
        const matchedIntl = await prisma.deliveryLocation.findFirst({
          where: {
            country: { equals: country, mode: "insensitive" },
            enabled: true,
          },
        });

        fee = matchedIntl ? Number(matchedIntl.fee || 0) : 15000;
        matchedLocationName = matchedIntl ? `${country} (International Rate)` : `${country} (Standard International Rate)`;
      } catch {
        fee = 15000;
        matchedLocationName = `${country} (Standard International Rate)`;
      }
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
    return NextResponse.json({
      success: true,
      fee: 0,
      pricingMode: "STATE_DEFAULT",
      matchedLocationName: "Standard Rate",
      options: {
        countries: ["Nigeria", "International"],
        states: NIGERIAN_STATES,
        cities: [],
      },
    });
  }
}
