import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { fetchShippingRates } from "@/lib/shipbubble";
import { getShipbubbleSenderAddress } from "@/lib/fulfillment";

/**
 * Calculates total weight and package dimensions for a list of cart items.
 * @param {Array} items - Cart items
 * @returns {{ packageItems: Array, totalWeight: number, packageDimension: { length: number, width: number, height: number } }}
 */
function calculatePackageDetails(items) {
  let totalWeight = 0;
  const packageItems = [];

  for (const item of items) {
    const qty = Number(item.qty || item.quantity || 1);
    // Standard clothing item weight ~0.5kg to 1.5kg
    const weightPerUnit = Number(item.weight || 0.8);
    const itemWeight = weightPerUnit * qty;
    totalWeight += itemWeight;

    packageItems.push({
      name: String(item.name || "VÉRANE Garment").slice(0, 50),
      description: String(item.selectedSize ? `Size: ${item.selectedSize}` : "Luxury Couture Piece").slice(0, 100),
      quantity: qty,
      weight: itemWeight,
      amount: Number(item.price || 0) * qty,
    });
  }

  // Dimension scaling based on item count
  const itemCount = items.reduce((sum, i) => sum + Number(i.qty || i.quantity || 1), 0);
  const length = Math.min(60, 20 + Math.floor(itemCount * 2));
  const width = Math.min(40, 15 + Math.floor(itemCount * 2));
  const height = Math.min(30, 10 + Math.floor(itemCount * 2));

  return {
    packageItems,
    totalWeight: Math.max(0.5, totalWeight),
    packageDimension: { length, width, height },
  };
}

/**
 * Fetch live Shipbubble shipping rates for customer checkout.
 * Endpoint: POST /api/checkout/get-shipping-rates
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { items, firstName, lastName, email, phone, address, state, city, country } = body || {};

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ success: false, error: "Cart is empty." }, { status: 400 });
    }

    if (!address || !state || !city) {
      return NextResponse.json(
        { success: false, error: "Complete address, state, and city are required to calculate delivery rates." },
        { status: 400 }
      );
    }

    // 1. Resolve Shipbubble sender address
    const shipFrom = await getShipbubbleSenderAddress();

    // 2. Construct recipient details
    const fullRecipientAddress = `${address}, ${city}, ${state}, ${country || "Nigeria"}`;
    const shipTo = {
      name: `${firstName || "Customer"} ${lastName || ""}`.trim(),
      email: email || "checkout@verane.com",
      phone: phone || "+2348000000000",
      address: fullRecipientAddress,
    };

    // 3. Compute package details
    const { packageItems, packageDimension } = calculatePackageDetails(items);

    // 4. Call Shipbubble API
    const result = await fetchShippingRates({
      shipFrom,
      shipTo,
      packageItems,
      packageDimension,
    });

    if (!result.success || !result.data) {
      throw new Error("Failed to retrieve shipping rates from Shipbubble.");
    }

    const requestToken = result.data.request_token;
    const rawCouriers = Array.isArray(result.data.couriers) ? result.data.couriers : [];

    // Normalize courier options for frontend UI
    const couriers = rawCouriers.map((c) => {
      // rate_card_amount is customer fee, total is wallet charge
      const customerPrice = Number(c.rate_card_amount || c.total || 0);
      const walletCost = Number(c.total || c.rate_card_amount || 0);

      return {
        courierId: String(c.courier_id),
        courierName: c.courier_name || "Standard Courier",
        serviceCode: c.service_code || "std",
        serviceType: c.service_type || "Express Delivery",
        customerPrice,
        walletCost,
        deliveryEta: c.delivery_eta || "2 - 4 Business Days",
        pickupEta: c.pickup_eta || "Same Day Pickup",
      };
    });

    return NextResponse.json({
      success: true,
      requestToken,
      couriers,
    });
  } catch (error) {
    console.error("POST /api/checkout/get-shipping-rates error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to calculate live shipping rates.",
      },
      { status: 500 }
    );
  }
}
