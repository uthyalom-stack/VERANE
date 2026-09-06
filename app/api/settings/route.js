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

export async function GET() {
  try {
    const rows = await prisma.siteSetting.findMany();

    const settings = { ...DEFAULT_SETTINGS };

    rows.forEach((row) => {
      settings[row.key] = row.value;
    });

    return NextResponse.json(settings, {
      status: 200,
      headers: {
        "Cache-Control":
          "public, s-maxage=60, stale-while-revalidate=300",
      },
    });
  } catch (error) {
    console.error("Failed to load site settings:", error);

    return NextResponse.json(DEFAULT_SETTINGS, {
      status: 200,
    });
  }
}