import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAdminSession } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

const VALID_BRANDS = ["UTHY", "ALOMZIEE"];

function normalizeBrand(value) {
  if (!value) return "";
  const brand = String(value).trim().toUpperCase();
  if (brand === "UTHY" || brand === "UTHY_LUXURY") return "UTHY";
  if (brand === "ALOMZIEE" || brand === "ALOMZIEE_FOOTIES") return "ALOMZIEE";
  return brand;
}

export async function GET() {
  try {
    const admin = await getAdminSession();
    if (!admin) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const brand = normalizeBrand(admin.brand || admin.role);
    if (!VALID_BRANDS.includes(brand)) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
    }

    // Static Destinations
    const staticDestinations = [
      { label: "Homepage", value: "/" },
      { label: `${brand} Storefront`, value: `/storefront/${brand.toLowerCase()}` },
      { label: "All Catalog Products", value: "/catalog" },
      { label: "Shopping Cart", value: "/cart" },
    ];

    // Categories for Brand
    const categories = await prisma.category.findMany({
      where: { brand, enabled: true },
      select: { id: true, name: true, slug: true },
      orderBy: { name: "asc" },
    });

    const categoryDestinations = categories.map((c) => ({
      label: c.name,
      value: `/catalog?category=${c.slug}`,
    }));

    // Collections for Brand
    const collections = await prisma.collection.findMany({
      where: { brand, enabled: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });

    const collectionDestinations = collections.map((col) => ({
      label: col.name,
      value: `/catalog?collection=${col.id}`,
    }));

    // Products for Brand
    const products = await prisma.product.findMany({
      where: { brand },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
      take: 100,
    });

    const productDestinations = products.map((p) => ({
      label: p.name,
      value: `/product/${p.id}`,
    }));

    return NextResponse.json({
      success: true,
      brand,
      destinations: {
        static: staticDestinations,
        categories: categoryDestinations,
        collections: collectionDestinations,
        products: productDestinations,
      },
    });
  } catch (error) {
    console.error("GET marketing destinations error:", error);
    return NextResponse.json({ success: false, error: "Failed to load destinations" }, { status: 500 });
  }
}
