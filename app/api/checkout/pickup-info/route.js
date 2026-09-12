import { NextResponse } from "next/server";
import { getPickupDetailsForCart } from "@/lib/pickup-resolver";

export async function POST(request) {
  try {
    const body = await request.json();
    const { items } = body || {};

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ success: false, error: "Cart is empty." }, { status: 400 });
    }

    const pickupDetails = await getPickupDetailsForCart(items);

    return NextResponse.json({
      success: true,
      ...pickupDetails,
    });
  } catch (error) {
    console.error("Get pickup info error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to load pickup information." },
      { status: 500 }
    );
  }
}
