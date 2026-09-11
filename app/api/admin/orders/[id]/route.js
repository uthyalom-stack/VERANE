import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAdminSession } from "@/lib/admin-auth";

/**
 * Retrieves an order and its related product details for an authenticated admin.
 * @returns {Promise<Response>} The order details, or an error response if access is denied or the order cannot be found.
 */
export async function GET(request, { params }) {
  try {
    const admin = await getAdminSession();

    if (!admin) {
      return NextResponse.json(
        { success: false, error: "Unauthorized." },
        { status: 401 }
      );
    }

    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Order ID is required." },
        { status: 400 }
      );
    }

    // Define brand authorization filter for order items
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

    const orderWhereClause = admin.isSuperAdmin
      ? { id }
      : {
          id,
          items: {
            some: brandItemWhereClause,
          },
        };

    const order = await prisma.order.findFirst({
      where: orderWhereClause,
      include: {
        user: true,
        brandTrackings: true,
        items: {
          where: brandItemWhereClause,
          include: {
            product: true,
            variant: {
              include: {
                color: true,
              },
            },
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
    });

    if (!order) {
      return NextResponse.json(
        { success: false, error: "Order not found." },
        { status: 404 }
      );
    }

    const { getOrderBrandTrackingInfo } = await import("@/lib/order-tracking");
    const brandTrackingsInfo = getOrderBrandTrackingInfo(order);

    return NextResponse.json({
      success: true,
      order: {
        ...order,
        brandTrackingsInfo,
      },
    });
  } catch (error) {
    console.error("GET /api/admin/orders/[id] error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch order details." },
      { status: 500 }
    );
  }
}

export async function PUT(request, { params }) {
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

    if (admin.isSuperAdmin) {
      return NextResponse.json(
        {
          success: false,
          error: "Super Admin does not manage store orders.",
        },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: "Order ID is required.",
        },
        { status: 400 }
      );
    }

    if (!body.status) {
      return NextResponse.json(
        {
          success: false,
          error: "Order status is required.",
        },
        { status: 400 }
      );
    }

    const brandItemWhereClause = {
      OR: [
        { product: { brand: admin.brand } },
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

    const existingOrder = await prisma.order.findFirst({
      where: {
        id,
        items: {
          some: brandItemWhereClause,
        },
      },
      include: {
        items: {
          where: brandItemWhereClause,
          include: {
            product: true,
          },
        },
      },
    });

    if (!existingOrder) {
      return NextResponse.json(
        {
          success: false,
          error: "Order not found.",
        },
        { status: 404 }
      );
    }

    const order = await prisma.order.update({
      where: {
        id,
      },
      data: {
        status: body.status,
      },
      include: {
        user: true,
        items: {
          where: brandItemWhereClause,
          include: {
            product: true,
          },
        },
      },
    });

    return NextResponse.json(order);
  } catch (error) {
    console.error(
      "PUT /api/admin/orders/[id] error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Failed to update order.",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
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

    if (admin.isSuperAdmin) {
      return NextResponse.json(
        {
          success: false,
          error: "Super Admin does not manage store orders.",
        },
        { status: 403 }
      );
    }

    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: "Order ID is required.",
        },
        { status: 400 }
      );
    }

    const brandItemWhereClause = {
      OR: [
        { product: { brand: admin.brand } },
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

    const existingOrder = await prisma.order.findFirst({
      where: {
        id,
        items: {
          some: brandItemWhereClause,
        },
      },
      select: {
        id: true,
      },
    });

    if (!existingOrder) {
      return NextResponse.json(
        {
          success: false,
          error: "Order not found.",
        },
        { status: 404 }
      );
    }

    await prisma.order.delete({
      where: {
        id,
      },
    });

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error(
      "DELETE /api/admin/orders/[id] error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Failed to delete order.",
      },
      { status: 500 }
    );
  }
}
