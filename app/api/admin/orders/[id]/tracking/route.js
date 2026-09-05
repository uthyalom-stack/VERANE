import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAdminSession } from "@/lib/admin-auth";
import {
  VALID_TRACKING_STATUSES,
  normalizeBrandKey,
  getOrderPresentBrands,
} from "@/lib/order-tracking";

/**
 * Updates the authenticated admin's brand-specific tracking status for an order.
 * @param {Request} request - The request containing the tracking status.
 * @param {{ params: Promise<{ id: string }> }} context - The route context containing the order ID.
 * @return {Promise<NextResponse>} A response containing the updated tracking record or an error.
 */
export async function PUT(request, { params }) {
  try {
    const admin = await getAdminSession();

    if (!admin) {
      return NextResponse.json(
        { success: false, error: "Unauthorized." },
        { status: 401 }
      );
    }

    // SUPERADMIN is forbidden from modifying tracking controls
    if (admin.isSuperAdmin) {
      return NextResponse.json(
        { success: false, error: "Super Admin does not manage order tracking." },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Order ID is required." },
        { status: 400 }
      );
    }

    const { status } = body;

    if (!status || !VALID_TRACKING_STATUSES.includes(status)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid status. Allowed values: ${VALID_TRACKING_STATUSES.join(", ")}`,
        },
        { status: 400 }
      );
    }

    const adminBrandKey = normalizeBrandKey(admin.brand);

    if (!adminBrandKey) {
      return NextResponse.json(
        { success: false, error: "Forbidden. Admin has no valid brand." },
        { status: 403 }
      );
    }

    // Fetch the order and items to determine present brands server-side
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: true,
            collaborationProduct: {
              include: {
                productA: true,
                productB: true,
              },
            },
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json(
        { success: false, error: "Order not found." },
        { status: 404 }
      );
    }

    // Verify server-side that this order contains items belonging to admin's brand
    const presentBrands = getOrderPresentBrands(order);

    if (!presentBrands.includes(adminBrandKey)) {
      return NextResponse.json(
        {
          success: false,
          error: "Forbidden. Order does not contain products from your brand.",
        },
        { status: 403 }
      );
    }

    // Upsert tracking status strictly for admin's brand
    const trackingRecord = await prisma.orderBrandTracking.upsert({
      where: {
        orderId_brand: {
          orderId: id,
          brand: adminBrandKey,
        },
      },
      update: {
        status,
      },
      create: {
        orderId: id,
        brand: adminBrandKey,
        status,
      },
    });

    return NextResponse.json({
      success: true,
      tracking: trackingRecord,
    });
  } catch (error) {
    console.error("PUT /api/admin/orders/[id]/tracking error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update brand tracking status." },
      { status: 500 }
    );
  }
}
