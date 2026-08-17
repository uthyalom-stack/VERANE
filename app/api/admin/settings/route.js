import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

const DEFAULT_SETTINGS = {
  siteName: "VÉRANE",
  tagline: "Two Brands. One Expression.",
  logo: "",
  favicon: "",
  primaryColor: "#f5b942",

  email: "",
  phone: "",
  whatsapp: "",

  instagram: "",
  facebook: "",
  tiktok: "",

  announcementEnabled: "false",
  announcementText: "",
};

const ALLOWED_SETTINGS = new Set([
  "siteName",
  "tagline",
  "logo",
  "favicon",
  "primaryColor",

  "email",
  "phone",
  "whatsapp",

  "instagram",
  "facebook",
  "tiktok",

  "announcementEnabled",
  "announcementText",
]);

function normalizeValue(value) {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  return String(value).trim();
}

export async function GET() {
  try {
    const rows = await prisma.siteSetting.findMany({
      orderBy: {
        key: "asc",
      },
    });

    const settings = {
      ...DEFAULT_SETTINGS,
    };

    for (const row of rows) {
      if (ALLOWED_SETTINGS.has(row.key)) {
        settings[row.key] = row.value;
      }
    }

    return NextResponse.json(settings, {
      status: 200,
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Failed to load site settings:", error);

    return NextResponse.json(DEFAULT_SETTINGS, {
      status: 200,
    });
  }
}

export async function PUT(request) {
  try {
    const body = await request.json();

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid settings data.",
        },
        { status: 400 }
      );
    }

    const entries = Object.entries(body);

    const invalidKeys = entries
      .map(([key]) => key)
      .filter((key) => !ALLOWED_SETTINGS.has(key));

    if (invalidKeys.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Unsupported setting(s): ${invalidKeys.join(", ")}`,
        },
        { status: 400 }
      );
    }

    await prisma.$transaction(
      entries.map(([key, value]) =>
        prisma.siteSetting.upsert({
          where: {
            key,
          },
          update: {
            value: normalizeValue(value),
          },
          create: {
            key,
            value: normalizeValue(value),
          },
        })
      )
    );

    const rows = await prisma.siteSetting.findMany({
      orderBy: {
        key: "asc",
      },
    });

    const settings = {
      ...DEFAULT_SETTINGS,
    };

    for (const row of rows) {
      if (ALLOWED_SETTINGS.has(row.key)) {
        settings[row.key] = row.value;
      }
    }

    return NextResponse.json({
      success: true,
      settings,
    });
  } catch (error) {
    console.error("Failed to update site settings:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to save site settings.",
      },
      { status: 500 }
    );
  }
}