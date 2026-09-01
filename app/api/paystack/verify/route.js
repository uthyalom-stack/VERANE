import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyPaystackTransaction } from "@/lib/paystack";

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const reference = searchParams.get("reference") || searchParams.get("trxref");

  if (!reference) {
    return NextResponse.redirect(`${origin}/checkout?error=No+payment+reference+supplied`);
  }

  try {
    // 1. Find order in DB
    const existingOrder = await prisma.order.findUnique({
      where: { paymentReference: reference },
      include: { items: true },
    });

    if (!existingOrder) {
      return NextResponse.redirect(`${origin}/checkout?error=Order+not+found`);
    }

    // Idempotency check: if already confirmed/paid, redirect immediately to order confirmation page
    if (existingOrder.paymentStatus === "paid") {
      return NextResponse.redirect(`${origin}/orders?order=${existingOrder.orderNumber}`);
    }

    // 2. Perform server-side transaction verification with Paystack API
    const txData = await verifyPaystackTransaction(reference);

    if (txData.status !== "success") {
      await prisma.order.update({
        where: { id: existingOrder.id },
        data: {
          paymentStatus: "failed",
          status: "cancelled",
        },
      });

      return NextResponse.redirect(`${origin}/checkout?error=Payment+was+not+successful`);
    }

    // 3. Payment confirmed! Parse pending checkout data to create order items
    let checkoutData = {};
    try {
      if (existingOrder.pendingCheckoutData) {
        checkoutData = JSON.parse(existingOrder.pendingCheckoutData);
      }
    } catch {
      checkoutData = {};
    }

    const items = Array.isArray(checkoutData.items) ? checkoutData.items : [];

    // Confirm order in transaction
    await prisma.$transaction(async (tx) => {
      // Create order items if not already created
      if (items.length > 0 && existingOrder.items.length === 0) {
        await tx.orderItem.createMany({
          data: items.map((item) => ({
            orderId: existingOrder.id,
            productId: item.isCollaboration ? item.productAId : item.id,
            quantity: Number(item.qty || 1),
            price: Number(item.price || 0),
            selectedColor: item.selectedColor || null,
            selectedColorHex: item.selectedColorHex || null,
            selectedSize: item.selectedSize || null,
            variantId: item.variantId || null,
            collaborationProductId: item.collaborationProductId || null,
            collaborationVariantId: item.collaborationVariantId || null,
            customMeasurements: item.customSizing || null,
          })),
        });

        // Decrement stock for variants / products
        for (const item of items) {
          const qty = Number(item.qty || 1);

          if (item.variantId) {
            await tx.productVariant.updateMany({
              where: { id: item.variantId },
              data: { stock: { decrement: qty } },
            });
          }

          if (item.id && !item.isCollaboration) {
            await tx.product.updateMany({
              where: { id: item.id },
              data: { inventory: { decrement: qty } },
            });
          }
        }
      }

      // Update Order status
      await tx.order.update({
        where: { id: existingOrder.id },
        data: {
          paymentStatus: "paid",
          status: "processing",
          paymentMethod: txData.channel || "card",
          paidAt: txData.paid_at ? new Date(txData.paid_at) : new Date(),
        },
      });
    });

    // Refetch full order with newly created orderItems for receipt generation and email dispatch
    try {
      const fullOrder = await prisma.order.findUnique({
        where: { id: existingOrder.id },
        include: { items: { include: { product: true } } },
      });

      if (fullOrder) {
        const { generateOrderReceiptPDF } = await import("@/lib/receipt-pdf");
        const { sendOrderReceiptEmail } = await import("@/lib/email");

        const pdfBuffer = await generateOrderReceiptPDF(fullOrder.id);
        sendOrderReceiptEmail({ order: fullOrder, pdfBuffer }).catch((e) =>
          console.error("Order receipt email async error:", e)
        );
      }
    } catch (e) {
      console.error("Generate receipt email error:", e);
    }

    return NextResponse.redirect(`${origin}/orders?order=${existingOrder.orderNumber}&paid=true`);
  } catch (error) {
    console.error("Paystack callback verification error:", error);
    return NextResponse.redirect(`${origin}/checkout?error=${encodeURIComponent(error?.message || "Payment verification failed")}`);
  }
}
