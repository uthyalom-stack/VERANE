import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const products = await prisma.product.findMany({
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(products);
  } catch (error) {
    console.error("GET /api/products error:", error);

    return NextResponse.json(
      {
        error: error?.message || "Failed to load products",
      },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();

    console.log("Creating product:", body);

    const product = await prisma.product.create({
      data: {
        name: body.name,
        brand: body.brand,
        category: body.category,
        price: Number(body.price),
        description: body.description || "",
        images: JSON.stringify(body.images || []),
        inventory: Number(body.inventory) || 0,
        colors: body.colors ? JSON.stringify(body.colors) : null,
        style: body.style || "",
        occasion: body.occasion || "",
        outfitLayer: body.outfitLayer || "none",
        outfitCompatible: body.outfitCompatible || false,
        mannequinAsset: body.mannequinAsset || null,
      },
    });

    return NextResponse.json(product);
  } catch (error) {
    console.error("POST /api/products error:", error);

    return NextResponse.json(
      {
        error: error?.message || "Failed to create product",
      },
      { status: 500 }
    );
  }
}