import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAdminSession } from "@/lib/admin-auth";

const DEFAULT_PICKUP_SETTINGS = {
  uthyPickupAddress: "",
  uthyImmediatePickupEnabled: "false",
  uthyPickupInstructions: "Please present your order confirmation email and a valid photo ID upon arrival.",
  uthyPickupLeadDays: "2",
  uthyPickupAllowedDays: '["MON", "TUE", "WED", "THU", "FRI", "SAT"]',

  alomzieePickupAddress: "",
  alomzieeImmediatePickupEnabled: "false",
  alomzieePickupInstructions: "Please present your order confirmation email and a valid photo ID upon arrival.",
  alomzieePickupLeadDays: "2",
  alomzieePickupAllowedDays: '["MON", "TUE", "WED", "THU", "FRI", "SAT"]',
};

/**
 * Retrieves pickup settings for the authenticated brand administrator.
 * SUPERADMIN is strictly forbidden from store pickup settings.
 */
export async function GET(request) {
  try {
    const admin = await getAdminSession();
    if (!admin) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    if (admin.isSuperAdmin || (admin.role !== "UTHY" && admin.role !== "ALOMZIEE")) {
      return NextResponse.json(
        { success: false, error: "Forbidden: SUPERADMIN does not manage store pickup settings." },
        { status: 403 }
      );
    }

    const rows = await prisma.siteSetting.findMany({
      where: {
        key: {
          in: Object.keys(DEFAULT_PICKUP_SETTINGS),
        },
      },
    });

    const settings = { ...DEFAULT_PICKUP_SETTINGS };
    rows.forEach((row) => {
      settings[row.key] = row.value;
    });

    if (admin.role === "UTHY") {
      let allowedDays = ["MON", "TUE", "WED", "THU", "FRI", "SAT"];
      try {
        allowedDays = JSON.parse(settings.uthyPickupAllowedDays);
      } catch {
        // Fallback to array if parse fails
      }

      return NextResponse.json({
        success: true,
        role: admin.role,
        pickupAddress: settings.uthyPickupAddress,
        immediatePickupEnabled: settings.uthyImmediatePickupEnabled === "true",
        pickupInstructions: settings.uthyPickupInstructions,
        leadDays: Number(settings.uthyPickupLeadDays || 2),
        allowedDaysOfWeek: allowedDays,
      });
    }

    if (admin.role === "ALOMZIEE") {
      let allowedDays = ["MON", "TUE", "WED", "THU", "FRI", "SAT"];
      try {
        allowedDays = JSON.parse(settings.alomzieePickupAllowedDays);
      } catch {
        // Fallback to array if parse fails
      }

      return NextResponse.json({
        success: true,
        role: admin.role,
        pickupAddress: settings.alomzieePickupAddress,
        immediatePickupEnabled: settings.alomzieeImmediatePickupEnabled === "true",
        pickupInstructions: settings.alomzieePickupInstructions,
        leadDays: Number(settings.alomzieePickupLeadDays || 2),
        allowedDaysOfWeek: allowedDays,
      });
    }

    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  } catch (error) {
    console.error("GET pickup settings error:", error);
    return NextResponse.json({ success: false, error: "Failed to load pickup settings" }, { status: 500 });
  }
}

/**
 * Updates brand pickup settings with strict brand role authorization.
 * SUPERADMIN is strictly forbidden from store pickup settings.
 */
export async function PUT(request) {
  try {
    const admin = await getAdminSession();
    if (!admin) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    if (admin.isSuperAdmin || (admin.role !== "UTHY" && admin.role !== "ALOMZIEE")) {
      return NextResponse.json(
        { success: false, error: "Forbidden: SUPERADMIN does not manage store pickup settings." },
        { status: 403 }
      );
    }

    const body = await request.json();

    const allowedKeys = admin.role === "UTHY"
      ? ["uthyPickupAddress", "uthyImmediatePickupEnabled", "uthyPickupInstructions", "uthyPickupLeadDays", "uthyPickupAllowedDays"]
      : ["alomzieePickupAddress", "alomzieeImmediatePickupEnabled", "alomzieePickupInstructions", "alomzieePickupLeadDays", "alomzieePickupAllowedDays"];

    // Ensure client is not attempting to mutate unauthorized keys
    for (const key of Object.keys(body)) {
      if (!allowedKeys.includes(key)) {
        return NextResponse.json(
          { success: false, error: `Forbidden: You are not authorized to update key "${key}".` },
          { status: 403 }
        );
      }
    }

    // Update authorized keys in database
    for (const key of Object.keys(body)) {
      if (allowedKeys.includes(key)) {
        let valStr = String(body[key]);
        if (typeof body[key] === "object") {
          valStr = JSON.stringify(body[key]);
        }
        await prisma.siteSetting.upsert({
          where: { key },
          update: { value: valStr },
          create: { key, value: valStr },
        });
      }
    }

    return NextResponse.json({ success: true, message: "Pickup settings updated successfully." });
  } catch (error) {
    console.error("PUT pickup settings error:", error);
    return NextResponse.json({ success: false, error: "Failed to save pickup settings" }, { status: 500 });
  }
}
