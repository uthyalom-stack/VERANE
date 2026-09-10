import { NextResponse } from "next/server";
import { fetchShipbubbleRates, getShipbubbleOriginAddressCode } from "@/lib/shipbubble";

/**
 * POST /api/checkout/get-shipping-rates
 *
 * Server-side endpoint to fetch courier shipping rates from Shipbubble using official v1 contract.
 * Uses real configured sender_address_code and never exposes API keys to client.
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { items, receiverAddress } = body || {};

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ success: false, error: "Cart is empty." }, { status: 400 });
    }

    if (!receiverAddress || !receiverAddress.state || !receiverAddress.city) {
      return NextResponse.json(
        { success: false, error: "Complete delivery address (State and City/LGA) is required." },
        { status: 400 }
      );
    }

    const senderAddressCode = await getShipbubbleOriginAddressCode();

    const receiver = {
      name: `${receiverAddress.firstName || ""} ${receiverAddress.lastName || ""}`.trim() || "Customer",
      phone: receiverAddress.phone || "+2348000000000",
      email: receiverAddress.email || "customer@example.com",
      address: receiverAddress.address || receiverAddress.streetAddress || "Delivery Address",
      city: receiverAddress.city,
      state: receiverAddress.state,
      country: receiverAddress.country || "Nigeria",
    };

    const packageItems = items.map((it) => ({
      name: it.name || "Apparel Item",
      description: it.selectedSize || "Standard size",
      unit_price: Math.round(Number(it.price || 0)),
      quantity: Number(it.qty || 1),
      weight: 1.0,
    }));

    const rateResult = await fetchShipbubbleRates({
      senderAddressCode,
      receiverAddress: receiver,
      packageItems,
      packageDimension: { length: 15, width: 15, height: 15 },
    });

    return NextResponse.json({
      success: true,
      requestToken: rateResult.request_token,
      couriers: rateResult.couriers,
    });
  } catch (error) {
    console.error("Get shipping rates error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Failed to calculate shipping rates.",
      },
      { status: 500 }
    );
  }
}
