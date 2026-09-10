import { NextResponse } from "next/server";
import { fetchShipbubbleRates } from "@/lib/shipbubble";

/**
 * POST /api/checkout/get-shipping-rates
 *
 * Server-side endpoint to fetch courier shipping rates from Shipbubble.
 * Never exposes API keys or internal secrets to client.
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { items, receiverAddress, senderAddress } = body || {};

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ success: false, error: "Cart is empty." }, { status: 400 });
    }

    if (!receiverAddress || !receiverAddress.state || !receiverAddress.city) {
      return NextResponse.json(
        { success: false, error: "Complete delivery address (State and City/LGA) is required." },
        { status: 400 }
      );
    }

    // Default sender address to Lagos, Nigeria if not explicitly provided
    const sender = senderAddress || {
      name: "VÉRANE Atelier",
      phone: "+2348000000000",
      email: "orders@verane.com",
      address: "Victoria Island",
      city: "Lagos",
      state: "Lagos",
      country: "Nigeria",
    };

    const receiver = {
      name: `${receiverAddress.firstName || ""} ${receiverAddress.lastName || ""}`.trim() || "Customer",
      phone: receiverAddress.phone || "+2348000000000",
      email: receiverAddress.email || "customer@example.com",
      address: receiverAddress.address || receiverAddress.streetAddress || "Delivery Address",
      city: receiverAddress.city,
      state: receiverAddress.state,
      country: receiverAddress.country || "Nigeria",
    };

    const rateResult = await fetchShipbubbleRates({
      senderAddress: sender,
      receiverAddress: receiver,
      parcels: [
        {
          weight: Math.max(1, items.reduce((sum, item) => sum + Number(item.qty || item.quantity || 1), 0)),
          length: 15,
          width: 15,
          height: 15,
        },
      ],
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
