import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAdminSession } from "@/lib/admin-auth";

const DEFAULT_PICKUP_SETTINGS = {
  uthyPickupLocationName: "",
  uthyPickupAddress: "",
  uthyPickupContactName: "",
  uthyPickupContactPhone: "",
  uthyImmediatePickupEnabled: "false",
  uthyPickupInstructions: "Please present your order confirmation email and a valid photo ID upon arrival.",
  uthyPickupMinDays: "1",
  uthyPickupMaxDays: "3",
  uthyPickupLeadDays: "2",
  uthyPickupAllowedDays: '["MON", "TUE", "WED", "THU", "FRI", "SAT"]',

  alomzieePickupLocationName: "",
  alomzieePickupAddress: "",
  alomzieePickupContactName: "",
  alomzieePickupContactPhone: "",
  alomzieeImmediatePickupEnabled: "false",
  alomzieePickupInstructions: "Please present your order confirmation email and a valid photo ID upon arrival.",
  alomzieePickupMinDays: "1",
  alomzieePickupMaxDays: "3",
  alomzieePickupLeadDays: "2",
  alomzieePickupAllowedDays: '["MON", "TUE", "WED", "THU", "FRI", "SAT"]',
};

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
        // Fallback
      }

      return NextResponse.json({
        success: true,
        role: admin.role,
        pickupLocationName: settings.uthyPickupLocationName,
        pickupAddress: settings.uthyPickupAddress,
        pickupContactName: settings.uthyPickupContactName,
        pickupContactPhone: settings.uthyPickupContactPhone,
        immediatePickupEnabled: settings.uthyImmediatePickupEnabled === "true",
        pickupInstructions: settings.uthyPickupInstructions,
        minDays: Number(settings.uthyPickupMinDays || 1),
        maxDays: Number(settings.uthyPickupMaxDays || 3),
        leadDays: Number(settings.uthyPickupLeadDays || 2),
        allowedDaysOfWeek: allowedDays,
      });
    }

    if (admin.role === "ALOMZIEE") {
      let allowedDays = ["MON", "TUE", "WED", "THU", "FRI", "SAT"];
      try {
        allowedDays = JSON.parse(settings.alomzieePickupAllowedDays);
      } catch {
        // Fallback
      }

      return NextResponse.json({
        success: true,
        role: admin.role,
        pickupLocationName: settings.alomzieePickupLocationName,
        pickupAddress: settings.alomzieePickupAddress,
        pickupContactName: settings.alomzieePickupContactName,
        pickupContactPhone: settings.alomzieePickupContactPhone,
        immediatePickupEnabled: settings.alomzieeImmediatePickupEnabled === "true",
        pickupInstructions: settings.alomzieePickupInstructions,
        minDays: Number(settings.alomzieePickupMinDays || 1),
        maxDays: Number(settings.alomzieePickupMaxDays || 3),
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
      ? ["uthyPickupLocationName", "uthyPickupAddress", "uthyPickupContactName", "uthyPickupContactPhone", "uthyImmediatePickupEnabled", "uthyPickupInstructions", "uthyPickupMinDays", "uthyPickupMaxDays", "uthyPickupLeadDays", "uthyPickupAllowedDays"]
      : ["alomzieePickupLocationName", "alomzieePickupAddress", "alomzieePickupContactName", "alomzieePickupContactPhone", "alomzieeImmediatePickupEnabled", "alomzieePickupInstructions", "alomzieePickupMinDays", "alomzieePickupMaxDays", "alomzieePickupLeadDays", "alomzieePickupAllowedDays"];

    for (const key of Object.keys(body)) {
      if (!allowedKeys.includes(key)) {
        return NextResponse.json(
          { success: false, error: `Forbidden: You are not authorized to update key "${key}".` },
          { status: 403 }
        );
      }
    }

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
