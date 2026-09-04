import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyPaystackWebhookSignature, finalizePaystackOrder } from "@/lib/paystack";

/**
 * Handles Paystack webhook events for charge.success notifications and finalizes orders.
 * @param {Request} request - The Next.js request object with webhook payload and signature header.
 * @returns {Promise<NextResponse>} JSON response confirming receipt or error details.
 */
export async function POST(request) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("x-paystack-signature") || "";

    // 1. Verify Paystack HMAC SHA512 signature
    const isValid = verifyPaystackWebhookSignature(rawBody, signature);

    if (!isValid) {
      return NextResponse.json({ success: false, error: "Invalid webhook signature." }, { status: 401 });
    }

    const payload = JSON.parse(rawBody);
    const event = payload.event;
    const data = payload.data;

    // 2. Handle charge.success event
    if (event === "charge.success") {
      const reference = data?.reference;

      if (!reference) {
        return NextResponse.json({ success: true, message: "No reference found in event payload." });
      }

      // Delegate order finalization to centralized idempotent helper
      await finalizePaystackOrder({ reference, txData: data });
    }

    return NextResponse.json({ success: true, received: true });
  } catch (error) {
    console.error("Paystack webhook error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Webhook handler failed." },
      { status: 500 }
    );
  }
}
