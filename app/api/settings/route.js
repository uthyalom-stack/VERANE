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

const PUBLIC_KEYS_ALLOWLIST = new Set([
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

export async function GET() {
  try {
    const rows = await prisma.siteSetting.findMany();

    const settings = { ...DEFAULT_SETTINGS };

    rows.forEach((row) => {
      if (PUBLIC_KEYS_ALLOWLIST.has(row.key)) {
        settings[row.key] = row.value;
      }
    });

    // Return only keys explicitly present in the allowlist
    const publicSettings = {};
    for (const key of PUBLIC_KEYS_ALLOWLIST) {
      publicSettings[key] = settings[key] ?? "";
    }

    return NextResponse.json(publicSettings, {
      status: 200,
      headers: {
        "Cache-Control":
          "public, s-maxage=60, stale-while-revalidate=300",
      },
    });
  } catch (error) {
    console.error("Failed to load site settings:", error);

    const publicSettings = {};
    for (const key of PUBLIC_KEYS_ALLOWLIST) {
      publicSettings[key] = DEFAULT_SETTINGS[key] ?? "";
    }

    return NextResponse.json(publicSettings, {
      status: 200,
    });
  }
}