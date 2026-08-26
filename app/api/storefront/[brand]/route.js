import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

const VALID_BRANDS = ["UTHY_LUXURY", "ALOMZIEE_FOOTIES"];

function getStorageKey(brand) {
  return `storefront:${brand}`;
}

function getHeroKey(brand) {
  return `storefront-hero:${brand}`;
}

function getBrandDisplayName(brand) {
  return brand === "UTHY_LUXURY" ? "UTHY LUXURY" : "ALOMZIEE FOOTIES";
}

function parseImages(images) {
  if (!images) return [];

  try {
    const parsed = JSON.parse(images);
    if (Array.isArray(parsed)) return parsed;
    if (typeof parsed === "string") return [parsed];
  } catch {
    return String(images).split(",").map((item) => item.trim()).filter(Boolean);
  }

  return [];
}

export async function GET(request, { params }) {
  try {
    const { brand } = await params;

    if (!VALID_BRANDS.includes(brand)) {
      return NextResponse.json({ success: false, error: "Invalid brand." }, { status: 400 });
    }

    const [setting, heroSetting, products, brandSetting] = await Promise.all([
      prisma.siteSetting.findUnique({ where: { key: getStorageKey(brand) } }),
      prisma.siteSetting.findUnique({ where: { key: getHeroKey(brand) } }),
      prisma.product.findMany({ where: { brand }, orderBy: { createdAt: "desc" } }),
      prisma.siteSetting.findUnique({ where: { key: "brandData" } }),
    ]);

    let sections = [];
    if (setting?.value) {
      try {
        const parsed = JSON.parse(setting.value);
        if (Array.isArray(parsed)) sections = parsed;
      } catch {
        sections = [];
      }
    }

    let brandData = {};
    if (brandSetting?.value) {
      try {
        brandData = JSON.parse(brandSetting.value);
      } catch {
        brandData = {};
      }
    }

    const brandInfo = brandData?.[brand] || {};
    const productMap = new Map(
      products.map((product) => [product.id, { ...product, images: parseImages(product.images) }])
    );

    const publicSections = sections
      .filter((section) => section && section.enabled !== false)
      .sort((a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0))
      .map((section) => ({
        id: section.id,
        title: section.title || "Featured",
        description: section.description || "",
        image: section.image || "",
        products: (Array.isArray(section.productIds) ? section.productIds : [])
          .map((id) => productMap.get(id))
          .filter(Boolean),
      }))
      .filter((section) => section.products.length > 0 || section.image);

    return NextResponse.json({
      success: true,
      brand,
      brandInfo: {
        name: brandInfo.name || getBrandDisplayName(brand),
        tagline: brandInfo.tagline || "",
        description: brandInfo.description || "",
        image: heroSetting?.value || brandInfo.image || "",
      },
      products: Array.from(productMap.values()),
      sections: publicSections,
    });
  } catch (error) {
    console.error("GET /api/storefront/[brand] error:", error);
    return NextResponse.json({ success: false, error: "Failed to load storefront." }, { status: 500 });
  }
}
