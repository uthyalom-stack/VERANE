import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAdminSession } from "@/lib/admin-auth";
import { NIGERIA_LOCATIONS, NIGERIAN_STATES } from "@/lib/nigeria-locations";

/*
|--------------------------------------------------------------------------
| SUPERADMIN Delivery & Logistics Management API
|--------------------------------------------------------------------------
*/

export async function GET() {
  try {
    const admin = await getAdminSession();

    if (!admin || !admin.isSuperAdmin) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. SUPERADMIN access required." },
        { status: 403 }
      );
    }

    // Fetch saved state configurations with cities
    const savedStates = await prisma.deliveryState.findMany({
      include: {
        cities: true,
      },
      orderBy: { state: "asc" },
    });

    const savedStatesMap = new Map(savedStates.map((s) => [s.state, s]));

    // Build complete states list for all 36 Nigerian states + FCT
    const statesData = NIGERIAN_STATES.map((stateName) => {
      const dbState = savedStatesMap.get(stateName);
      const officialLgas = NIGERIA_LOCATIONS[stateName] || [];

      const savedCitiesMap = new Map(
        (dbState?.cities || []).map((c) => [c.city, c])
      );

      // Map official LGAs with their saved fee or default 0
      const cities = officialLgas.map((cityName) => {
        const savedCity = savedCitiesMap.get(cityName);
        return {
          id: savedCity?.id || null,
          city: cityName,
          fee: savedCity ? Number(savedCity.fee || 0) : 0,
          enabled: savedCity ? savedCity.enabled !== false : true,
        };
      });

      return {
        id: dbState?.id || null,
        country: "Nigeria",
        state: stateName,
        pricingMode: dbState?.pricingMode || "STATE_DEFAULT", // STATE_DEFAULT | CITY_SPECIFIC
        defaultFee: dbState ? Number(dbState.defaultFee || 0) : 0,
        enabled: dbState ? dbState.enabled !== false : true,
        cities,
        officialLgas,
      };
    });

    // Fetch international delivery locations
    const internationalLocations = await prisma.deliveryLocation.findMany({
      where: {
        country: {
          not: "Nigeria",
        },
      },
      orderBy: [{ country: "asc" }, { state: "asc" }, { city: "asc" }],
    });

    return NextResponse.json({
      success: true,
      states: statesData,
      internationalLocations,
    });
  } catch (error) {
    console.error("GET /api/admin/delivery error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch delivery locations." },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const admin = await getAdminSession();

    if (!admin || !admin.isSuperAdmin) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. SUPERADMIN access required." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const action = body.action || "save_state";

    if (action === "save_state") {
      const stateName = String(body.state || "").trim();
      const pricingMode = body.pricingMode === "CITY_SPECIFIC" ? "CITY_SPECIFIC" : "STATE_DEFAULT";
      const defaultFee = Number(body.defaultFee || 0);
      const cities = Array.isArray(body.cities) ? body.cities : [];

      if (!stateName || !NIGERIA_LOCATIONS[stateName]) {
        return NextResponse.json(
          { success: false, error: "Invalid Nigerian state provided." },
          { status: 400 }
        );
      }

      // Execute upsert inside a single transaction for efficiency
      const updatedState = await prisma.$transaction(async (tx) => {
        const deliveryState = await tx.deliveryState.upsert({
          where: { state: stateName },
          update: {
            country: "Nigeria",
            pricingMode,
            defaultFee: defaultFee >= 0 ? defaultFee : 0,
            enabled: body.enabled !== false,
          },
          create: {
            country: "Nigeria",
            state: stateName,
            pricingMode,
            defaultFee: defaultFee >= 0 ? defaultFee : 0,
            enabled: body.enabled !== false,
          },
        });

        // Batch upsert cities
        for (const cityItem of cities) {
          if (!cityItem.city) continue;
          const cityFee = Number(cityItem.fee || 0);

          await tx.deliveryCity.upsert({
            where: {
              stateId_city: {
                stateId: deliveryState.id,
                city: cityItem.city,
              },
            },
            update: {
              fee: cityFee >= 0 ? cityFee : 0,
              enabled: cityItem.enabled !== false,
            },
            create: {
              stateId: deliveryState.id,
              city: cityItem.city,
              fee: cityFee >= 0 ? cityFee : 0,
              enabled: cityItem.enabled !== false,
            },
          });
        }

        return tx.deliveryState.findUnique({
          where: { id: deliveryState.id },
          include: { cities: true },
        });
      });

      return NextResponse.json({ success: true, state: updatedState });
    }

    if (action === "save_international") {
      const country = String(body.country || "").trim();
      const state = String(body.state || "*").trim();
      const city = String(body.city || "*").trim();
      const zone = body.zone ? String(body.zone).trim() : null;
      const fee = Number(body.fee || 0);

      if (!country || country.toLowerCase() === "nigeria") {
        return NextResponse.json(
          { success: false, error: "Valid non-Nigeria country name required." },
          { status: 400 }
        );
      }

      const location = await prisma.deliveryLocation.create({
        data: {
          country,
          state,
          city,
          zone,
          fee: fee >= 0 ? fee : 0,
          enabled: body.enabled !== false,
        },
      });

      return NextResponse.json({ success: true, location }, { status: 201 });
    }

    return NextResponse.json(
      { success: false, error: "Unknown action specified." },
      { status: 400 }
    );
  } catch (error) {
    console.error("POST /api/admin/delivery error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update delivery settings." },
      { status: 500 }
    );
  }
}

export async function DELETE(request) {
  try {
    const admin = await getAdminSession();

    if (!admin || !admin.isSuperAdmin) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. SUPERADMIN access required." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const type = searchParams.get("type"); // "international"

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Location ID is required." },
        { status: 400 }
      );
    }

    if (type === "international") {
      await prisma.deliveryLocation.delete({ where: { id } });
    } else {
      await prisma.deliveryState.delete({ where: { id } });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/admin/delivery error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete location record." },
      { status: 500 }
    );
  }
}
