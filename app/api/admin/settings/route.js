import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAdminSession } from "@/lib/admin-auth";

const DEFAULT_SETTINGS = {
  siteName: "VÉRANE",
  tagline: "Two Brands. One Expression.",
  logo: "",
  favicon: "",
  primaryColor: "#f5b942",
  backgroundColor: "#070707",
  email: "",
  phone: "",
  whatsapp: "",
  instagram: "",
  facebook: "",
  tiktok: "",
  announcementEnabled: "false",
  announcementText: "",

  // VÉRANE RECEIPT BRANDING
  veraneLogo: "",
  veraneName: "VÉRANE",
  veraneAddress: "",
  veranePhone: "",
  veraneEmail: "",
  veraneWebsite: "https://verane.com",

  // UTHY LUXURY RECEIPT BRANDING
  uthyLogo: "",
  uthyName: "UTHY LUXURY",
  uthyAddress: "",
  uthyPhone: "",
  uthyEmail: "",
  uthyWebsite: "",

  // ALOMZIEE FOOTIES RECEIPT BRANDING
  alomzieeLogo: "",
  alomzieeName: "ALOMZIEE FOOTIES",
  alomzieeAddress: "",
  alomzieePhone: "",
  alomzieeEmail: "",
  alomzieeWebsite: "",
};

/**
 * Retrieves all site settings for Super Admin users.
 * @returns {Promise<NextResponse>} JSON response with site settings object.
 */
export async function GET() {
  try {
    const admin = await getAdminSession();

    if (!admin) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    if (!admin.isSuperAdmin) {
      return NextResponse.json(
        { error: "Forbidden: Platform settings are restricted to Super Admin." },
        { status: 403 }
      );
    }

    const rows = await prisma.siteSetting.findMany();

    const settings = {
      ...DEFAULT_SETTINGS,
    };

    rows.forEach((row) => {
      settings[row.key] = row.value;
    });

    return NextResponse.json(settings);
  } catch (error) {
    console.error("Failed loading settings:", error);
    return NextResponse.json(DEFAULT_SETTINGS);
  }
}

/**
 * Updates site settings with provided key-value pairs (Super Admin only).
 * @param {Request} request - The Next.js request object containing settings updates in JSON body.
 * @returns {Promise<NextResponse>} JSON response with success status.
 */
export async function PUT(request) {
  try {
    const admin = await getAdminSession();

    if (!admin) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    if (!admin.isSuperAdmin) {
      return NextResponse.json(
        { error: "Forbidden: Platform settings are restricted to Super Admin." },
        { status: 403 }
      );
    }

    const body = await request.json();

    for (const key of Object.keys(body)) {
      await prisma.siteSetting.upsert({
        where: { key },
        update: { value: String(body[key]) },
        create: { key, value: String(body[key]) },
      });
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error("Failed saving settings:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Unable to save settings",
      },
      {
        status: 500,
      }
    );
  }
}
