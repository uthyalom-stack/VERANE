import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";
import { verifyCustomerSession, getCustomerCookieName } from "@/lib/auth/customer";

/**
 * Retrieves the authenticated customer from the session cookie.
 * @returns {{authenticated: boolean, user: object|null}} The authentication status and customer data when the session is valid.
 */
async function getSession() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(getCustomerCookieName())?.value;
    const user = verifyCustomerSession(token);
    if (user) {
      return { authenticated: true, user };
    }
  } catch (err) {
    console.error("Direct session verification error in /api/orders:", err);
  }
  return { authenticated: false, user: null };
}

/**
 * Generates an order identifier containing the current UTC date and a six-digit random number.
 * @returns {string} The generated order identifier.
 */
function generateOrderNumber() {
  const date = new Date()
    .toISOString()
    .slice(0, 10)
    .replace(/-/g, "");

  const random = Math.floor(
    100000 + Math.random() * 900000
  );

  return `VR-${date}-${random}`;
}

/**
 * Retrieve the authenticated customer's orders with their item details.
 * @returns {Promise<Response>} A response containing the orders, or an authentication or server error.
 */
export async function GET(request) {
  try {
    const session = await getSession();

    if (!session.authenticated || !session.user?.id) {
      return NextResponse.json(
        {
          authenticated: false,
          orders: [],
        },
        { status: 401 }
      );
    }

    const orders = await prisma.order.findMany({
      where: {
        userId: session.user.id,
      },
      orderBy: {
        createdAt: "desc",
      },
      include: {
        brandTrackings: true,
        items: {
          include: {
            product: true,
            variant: {
              include: {
                color: true,
              },
            },
            collaborationProduct: {
              include: {
                productA: true,
                productB: true,
              },
            },
          },
        },
      },
    });

    const { getOrderBrandTrackingInfo } = await import("@/lib/order-tracking");

    const ordersWithTracking = orders.map((order) => ({
      ...order,
      brandTrackingsInfo: getOrderBrandTrackingInfo(order),
    }));

    return NextResponse.json({
      authenticated: true,
      orders: ordersWithTracking,
    });
  } catch (error) {
    console.error("Orders API error:", error);

    return NextResponse.json(
      {
        error: "Failed to load orders",
      },
      { status: 500 }
    );
  }
}

/**
 * Creates an order for the authenticated customer.
 * Direct order creation via POST is disabled for security; orders must be initialized through payment checkout.
 * @returns {NextResponse} A 403 Forbidden response.
 */
export async function POST() {
  return NextResponse.json(
    {
      success: false,
      error: "Direct order creation is disabled. Orders must be initialized through payment checkout.",
    },
    { status: 403 }
  );
}