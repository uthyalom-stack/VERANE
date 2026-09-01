import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const collaborations = await prisma.collaboration.findMany({
      where: {
        status: "active",
      },
      include: {
        products: {
          where: {
            status: "published",
          },
          include: {
            productA: {
              include: {
                productColors: true,
                variants: true,
              },
            },
            productB: {
              include: {
                productColors: true,
                variants: true,
              },
            },
            variants: {
              include: {
                productAVariant: {
                  include: {
                    color: true,
                  },
                },
                productBVariant: {
                  include: {
                    color: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    return NextResponse.json({
      success: true,
      collaborations,
    });
  } catch (error) {
    console.error("GET /api/collaborations error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to load active collaborations.",
      },
      { status: 500 }
    );
  }
}
