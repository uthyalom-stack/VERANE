import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

function extractPrimaryImage(images) {
  if (!images) return "";

  let raw = "";

  try {
    const parsed = typeof images === "string" ? JSON.parse(images) : images;
    if (Array.isArray(parsed) && parsed.length > 0) {
      raw = String(parsed[0] || "").trim();
    } else if (typeof parsed === "string") {
      raw = parsed.trim();
    }
  } catch {
    if (typeof images === "string") {
      const parts = images.split(",").map((item) => item.trim()).filter(Boolean);
      if (parts.length > 0) raw = parts[0];
    }
  }

  if (raw.startsWith("data:")) {
    return "";
  }

  return raw;
}

export async function GET(request) {
  try {
    const rawUrl = request?.url || "http://localhost:3000/api/products";
    const { searchParams } = new URL(rawUrl);
    const searchQuery = (searchParams.get("search") || searchParams.get("q") || "").trim();
    const brandParam = (searchParams.get("brand") || "").trim();
    const categoryParam = (searchParams.get("category") || "").trim();
    const limitParam = searchParams.get("limit");

    const isSearchMode = Boolean(searchQuery);

    const whereClause = {
      archivedAt: null,
    };

    if (brandParam && brandParam !== "all") {
      whereClause.brand = brandParam;
    }

    if (categoryParam && categoryParam !== "all") {
      whereClause.category = categoryParam;
    }

    if (searchQuery) {
      const tokens = searchQuery.split(/\s+/).filter(Boolean);

      if (tokens.length > 0) {
        whereClause.AND = tokens.map((token) => ({
          OR: [
            { name: { contains: token, mode: "insensitive" } },
            { description: { contains: token, mode: "insensitive" } },
            { brand: { contains: token, mode: "insensitive" } },
            { category: { contains: token, mode: "insensitive" } },
            { style: { contains: token, mode: "insensitive" } },
            { occasion: { contains: token, mode: "insensitive" } },
            { categoryRef: { name: { contains: token, mode: "insensitive" } } },
            { collection: { name: { contains: token, mode: "insensitive" } } },
          ],
        }));
      }
    }

    if (isSearchMode) {
      const limit = limitParam ? Math.max(1, parseInt(limitParam, 10)) : 5;

      const products = await prisma.product.findMany({
        where: whereClause,
        take: limit,
        orderBy: {
          createdAt: "desc",
        },
        select: {
          id: true,
          name: true,
          price: true,
          brand: true,
          category: true,
          images: true,
          inventory: true,
          preOrderEnabled: true,
        },
      });

      const lightweightProducts = products.map((product) => {
        const primaryImage = extractPrimaryImage(product.images);

        return {
          id: product.id,
          name: product.name,
          price: product.price,
          brand: product.brand,
          category: product.category,
          images: primaryImage ? [primaryImage] : [],
          inventory: Math.max(0, Number(product.inventory || 0)),
          preOrderEnabled: Boolean(product.preOrderEnabled || product.isPreOrder),
        };
      });

      return NextResponse.json(lightweightProducts);
    }

    const products = await prisma.product.findMany({
      where: whereClause,
      orderBy: {
        createdAt: "desc",
      },
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
        categoryRef: true,
        collection: true,
      },
    });

    const publicProducts = products.map((product) => {
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
        description: product.description,
        images: product.images,
        inventory: Math.max(0, Number(product.inventory || 0)),
        preOrderEnabled: Boolean(product.preOrderEnabled || product.isPreOrder),
        customSizingEnabled: Boolean(product.customSizingEnabled),
        fulfillmentTime: product.fulfillmentTime || null,
        sizeType: product.sizeType || null,
        style: product.style || null,
        occasion: product.occasion || null,
        createdAt: product.createdAt,
        categoryRef: product.categoryRef,
        collection: product.collection,
        productColors: publicColors,
        variants: publicVariants,
      };
    });

    return NextResponse.json(publicProducts);
  } catch (error) {
    console.error("GET /api/products error:", error);

    return NextResponse.json(
      {
        error: "Failed to load products.",
      },
      { status: 500 }
    );
  }
}

export async function POST() {
  return NextResponse.json(
    {
      success: false,
      error:
        "Direct product creation is disabled. Use the authorized admin product endpoint.",
    },
    { status: 403 }
  );
}
