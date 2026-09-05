import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAdminSession } from "@/lib/admin-auth";

/**
 * Retrieves orders available to the authenticated administrator.
 *
 * Super administrators can access all orders; other administrators receive orders
 * associated with their brand, including applicable collaboration products, with
 * item lists scoped strictly to their brand.
 *
 * @return {Promise<NextResponse>} A response containing the orders, or an error response when authentication or retrieval fails.
 */
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

    const brandItemWhereClause = admin.isSuperAdmin
      ? undefined
      : {
          OR: [
            {
              product: {
                brand: admin.brand,
              },
            },
            {
              collaborationProduct: {
                OR: [
                  { productA: { brand: admin.brand } },
                  { productB: { brand: admin.brand } },
                ],
              },
            },
          ],
        };

    const whereClause = admin.isSuperAdmin
      ? {}
      : {
          items: {
            some: brandItemWhereClause,
          },
        };

    try {
      const orders = await prisma.order.findMany({
        where: whereClause,
        include: {
          user: true,
          brandTrackings: true,
          items: {
            where: brandItemWhereClause,
            include: {
              product: true,
              variant: true,
              collaborationProduct: {
                include: {
                  productA: true,
                  productB: true,
                },
              },
              collaborationVariant: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      const { getOrderBrandTrackingInfo } = await import("@/lib/order-tracking");

      const ordersWithTracking = orders.map((order) => ({
        ...order,
        brandTrackingsInfo: getOrderBrandTrackingInfo(order),
      }));

      return NextResponse.json(ordersWithTracking);
    } catch (dbError) {
      console.error("GET /api/admin/orders DB error:", dbError);
      return NextResponse.json(
        {
          success: false,
          error: "Failed to load orders from database.",
        },
        { status: 500 }
      );
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
