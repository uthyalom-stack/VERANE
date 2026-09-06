import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const products = await prisma.product.findMany({
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

    return NextResponse.json(products);
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