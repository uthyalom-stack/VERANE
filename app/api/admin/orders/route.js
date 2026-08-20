import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAdminSession } from "@/lib/admin-auth";

export async function GET() {
  try {
    const admin = await getAdminSession();

    if (!admin) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized.",
        },
        { status: 401 }
      );
    }

    if (admin.isSuperAdmin) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Super Admin does not manage store orders.",
        },
        { status: 403 }
      );
    }

    const orders = await prisma.order.findMany({
      where: {
        items: {
          some: {
            product: {
              brand: admin.brand,
            },
          },
        },
      },
      include: {
        user: true,
        items: {
          where: {
            product: {
              brand: admin.brand,
            },
          },
          include: {
            product: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(orders);
  } catch (error) {
    console.error(
      "GET /api/admin/orders error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch orders.",
      },
      { status: 500 }
    );
  }
}