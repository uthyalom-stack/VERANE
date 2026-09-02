import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAdminSession } from "@/lib/admin-auth";

export async function GET() {
  try {
    const admin = await getAdminSession();

    if (!admin) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized.",
        },
        { status: 401 }
      );
    }

    const whereClause = admin.isSuperAdmin
      ? {}
      : {
          OR: [
            {
              items: {
                some: {
                  product: {
                    brand: admin.brand,
                  },
                },
              },
            },
            {
              items: {
                some: {
                  collaborationProduct: {
                    OR: [
                      { productA: { brand: admin.brand } },
                      { productB: { brand: admin.brand } },
                    ],
                  },
                },
              },
            },
          ],
        };

    try {
      const orders = await prisma.order.findMany({
        where: whereClause,
        include: {
          user: true,
          items: {
            include: {
              product: true,
              variant: true,
              collaborationProduct: true,
              collaborationVariant: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      return NextResponse.json(orders);
    } catch (dbError) {
      console.warn("GET /api/admin/orders DB query warning:", dbError.message);
      return NextResponse.json([]);
    }
  } catch (error) {
    console.error(
      "GET /api/admin/orders auth error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch orders.",
      },
      { status: 500 }
    );
  }
}