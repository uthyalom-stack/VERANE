import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  getCustomerCookieName,
  verifyCustomerSession,
} from "@/lib/auth/customer";

function getSessionUserId(request) {
  const token = request.cookies.get(
    getCustomerCookieName()
  )?.value;

  if (!token) {
    return null;
  }

  const session = verifyCustomerSession(token);

  if (!session?.id) {
    return null;
  }

  return session.id;
}

export async function GET(request) {
  try {
    const userId = getSessionUserId(request);

    if (!userId) {
      return NextResponse.json(
        {
          authenticated: false,
          wishlist: [],
        },
        { status: 401 }
      );
    }

    const wishlist = await prisma.wishlist.findMany({
      where: {
        userId,
      },
      include: {
        product: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({
      authenticated: true,
      wishlist,
    });
  } catch (error) {
    console.error("GET /api/wishlist error:", error);

    return NextResponse.json(
      {
        error: "Failed to load wishlist.",
      },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const userId = getSessionUserId(request);

    if (!userId) {
      return NextResponse.json(
        {
          authenticated: false,
          error: "You must be logged in.",
        },
        { status: 401 }
      );
    }

    const body = await request.json();
    const productId = body?.productId;

    if (!productId) {
      return NextResponse.json(
        {
          error: "Product ID is required.",
        },
        { status: 400 }
      );
    }

    /*
     * We don't need to query the User table or Product table first.
     * The session already gives us the user ID, and Prisma's
     * foreign-key constraints will protect the database.
     *
     * This removes two unnecessary database requests.
     */

    const existing = await prisma.wishlist.findUnique({
      where: {
        userId_productId: {
          userId,
          productId,
        },
      },
      select: {
        id: true,
      },
    });

    if (existing) {
      await prisma.wishlist.delete({
        where: {
          id: existing.id,
        },
      });

      return NextResponse.json({
        success: true,
        wishlisted: false,
      });
    }

    try {
      await prisma.wishlist.create({
        data: {
          userId,
          productId,
        },
      });
    } catch (error) {
      /*
       * Prisma P2003 = foreign-key constraint.
       * That means the product/user doesn't exist anymore.
       */
      if (error?.code === "P2003") {
        return NextResponse.json(
          {
            error: "Product is no longer available.",
          },
          { status: 404 }
        );
      }

      /*
       * P2002 = another request already created the wishlist
       * item. Treat it as successfully wishlisted.
       */
      if (error?.code === "P2002") {
        return NextResponse.json({
          success: true,
          wishlisted: true,
        });
      }

      throw error;
    }

    return NextResponse.json({
      success: true,
      wishlisted: true,
    });
  } catch (error) {
    console.error("POST /api/wishlist error:", error);

    return NextResponse.json(
      {
        error: "Failed to update wishlist.",
      },
      { status: 500 }
    );
  }
}