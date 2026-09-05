import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";
import { verifyCustomerSession, getCustomerCookieName } from "@/lib/auth/customer";
import { calculateOrderTotalsServer, OrderValidationError } from "@/lib/paystack";

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
        items: {
          include: {
            product: true,
            variant: {
              include: {
                color: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json({
      authenticated: true,
      orders,
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
 * Creates an order for the authenticated customer using server-authoritative pricing and delivery calculations.
 * @param {Request} request - The request containing order and customer details.
 * @return {NextResponse} A response containing the created order or an error message.
 */
export async function POST(request) {
  try {
    const session = await getSession();

    if (!session.authenticated || !session.user?.id) {
      return NextResponse.json(
        {
          error: "Please login first",
        },
        { status: 401 }
      );
    }

    const body = await request.json();

    const {
      items: rawItems,
      firstName,
      lastName,
      email,
      phone,
      country,
      address,
      city,
      state,
      zone,
    } = body;

    if (!Array.isArray(rawItems) || rawItems.length === 0) {
      return NextResponse.json(
        {
          error: "Cart is empty",
        },
        { status: 400 }
      );
    }

    // Server-authoritative calculation of merchandise prices, subtotal, shipping fee, and grand total.
    // Client-supplied prices, subtotals, shipping fees, and grand totals are completely ignored.
    let calculation;
    try {
      calculation = await calculateOrderTotalsServer({
        items: rawItems,
        country: country || "Nigeria",
        state,
        city,
        zone,
      });
    } catch (calcError) {
      if (calcError instanceof OrderValidationError) {
        return NextResponse.json(
          { error: calcError.message },
          { status: 400 }
        );
      }
      // Rethrow infrastructure/database errors to be caught as HTTP 500
      throw calcError;
    }

    const { shippingFee: trustedShippingFee, total: trustedGrandTotal, items: validatedItems } = calculation;

    const order = await prisma.order.create({
      data: {
        userId: session.user.id,
        orderNumber: generateOrderNumber(),
        total: trustedGrandTotal,
        shippingFee: trustedShippingFee,

        firstName: firstName || null,
        lastName: lastName || null,
        email: email || session.user.email || null,
        phone: phone || null,
        country: country || "Nigeria",
        address: address || null,
        city: city || null,
        state: state || null,
        zone: zone || null,

        items: {
          create: validatedItems.map((item) => ({
            productId: item.productId,
            quantity: Number(item.qty || 1),
            price: Number(item.price), // Authoritative database unit price
            selectedColor: item.selectedColor || null,
            selectedColorHex: item.selectedColorHex || null,
            selectedSize: item.selectedSize || null,
            variantId: item.variantId || null,
            collaborationProductId: item.collaborationProductId || null,
            collaborationVariantId: item.collaborationVariantId || null,
            customMeasurements: item.customSizing || item.customMeasurements || null,
          })),
        },
      },

      include: {
        items: true,
      },
    });

    // Record Campaign Attribution if attribution cookie is present
    try {
      const cookieStore = await cookies();
      const attrCookie = cookieStore.get("verane_campaign_attr")?.value;

      if (attrCookie) {
        const attrData = JSON.parse(attrCookie);

        if (attrData?.campaignId) {
          await prisma.orderAttribution.create({
            data: {
              orderId: order.id,
              campaignId: attrData.campaignId,
              brand: attrData.brand || "UTHY",
              visitorId: attrData.visitorId || null,
              attributionModel: "last_touch",
            },
          });
        }
      }
    } catch (attrErr) {
      console.error("Order attribution creation error:", attrErr);
    }

    return NextResponse.json({
      success: true,
      order,
    });
  } catch (error) {
    console.error("Create order error:", error);

    return NextResponse.json(
      {
        error: "Failed to create order",
      },
      { status: 500 }
    );
  }
}
