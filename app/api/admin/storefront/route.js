import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAdminSession } from "@/lib/admin-auth";

const VALID_BRANDS = ["UTHY_LUXURY", "ALOMZIEE_FOOTIES"];

function getStorageKey(brand) {
  return `storefront:${brand}`;
}

function getHeroKey(brand) {
  return `storefront-hero:${brand}`;
}

async function getStoreAdmin() {
  const admin = await getAdminSession();

  if (!admin) return null;
  if (admin.isSuperAdmin || !VALID_BRANDS.includes(admin.brand)) return null;

  return admin;
}

export async function GET() {
  try {
    const admin = await getStoreAdmin();

    if (!admin) {
      return NextResponse.json({ success: false, error: "Store admins only." }, { status: 403 });
    }

    const [setting, heroSetting, products] = await Promise.all([
      prisma.siteSetting.findUnique({ where: { key: getStorageKey(admin.brand) } }),
      prisma.siteSetting.findUnique({ where: { key: getHeroKey(admin.brand) } }),
      prisma.product.findMany({
        where: { brand: admin.brand },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          brand: true,
          category: true,
          price: true,
          images: true,
          inventory: true,
        },
      }),
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

    return NextResponse.json({
      success: true,
      brand: admin.brand,
      heroImage: heroSetting?.value || "",
      sections,
      products,
    });
  } catch (error) {
    console.error("GET /api/admin/storefront error:", error);
    return NextResponse.json({ success: false, error: "Failed to load store page." }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const admin = await getStoreAdmin();

    if (!admin) {
      return NextResponse.json({ success: false, error: "Store admins only." }, { status: 403 });
    }

    const body = await request.json();

    if (!Array.isArray(body.sections)) {
      return NextResponse.json({ success: false, error: "Sections must be an array." }, { status: 400 });
    }

    const products = await prisma.product.findMany({
      where: { brand: admin.brand },
      select: { id: true },
    });

    const allowedProductIds = new Set(products.map((product) => product.id));

    const sections = body.sections.map((section, index) => ({
      id:
        typeof section?.id === "string" && section.id.trim()
          ? section.id
          : `${Date.now()}-${index}`,
      title:
        typeof section?.title === "string" ? section.title.trim() : "",
      description:
        typeof section?.description === "string"
          ? section.description.trim()
          : "",
      image:
        typeof section?.image === "string" ? section.image.trim() : "",
      enabled: section?.enabled !== false,
      productIds: Array.isArray(section?.productIds)
        ? section.productIds.filter((id) => allowedProductIds.has(id))
        : [],
      sortOrder: index,
    }));

    const heroImage =
      typeof body.heroImage === "string" ? body.heroImage.trim() : "";

    await Promise.all([
      prisma.siteSetting.upsert({
        where: { key: getStorageKey(admin.brand) },
        update: { value: JSON.stringify(sections) },
        create: { key: getStorageKey(admin.brand), value: JSON.stringify(sections) },
      }),
      prisma.siteSetting.upsert({
        where: { key: getHeroKey(admin.brand) },
        update: { value: heroImage },
        create: { key: getHeroKey(admin.brand), value: heroImage },
      }),
    ]);

    return NextResponse.json({ success: true, sections, heroImage });
  } catch (error) {
    console.error("PUT /api/admin/storefront error:", error);
    return NextResponse.json({ success: false, error: "Failed to save store page." }, { status: 500 });
  }
}
