import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis;

const prisma =
  globalForPrisma.prisma ||
  new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

const DEFAULT_SETTINGS = {
  id: "main",
  siteName: "VÉRANE",
  siteTagline: "",
  siteDescription: "",

  logo: "",
  favicon: "",

  primaryColor: "#f59e0b",
  secondaryColor: "#000000",
  accentColor: "#ffffff",

  heroTitle: "",
  heroSubtitle: "",
  heroImage: "",
  heroButtonText: "Shop Now",
  heroButtonLink: "/products",

  uthyEnabled: true,
  uthyName: "UTHY LUXURY",
  uthyDescription: "",
  uthyImage: "",

  alomzieeEnabled: true,
  alomzieeName: "ALOMZIEE FOOTIES",
  alomzieeDescription: "",
  alomzieeImage: "",

  announcementEnabled: false,
  announcementText: "",

  instagram: "",
  facebook: "",
  tiktok: "",
  whatsapp: "",
  email: "",
  phone: "",

  currency: "NGN",
  shippingEnabled: true,

  seoTitle: "",
  seoDescription: "",
  seoImage: "",
};

export async function GET() {
  try {
    let settings = await prisma.siteSettings.findUnique({
      where: { id: "main" },
    });

    if (!settings) {
      settings = await prisma.siteSettings.create({
        data: DEFAULT_SETTINGS,
      });
    }

    return NextResponse.json(settings);
  } catch (error) {
    console.error("GET SETTINGS ERROR:", error);

    return NextResponse.json(
      { error: "Failed to load settings" },
      { status: 500 }
    );
  }
}

export async function PUT(request) {
  try {
    const body = await request.json();

    const data = {
      siteName: body.siteName ?? "",
      siteTagline: body.siteTagline ?? "",
      siteDescription: body.siteDescription ?? "",

      logo: body.logo ?? "",
      favicon: body.favicon ?? "",

      primaryColor: body.primaryColor ?? "#f59e0b",
      secondaryColor: body.secondaryColor ?? "#000000",
      accentColor: body.accentColor ?? "#ffffff",

      heroTitle: body.heroTitle ?? "",
      heroSubtitle: body.heroSubtitle ?? "",
      heroImage: body.heroImage ?? "",
      heroButtonText: body.heroButtonText ?? "Shop Now",
      heroButtonLink: body.heroButtonLink ?? "/products",

      uthyEnabled: Boolean(body.uthyEnabled),
      uthyName: body.uthyName ?? "UTHY LUXURY",
      uthyDescription: body.uthyDescription ?? "",
      uthyImage: body.uthyImage ?? "",

      alomzieeEnabled: Boolean(body.alomzieeEnabled),
      alomzieeName: body.alomzieeName ?? "ALOMZIEE FOOTIES",
      alomzieeDescription: body.alomzieeDescription ?? "",
      alomzieeImage: body.alomzieeImage ?? "",

      announcementEnabled: Boolean(body.announcementEnabled),
      announcementText: body.announcementText ?? "",

      instagram: body.instagram ?? "",
      facebook: body.facebook ?? "",
      tiktok: body.tiktok ?? "",
      whatsapp: body.whatsapp ?? "",
      email: body.email ?? "",
      phone: body.phone ?? "",

      currency: body.currency ?? "NGN",
      shippingEnabled: Boolean(body.shippingEnabled),

      seoTitle: body.seoTitle ?? "",
      seoDescription: body.seoDescription ?? "",
      seoImage: body.seoImage ?? "",
    };

    const settings = await prisma.siteSettings.upsert({
      where: { id: "main" },
      update: data,
      create: {
        id: "main",
        ...data,
      },
    });

    return NextResponse.json({
      success: true,
      settings,
    });
  } catch (error) {
    console.error("SAVE SETTINGS ERROR:", error);

    return NextResponse.json(
      { error: "Failed to save settings" },
      { status: 500 }
    );
  }
}