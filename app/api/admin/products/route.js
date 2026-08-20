import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAdminSession } from "@/lib/admin-auth";

export async function GET() {
  try {
    const admin = await getAdminSession();

    if (!admin) {
      return NextResponse.json(
        { success: false, error: "Unauthorized." },
        { status: 401 }
      );
    }

    if (admin.isSuperAdmin) {
      return NextResponse.json(
        {
          success: false,
          error: "Super Admin does not manage store products.",
        },
        { status: 403 }
      );
    }

    const products = await prisma.product.findMany({
      where: {
        brand: admin.brand,
      },
      include: {
        categoryRef: true,
        collection: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(products);
  } catch (error) {
    console.error("GET /api/admin/products error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to load products.",
      },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const admin = await getAdminSession();

    if (!admin) {
      return NextResponse.json(
        { success: false, error: "Unauthorized." },
        { status: 401 }
      );
    }

    if (admin.isSuperAdmin) {
      return NextResponse.json(
        {
          success: false,
          error: "Super Admin cannot create store products.",
        },
        { status: 403 }
      );
    }

    const body = await request.json();

    const name =
      typeof body.name === "string"
        ? body.name.trim()
        : "";

    const categoryInput =
      typeof body.category === "string"
        ? body.category.trim()
        : "";

    if (!name) {
      return NextResponse.json(
        {
          success: false,
          error: "Product name is required.",
        },
        { status: 400 }
      );
    }

    if (!categoryInput) {
      return NextResponse.json(
        {
          success: false,
          error: "Product category is required.",
        },
        { status: 400 }
      );
    }

    const category = await prisma.category.findFirst({
      where: {
        brand: admin.brand,
        enabled: true,
        OR: [
          { id: categoryInput },
          { slug: categoryInput },
          { name: categoryInput },
        ],
      },
    });

    if (!category) {
      return NextResponse.json(
        {
          success: false,
          error: "That category does not belong to your store.",
        },
        { status: 400 }
      );
    }

    const product = await prisma.product.create({
      data: {
        name,
        brand: admin.brand,
        category: category.slug,
        categoryId: category.id,
        price: Number(body.price),
        description:
          typeof body.description === "string"
            ? body.description.trim()
            : "",
        images: JSON.stringify(
          Array.isArray(body.images) ? body.images : []
        ),
        inventory: Number(body.inventory) || 0,
        colors: Array.isArray(body.colors)
          ? JSON.stringify(body.colors)
          : null,
        style:
          typeof body.style === "string"
            ? body.style.trim()
            : "",
        occasion:
          typeof body.occasion === "string"
            ? body.occasion.trim()
            : "",
        outfitLayer: body.outfitLayer || "none",
        outfitCompatible: Boolean(body.outfitCompatible),
        mannequinAsset: body.mannequinAsset || null,
      },
      include: {
        categoryRef: true,
        collection: true,
      },
    });

    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    console.error("POST /api/admin/products error:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error?.message || "Failed to create product.",
      },
      { status: 500 }
    );
  }
}