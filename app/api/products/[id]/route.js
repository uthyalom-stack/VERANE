import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();

    const product = await prisma.product.update({
      where: { id },
      data: {
        name: body.name,
        brand: body.brand,
        category: body.category,
        price: Number(body.price),
        description: body.description || "",
        inventory: Number(body.inventory) || 0,
        images: JSON.stringify(body.images || []),
        colors: body.colors
          ? JSON.stringify(body.colors)
          : null,
        style: body.style || "",
        occasion: body.occasion || "",
        outfitLayer: body.outfitLayer || "none",
        outfitCompatible: Boolean(body.outfitCompatible),
        mannequinAsset: body.mannequinAsset || null,
      },
    });

    return NextResponse.json(product);
  } catch (error) {
    console.error("PUT /api/products/[id] error:", error);

    return NextResponse.json(
      { error: error?.message || "Failed to update product." },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;

    await prisma.product.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/products/[id] error:", error);

    return NextResponse.json(
      { error: error?.message || "Failed to delete product." },
      { status: 500 }
    );
  }
}