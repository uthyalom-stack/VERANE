import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAdminSession } from "@/lib/admin-auth";

export async function POST(request) {
  try {
    const admin = await getAdminSession();

    if (!admin) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    if (admin.isSuperAdmin) {
      return NextResponse.json(
        { error: "Super Admin does not manage store collection assignments." },
        { status: 403 }
      );
    }

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

    if (collection.brand !== admin.brand) {
      return NextResponse.json(
        { error: "Collection belongs to another brand." },
        { status: 403 }
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

    if (product.brand !== admin.brand) {
      return NextResponse.json(
        { error: "Product belongs to another brand." },
        { status: 403 }
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
    const admin = await getAdminSession();

    if (!admin) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    if (admin.isSuperAdmin) {
      return NextResponse.json(
        { error: "Super Admin does not manage store collection assignments." },
        { status: 403 }
      );
    }

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

    if (product.brand !== admin.brand) {
      return NextResponse.json(
        { error: "Product belongs to another brand." },
        { status: 403 }
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
