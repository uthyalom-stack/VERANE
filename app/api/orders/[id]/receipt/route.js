import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";
import { generateOrderReceiptPDF } from "@/lib/receipt-pdf";
import { getCustomerCookieName, verifyCustomerSession } from "@/lib/auth/customer";

/**
 * Serves an authenticated customer's order receipt as a PDF attachment.
 * @param {Request} request - The incoming HTTP request.
 * @param {{ params: Promise<{ id?: string }> }} context - Route context containing the order identifier.
 * @returns {NextResponse} The receipt PDF or an error response.
 */
export async function GET(request, { params }) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(getCustomerCookieName())?.value;
    const sessionUser = verifyCustomerSession(token);

    if (!sessionUser || !sessionUser.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. Please sign in to access receipts." },
        { status: 401 }
      );
    }

    const { id } = await params;

    if (!id) {
      return NextResponse.json({ success: false, error: "Order ID is required." }, { status: 400 });
    }

    const order = await prisma.order.findFirst({
      where: {
        OR: [
          { id },
          { orderNumber: id },
        ],
      },
    });

    if (!order) {
      return NextResponse.json({ success: false, error: "Order not found." }, { status: 404 });
    }

    if (order.userId !== sessionUser.id) {
      return NextResponse.json(
        { success: false, error: "Forbidden. Access to this order receipt is denied." },
        { status: 403 }
      );
    }

    const pdfBuffer = await generateOrderReceiptPDF(order.id);

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="VERANE-Receipt-${order.orderNumber}.pdf"`,
      },
    });
  } catch (error) {
    console.error("GET /api/orders/[id]/receipt error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to generate receipt PDF." },
      { status: 500 }
    );
  }
}
