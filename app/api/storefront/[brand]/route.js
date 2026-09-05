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

function getFirstImage(images) {
  if (!images) return "";

  try {
    const parsed = JSON.parse(images);

    if (Array.isArray(parsed)) return parsed[0] || "";
    if (typeof parsed === "string") return parsed;
  } catch {
    return String(images)
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)[0] || "";
  }

  return "";
}

/**
 * Converts a database product into its public storefront representation.
 * Excludes internal metadata (such as initialInventory, initialStock) while
 * preserving fields necessary for customer selection, options, and rendering.
 * @param {Object} product - The product record to convert.
 * @return {Object} The customer-facing product DTO exposed to storefront clients.
 */
function toPublicProduct(product) {
  const publicVariants = (product.variants || []).map((v) => ({
    id: v.id,
    productId: v.productId,
    stock: Math.max(0, Number(v.stock || 0)),
    size: v.size || null,
    colorId: v.colorId || null,
    color: v.color
      ? {
          id: v.color.id,
          name: v.color.name,
          hex: v.color.hex,
        }
      : null,
  }));

  const publicColors = (product.productColors || []).map((c) => ({
    id: c.id,
    name: c.name,
    hex: c.hex,
  }));

  return {
    id: product.id,
    name: product.name,
    price: product.price,
    brand: product.brand,
    category: product.category,
    inventory: Math.max(0, Number(product.inventory || 0)),
    preOrderEnabled: Boolean(product.preOrderEnabled || product.isPreOrder),
    images: getFirstImage(product.images) ? [getFirstImage(product.images)] : [],
    variants: publicVariants,
    productColors: publicColors,
    customSizingEnabled: product.customSizingEnabled || false,
    sizeType: product.sizeType || "none",
  };
}

/**
 * Retrieves storefront data for a supported brand.
 * @param {Request} request - Request object.
 * @param {{ params: Promise<{ brand: string }> }} context - Route parameters containing the requested brand.
 * @return {Promise<NextResponse>} A JSON response containing the brand, metadata, products, and storefront sections.
 */
export async function GET(request, { params }) {
  try {
    const { brand } = await params;

    if (!VALID_BRANDS.includes(brand)) {
      return NextResponse.json(
        { success: false, error: "Invalid brand." },
        { status: 400 }
      );
    }

    const [setting, heroSetting, products, brandSetting] = await Promise.all([
      prisma.siteSetting.findUnique({ where: { key: getStorageKey(brand) } }),
      prisma.siteSetting.findUnique({ where: { key: getHeroKey(brand) } }),
      prisma.product.findMany({
        where: { brand },
        orderBy: { createdAt: "desc" },
        include: {
          variants: {
            orderBy: {
              createdAt: "asc",
            },
            include: {
              color: true,
            },
          },
          productColors: {
            orderBy: {
              createdAt: "asc",
            },
          },
        },
      }),
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
      products.map((product) => {
        const publicProduct = toPublicProduct(product);
        return [publicProduct.id, publicProduct];
      })
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
    return NextResponse.json(
      { success: false, error: "Failed to load storefront." },
      { status: 500 }
    );
  }
}
