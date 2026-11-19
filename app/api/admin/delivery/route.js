import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAdminSession } from "@/lib/admin-auth";

/**
 * GET /api/admin/delivery
 * Retrieves brand-scoped Delivery physical dispatch origin configuration for UTHY or ALOMZIEE store admins.
 * SUPERADMIN access is strictly blocked (403 Forbidden).
 */
export async function GET() {
  try {
    const admin = await getAdminSession();

    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (admin.isSuperAdmin) {
      return NextResponse.json(
        { error: "Forbidden: Home Delivery settings are managed by store administrators." },
        { status: 403 }
      );
    }

    const role = admin.role;
    if (role !== "UTHY" && role !== "ALOMZIEE") {
      return NextResponse.json(
        { error: "Forbidden: Access restricted to UTHY and ALOMZIEE administrators." },
        { status: 403 }
      );
    }

    const prefix = role === "UTHY" ? "uthy" : "alomziee";

    const keys = [
      `${prefix}HomeDeliveryEnabled`,
      `${prefix}ShipbubbleOriginName`,
      `${prefix}ShipbubbleOriginEmail`,
      `${prefix}ShipbubbleOriginPhone`,
      `${prefix}ShipbubbleOriginCountry`,
      `${prefix}ShipbubbleOriginState`,
      `${prefix}ShipbubbleOriginCity`,
      `${prefix}ShipbubbleOriginStreet`,
      `${prefix}ShipbubbleCategoryId`,
    ];

    const rows = await prisma.siteSetting.findMany({
      where: { key: { in: keys } },
    });

    const map = {};
    rows.forEach((r) => {
      map[r.key] = r.value;
    });

    return NextResponse.json({
      success: true,
      role,
      homeDeliveryEnabled: map[`${prefix}HomeDeliveryEnabled`] !== "false", // default true
      originName: map[`${prefix}ShipbubbleOriginName`] || "",
      originEmail: map[`${prefix}ShipbubbleOriginEmail`] || "",
      originPhone: map[`${prefix}ShipbubbleOriginPhone`] || "",
      originCountry: map[`${prefix}ShipbubbleOriginCountry`] || "Nigeria",
      originState: map[`${prefix}ShipbubbleOriginState`] || "",
      originCity: map[`${prefix}ShipbubbleOriginCity`] || "",
      originStreet: map[`${prefix}ShipbubbleOriginStreet`] || "",
      categoryId: map[`${prefix}ShipbubbleCategoryId`] || "",
    });
  } catch (error) {
    console.error("Failed loading home delivery settings:", error);
    return NextResponse.json({ error: "Unable to load home delivery settings" }, { status: 500 });
  }
}

/**
 * PUT /api/admin/delivery
 * Updates brand-scoped Delivery physical dispatch origin configuration for UTHY or ALOMZIEE store admins.
 * Enforces strict key isolation so brand admins cannot alter each other's settings or global settings.
 */
export async function PUT(request) {
  try {
    const admin = await getAdminSession();

    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (admin.isSuperAdmin) {
      return NextResponse.json(
        { error: "Forbidden: Home Delivery settings are managed by store administrators." },
        { status: 403 }
      );
    }

    const role = admin.role;
    if (role !== "UTHY" && role !== "ALOMZIEE") {
      return NextResponse.json(
        { error: "Forbidden: Access restricted to UTHY and ALOMZIEE administrators." },
        { status: 403 }
      );
    }

    const prefix = role === "UTHY" ? "uthy" : "alomziee";
    const body = await request.json();

    const allowedKeys = [
      `${prefix}HomeDeliveryEnabled`,
      `${prefix}ShipbubbleOriginName`,
      `${prefix}ShipbubbleOriginEmail`,
      `${prefix}ShipbubbleOriginPhone`,
      `${prefix}ShipbubbleOriginCountry`,
      `${prefix}ShipbubbleOriginState`,
      `${prefix}ShipbubbleOriginCity`,
      `${prefix}ShipbubbleOriginStreet`,
      `${prefix}ShipbubbleCategoryId`,
    ];

    for (const key of Object.keys(body)) {
      if (!allowedKeys.includes(key)) {
        return NextResponse.json(
          { error: `Forbidden: Key "${key}" is not permitted for role ${role}.` },
          { status: 403 }
        );
      }

      const val = body[key];
      const strVal = typeof val === "object" ? JSON.stringify(val) : String(val ?? "");

      await prisma.siteSetting.upsert({
        where: { key },
        update: { value: strVal },
        create: { key, value: strVal },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed updating home delivery settings:", error);
    return NextResponse.json({ error: "Unable to update home delivery settings" }, { status: 500 });
  }
}
