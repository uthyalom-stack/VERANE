import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyPaystackTransaction, finalizePaystackOrder } from "@/lib/paystack";

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const reference = searchParams.get("reference") || searchParams.get("trxref");

  if (!reference) {
    return NextResponse.redirect(`${origin}/checkout?error=No+payment+reference+supplied`);
  }

  try {
    // 1. Fetch order for reference
    const existingOrder = await prisma.order.findUnique({
      where: { paymentReference: reference },
    });

    if (!existingOrder) {
      return NextResponse.redirect(`${origin}/checkout?error=Order+not+found`);
    }

    // Idempotency check: if already confirmed/paid, redirect immediately to order confirmation
    if (existingOrder.paymentStatus === "paid") {
      return NextResponse.redirect(`${origin}/orders?order=${existingOrder.orderNumber}`);
    }

    // 2. Perform server-side transaction verification with Paystack API
    const txData = await verifyPaystackTransaction(reference);

    // 3. Delegate to centralized idempotent payment finalization
    const result = await finalizePaystackOrder({ reference, txData });

    return NextResponse.redirect(`${origin}/orders?order=${result.order.orderNumber}&paid=true`);
  } catch (error) {
    console.error("Paystack callback verification error:", error);
    return NextResponse.redirect(`${origin}/checkout?error=${encodeURIComponent(error?.message || "Payment verification failed")}`);
  }
}
