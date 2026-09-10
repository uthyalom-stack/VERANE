import { NextResponse } from "next/server";
import { getPickupDetailsForCart } from "@/lib/pickup-resolver";

/**
 * POST /api/checkout/pickup-info
 *
 * Server-side endpoint to resolve pickup location, immediate pickup availability,
 * and available pickup dates for a cart without invoking Shipbubble.
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { items } = body || {};

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ success: false, error: "Cart is empty." }, { status: 400 });
    }

    const details = await getPickupDetailsForCart(items);

    return NextResponse.json({
      success: true,
      ...details,
    });
  } catch (error) {
    console.error("Get pickup info error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to resolve pickup information.",
      },
      { status: 500 }
    );
  }
}
