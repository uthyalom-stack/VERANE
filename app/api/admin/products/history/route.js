import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAdminSession } from "@/lib/admin-auth";

/**
 * Retrieves archived products for the authenticated brand admin.
 * @returns {Promise<NextResponse>} JSON response containing array of archived products.
 */
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
          error: "Super Admin does not manage store products.",
        },
        { status: 403 }
      );
    }

    const archivedProducts = await prisma.product.findMany({
      where: {
        brand: admin.brand,
        archivedAt: {
          not: null,
        },
      },
      include: {
        categoryRef: true,
        collection: true,
        _count: {
          select: {
            orderItems: true,
          },
        },
        productColors: {
          orderBy: {
            createdAt: "asc",
          },
        },
        variants: {
          include: {
            color: true,
          },
          orderBy: {
            createdAt: "asc",
          },
        },
      },
      orderBy: {
        archivedAt: "desc",
      },
    });

    return NextResponse.json(archivedProducts);
  } catch (error) {
    console.error("GET /api/admin/products/history error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to load archived product history.",
      },
      { status: 500 }
    );
  }
}
