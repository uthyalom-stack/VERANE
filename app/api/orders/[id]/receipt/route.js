import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { generateOrderReceiptPDF } from "@/lib/receipt-pdf";

export async function GET(request, { params }) {
  try {
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
