import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(request) {
  try {
    const body = await request.json();

    const collectionId = body.collectionId;
    const productId = body.productId;

    if (!collectionId || !productId) {
      return NextResponse.json(
        { error: "Collection ID and Product ID are required." },
        { status: 400 }
      );
    }

    const collection = await prisma.collection.findUnique({
      where: { id: collectionId },
    });

    if (!collection) {
      return NextResponse.json(
        { error: "Collection not found." },
        { status: 404 }
      );
    }

    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      return NextResponse.json(
        { error: "Product not found." },
        { status: 404 }
      );
    }

    const updatedProduct = await prisma.product.update({
      where: { id: productId },
      data: {
        collectionId: collectionId,
      },
      include: {
        collection: true,
      },
    });

    return NextResponse.json({
      success: true,
      product: updatedProduct,
    });
  } catch (error) {
    console.error("Collection assignment failed:", error);

    return NextResponse.json(
      {
        error: "Failed to assign product to collection.",
        details: error?.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request) {
  try {
    const body = await request.json();

    const productId = body.productId;

    if (!productId) {
      return NextResponse.json(
        { error: "Product ID is required." },
        { status: 400 }
      );
    }

    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      return NextResponse.json(
        { error: "Product not found." },
        { status: 404 }
      );
    }

    await prisma.product.update({
      where: { id: productId },
      data: {
        collectionId: null,
      },
    });

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error("Collection removal failed:", error);

    return NextResponse.json(
      {
        error: "Failed to remove product from collection.",
        details: error?.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}