import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: "Order ID is required" },
        { status: 400 }
      );
    }

    if (!body.status) {
      return NextResponse.json(
        { error: "Order status is required" },
        { status: 400 }
      );
    }

    const order = await prisma.order.update({
      where: { id },
      data: {
        status: body.status,
      },
    });

    return NextResponse.json(order);
  } catch (error) {
    console.error("Failed to update order:", error);

    return NextResponse.json(
      { error: "Failed to update order" },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "Order ID is required" },
        { status: 400 }
      );
    }

    await prisma.order.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error("Failed to delete order:", error);

    return NextResponse.json(
      { error: "Failed to delete order" },
      { status: 500 }
    );
  }
}