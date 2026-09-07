import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request?.url || "http://localhost");
    const pageParam = searchParams.get("page");
    const limitParam = searchParams.get("limit");
    const brandParam = searchParams.get("brand");
    const searchParam = searchParams.get("search") || searchParams.get("q") || "";

    const queryOptions = {
      where: {
        archivedAt: null,
      },
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
    };

    if (brandParam && brandParam !== "all") {
      queryOptions.where.brand = brandParam;
    }

    const trimmedSearch = searchParam.trim();
    if (trimmedSearch) {
      queryOptions.where.OR = [
        { name: { contains: trimmedSearch, mode: "insensitive" } },
        { category: { contains: trimmedSearch, mode: "insensitive" } },
        { brand: { contains: trimmedSearch, mode: "insensitive" } },
        { description: { contains: trimmedSearch, mode: "insensitive" } },
      ];
    }

    if (pageParam || limitParam || trimmedSearch) {
      const page = Math.max(1, Number(pageParam) || 1);
      const defaultLimit = trimmedSearch ? 8 : 16;
      const limit = Math.max(1, Math.min(100, Number(limitParam) || defaultLimit));
      queryOptions.skip = (page - 1) * limit;
      queryOptions.take = limit;
    }

    const products = await prisma.product.findMany(queryOptions);

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
        preOrderEnabled: Boolean(product.preOrderEnabled),
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