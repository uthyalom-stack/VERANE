import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAdminSession } from "@/lib/admin-auth";
import { generateShipbubbleLabel } from "@/lib/shipbubble";

export async function POST(request, { params }) {
  try {
    const admin = await getAdminSession();
    if (!admin) {
      return NextResponse.json({ success: false, error: "Unauthorized." }, { status: 401 });
    }

    if (admin.isSuperAdmin) {
      return NextResponse.json({ success: false, error: "Forbidden: Superadmin does not manage order fulfillment." }, { status: 403 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ success: false, error: "Order ID is required." }, { status: 400 });
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

    const order = await prisma.order.findFirst({
      where: {
        id,
        items: {
          some: brandItemWhereClause,
        },
      },
      include: {
        fulfillment: true,
      },
    });

    if (!order) {
      return NextResponse.json({ success: false, error: "Order not found or unauthorized." }, { status: 404 });
    }

    const fulfillment = order.fulfillment;
    if (!fulfillment) {
      return NextResponse.json({ success: false, error: "No fulfillment record found for this order." }, { status: 400 });
    }

    if (fulfillment.fulfillmentType !== "delivery") {
      return NextResponse.json({ success: false, error: "Waybill generation is only applicable for delivery orders." }, { status: 400 });
    }

    if (fulfillment.waybillNumber) {
      return NextResponse.json({
        success: true,
        alreadyGenerated: true,
        waybillNumber: fulfillment.waybillNumber,
        labelUrl: fulfillment.labelUrl,
        trackingUrl: fulfillment.trackingUrl,
      });
    }

    const waybillRes = await generateShipbubbleLabel({
      requestToken: fulfillment.rateToken || "",
      serviceCode: fulfillment.serviceCode || "standard",
      courierId: fulfillment.courierId || "courier_default",
    });

    if (!waybillRes.success || !waybillRes.waybill_number) {
      throw new Error("Failed to generate waybill from Shipbubble.");
    }

    const now = new Date();

    const updatedFulfillment = await prisma.orderFulfillment.update({
      where: { id: fulfillment.id },
      data: {
        waybillNumber: waybillRes.waybill_number,
        labelUrl: waybillRes.label_url,
        trackingUrl: waybillRes.tracking_url,
        waybillGeneratedAt: now,
        fulfillmentStatus: "unfulfilled", // Generating waybill does not mark order as fulfilled
      },
    });

    await prisma.order.update({
      where: { id: order.id },
      data: {
        status: "shipped",
      },
    });

    return NextResponse.json({
      success: true,
      waybillNumber: updatedFulfillment.waybillNumber,
      labelUrl: updatedFulfillment.labelUrl,
      trackingUrl: updatedFulfillment.trackingUrl,
      waybillGeneratedAt: updatedFulfillment.waybillGeneratedAt,
    });
  } catch (error) {
    console.error("Generate waybill error:", error);
    return NextResponse.json(
      { success: false, error: "Unable to generate the shipping label. Please try again." },
      { status: 500 }
    );
  }
}
