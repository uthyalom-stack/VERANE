import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

/*
|--------------------------------------------------------------------------
| Public Delivery Lookup API for Customer Checkout
|--------------------------------------------------------------------------
*/

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);

    const country = searchParams.get("country");
    const state = searchParams.get("state");
    const city = searchParams.get("city");
    const zone = searchParams.get("zone");

    // Fetch enabled locations
    const locations = await prisma.deliveryLocation.findMany({
      where: { enabled: true },
      orderBy: [
        { country: "asc" },
        { state: "asc" },
        { city: "asc" },
      ],
    });

    // If specific country/state/city provided, calculate matching fee
    let fee = 0;
    let matchedLocation = null;

    if (country && state && city) {
      matchedLocation = locations.find((loc) => {
        const countryMatch = loc.country.toLowerCase() === country.toLowerCase();
        const stateMatch = loc.state.toLowerCase() === state.toLowerCase();
        const cityMatch = loc.city.toLowerCase() === city.toLowerCase();

        if (zone && loc.zone) {
          return countryMatch && stateMatch && cityMatch && loc.zone.toLowerCase() === zone.toLowerCase();
        }

        return countryMatch && stateMatch && cityMatch;
      });

      // Fallback 1: match state default
      if (!matchedLocation) {
        matchedLocation = locations.find((loc) =>
          loc.country.toLowerCase() === country.toLowerCase() &&
          loc.state.toLowerCase() === state.toLowerCase()
        );
      }

      // Fallback 2: match country default
      if (!matchedLocation) {
        matchedLocation = locations.find((loc) =>
          loc.country.toLowerCase() === country.toLowerCase()
        );
      }

      // Default fallback fee for Nigeria is ₦3,500 if no record exists yet
      fee = matchedLocation ? matchedLocation.fee : country.toLowerCase() === "nigeria" ? 3500 : 15000;
    }

    // Return unique dropdown options
    const countries = Array.from(new Set(locations.map((l) => l.country))).concat(["Nigeria", "International"]);
    const uniqueCountries = Array.from(new Set(countries));

    const states = country
      ? Array.from(new Set(locations.filter((l) => l.country.toLowerCase() === country.toLowerCase()).map((l) => l.state)))
      : [];

    const cities = country && state
      ? Array.from(new Set(locations.filter((l) => l.country.toLowerCase() === country.toLowerCase() && l.state.toLowerCase() === state.toLowerCase()).map((l) => l.city)))
      : [];

    return NextResponse.json({
      success: true,
      fee,
      matchedLocation,
      options: {
        countries: uniqueCountries,
        states,
        cities,
      },
    });
  } catch (error) {
    console.error("GET /api/delivery error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to load delivery rates." },
      { status: 500 }
    );
  }
}
