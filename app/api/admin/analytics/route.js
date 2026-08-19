import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const [
      products,
      orders,
      subscribers,
      collections,
    ] = await Promise.all([
      prisma.product.count(),

      prisma.order.count(),

      prisma.subscriber.count(),

      prisma.collection.count(),
    ]);

    const revenueResult = await prisma.order.aggregate({
      _sum: {
        total: true,
      },
    });

    const revenue = revenueResult._sum.total || 0;

    return NextResponse.json({
      success: true,
      analytics: {
        products,
        orders,
        subscribers,
        collections,
        revenue,
      },
    });
  } catch (error) {
    console.error("Analytics error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Unable to load analytics.",
      },
      {
        status: 500,
      }
    );
  }
}