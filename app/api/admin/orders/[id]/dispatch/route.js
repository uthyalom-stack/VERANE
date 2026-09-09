import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAdminSession } from "@/lib/admin-auth";
import { createShipment, fetchShippingRates, getShipments } from "@/lib/shipbubble";
import { getShipbubbleSenderAddress } from "@/lib/fulfillment";

/**
 * Endpoint for manual admin dispatch & waybill label generation.
 * Route: POST /api/admin/orders/[id]/dispatch
 */
export async function POST(request, { params }) {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized." }, { status: 401 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ success: false, error: "Order ID is required." }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const { authorizeRateIncrease } = body;

    // 1. Fetch Order and items
    const order = await prisma.order.findUnique({
      where: { id },
      include: { items: { include: { product: true } } },
    });

    if (!order) {
      return NextResponse.json({ success: false, error: "Order not found." }, { status: 404 });
    }

    // 2. Validate Order eligibility for dispatch
    if ((order.fulfillmentMethod || "DELIVERY").toUpperCase() !== "DELIVERY") {
      return NextResponse.json(
        { success: false, error: "Cannot dispatch pickup orders via Shipbubble." },
        { status: 400 }
      );
    }

    if (order.paymentStatus !== "paid") {
      return NextResponse.json(
        { success: false, error: "Only paid orders can be dispatched." },
        { status: 400 }
      );
    }

    // IDEMPOTENCY CHECK 1: Already generated
    if (order.shipbubbleOrderId || order.fulfillmentStatus === "DISPATCHED") {
      return NextResponse.json(
        {
          success: true,
          alreadyDispatched: true,
          shipbubbleOrderId: order.shipbubbleOrderId,
          shipbubbleTrackingCode: order.shipbubbleTrackingCode,
          shipbubbleWaybillUrl: order.shipbubbleWaybillUrl,
        },
        { status: 200 }
      );
    }

    // IDEMPOTENCY CHECK 2: Reconcile in-flight requests against Shipbubble labels
    try {
      const existingLabelsRes = await getShipments({ limit: 50 });
      const labels = Array.isArray(existingLabelsRes.data) ? existingLabelsRes.data : [];
      const matched = labels.find(
        (l) =>
          l.order_id &&
          (l.order_id === order.orderNumber || l.order_id === order.id || l.order_id === order.shipbubbleOrderId)
      );

      if (matched) {
        const updated = await prisma.order.update({
          where: { id: order.id },
          data: {
            shipbubbleOrderId: matched.order_id,
            shipbubbleTrackingCode: matched.tracking_code || matched.tracking_number,
            shipbubbleWaybillUrl: matched.waybill_document || matched.label_url,
            fulfillmentStatus: "DISPATCHED",
            shippedAt: new Date(),
          },
        });

        return NextResponse.json({
          success: true,
          reconciled: true,
          order: updated,
        });
      }
    } catch (recErr) {
      console.warn("Shipbubble reconciliation check failed:", recErr.message);
    }

    // Lock in-flight dispatch
    await prisma.order.update({
      where: { id: order.id },
      data: { fulfillmentStatus: "DISPATCH_PENDING" },
    });

    let rateTokenToUse = order.shipbubbleRateToken;
    let courierIdToUse = order.shippingCourierId;
    let serviceCodeToUse = order.shippingCourierCode;

    // 3. Attempt shipment label creation with stored token
    try {
      const shipmentRes = await createShipment({
        requestToken: rateTokenToUse,
        serviceCode: serviceCodeToUse,
        courierId: courierIdToUse,
      });

      const labelData = shipmentRes.data || {};
      const actualCost = Number(labelData.total || order.shipbubbleQuotedCost || order.shippingFee);

      const updatedOrder = await prisma.order.update({
        where: { id: order.id },
        data: {
          shipbubbleOrderId: labelData.order_id || `SB-${Date.now()}`,
          shipbubbleTrackingCode: labelData.tracking_code || labelData.tracking_number || null,
          shipbubbleWaybillUrl: labelData.waybill_document || labelData.label_url || null,
          courierActualCost: actualCost,
          fulfillmentStatus: "DISPATCHED",
          status: "shipped",
          shippedAt: new Date(),
        },
      });

      return NextResponse.json({
        success: true,
        order: updatedOrder,
      });
    } catch (shipErr) {
      console.warn("Shipment creation with stored token failed:", shipErr.message);

      // RATE EXPIRATION / RATE SHIFT HANDLING
      const shipFrom = await getShipbubbleSenderAddress();
      const freshRatesRes = await fetchShippingRates({
        shipFrom,
        shipTo: {
          name: `${order.firstName || "Customer"} ${order.lastName || ""}`.trim(),
          email: order.email || "checkout@verane.com",
          phone: order.phone || "+2348000000000",
          address: `${order.address}, ${order.city}, ${order.state}, ${order.country || "Nigeria"}`,
        },
        packageItems: order.items.map((i) => ({
          name: String(i.product?.name || "VÉRANE Garment").slice(0, 50),
          quantity: Number(i.quantity || 1),
          amount: Number(i.price || 0) * Number(i.quantity || 1),
        })),
      });

      const newCouriers = Array.isArray(freshRatesRes.data?.couriers) ? freshRatesRes.data.couriers : [];
      const matchedNewCourier = newCouriers.find((c) => String(c.courier_id) === String(courierIdToUse));

      if (!matchedNewCourier) {
        await prisma.order.update({
          where: { id: order.id },
          data: { fulfillmentStatus: "DISPATCH_FAILED" },
        });

        return NextResponse.json(
          {
            success: false,
            error: "Selected courier is no longer available for this destination. Please re-select a courier.",
          },
          { status: 422 }
        );
      }

      const newWalletCost = Number(matchedNewCourier.total || matchedNewCourier.rate_card_amount || 0);
      const originalQuotedCost = Number(order.shipbubbleQuotedCost || order.shippingFee);

      if (newWalletCost > originalQuotedCost && !authorizeRateIncrease) {
        await prisma.order.update({
          where: { id: order.id },
          data: { fulfillmentStatus: "DISPATCH_FAILED" },
        });

        return NextResponse.json(
          {
            success: false,
            rateIncreased: true,
            originalCost: originalQuotedCost,
            newCost: newWalletCost,
            difference: newWalletCost - originalQuotedCost,
            error: `Courier cost increased from ₦${originalQuotedCost.toLocaleString()} to ₦${newWalletCost.toLocaleString()}. Explicit admin authorization required.`,
          },
          { status: 409 }
        );
      }

      // Retry shipment creation with new fresh rate token
      const retryShipment = await createShipment({
        requestToken: freshRatesRes.data.request_token,
        serviceCode: matchedNewCourier.service_code || serviceCodeToUse,
        courierId: courierIdToUse,
      });

      const retryLabelData = retryShipment.data || {};

      const finalOrder = await prisma.order.update({
        where: { id: order.id },
        data: {
          shipbubbleRateToken: freshRatesRes.data.request_token,
          shipbubbleOrderId: retryLabelData.order_id || `SB-${Date.now()}`,
          shipbubbleTrackingCode: retryLabelData.tracking_code || retryLabelData.tracking_number || null,
          shipbubbleWaybillUrl: retryLabelData.waybill_document || retryLabelData.label_url || null,
          courierActualCost: newWalletCost,
          fulfillmentStatus: "DISPATCHED",
          status: "shipped",
          shippedAt: new Date(),
        },
      });

      return NextResponse.json({
        success: true,
        rateShiftAccepted: true,
        order: finalOrder,
      });
    }
  } catch (error) {
    console.error("POST /api/admin/orders/[id]/dispatch error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to dispatch shipment.",
      },
      { status: 500 }
    );
  }
}
