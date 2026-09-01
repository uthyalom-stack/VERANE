import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyPaystackWebhookSignature } from "@/lib/paystack";

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
      const reference = data.reference;

      if (!reference) {
        return NextResponse.json({ success: true, message: "No reference found in event payload." });
      }

      const existingOrder = await prisma.order.findUnique({
        where: { paymentReference: reference },
        include: { items: true },
      });

      if (existingOrder && existingOrder.paymentStatus !== "paid") {
        let checkoutData = {};
        try {
          if (existingOrder.pendingCheckoutData) {
            checkoutData = JSON.parse(existingOrder.pendingCheckoutData);
          }
        } catch {
          checkoutData = {};
        }

        const items = Array.isArray(checkoutData.items) ? checkoutData.items : [];

        await prisma.$transaction(async (tx) => {
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

          await tx.order.update({
            where: { id: existingOrder.id },
            data: {
              paymentStatus: "paid",
              status: "processing",
              paymentMethod: data.channel || "card",
              paidAt: data.paid_at ? new Date(data.paid_at) : new Date(),
            },
          });
        });

        // Send PDF receipt email asynchronously
        try {
          const { generateOrderReceiptPDF } = await import("@/lib/receipt-pdf");
          const { sendOrderReceiptEmail } = await import("@/lib/email");

          const pdfBuffer = await generateOrderReceiptPDF(existingOrder.id);
          sendOrderReceiptEmail({ order: existingOrder, pdfBuffer }).catch((e) =>
            console.error("Webhook receipt email async error:", e)
          );
        } catch (e) {
          console.error("Webhook receipt PDF error:", e);
        }
      }
    }

    return NextResponse.json({ success: true, received: true });
  } catch (error) {
    console.error("Paystack webhook error:", error);
    return NextResponse.json(
      { success: false, error: "Webhook handler failed." },
      { status: 500 }
    );
  }
}
