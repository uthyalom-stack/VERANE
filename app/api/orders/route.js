import { NextResponse } from "next/server";
import prisma from "../../../lib/prisma";

async function getSession(request) {
  const response = await fetch(
    new URL("/api/auth/session", request.url),
    {
      headers: {
        cookie: request.headers.get("cookie") || "",
      },
      cache: "no-store",
    }
  );

  return response.json();
}

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

export async function GET(request) {
  try {
    const session = await getSession(request);

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


export async function POST(request) {
  try {
    const session = await getSession(request);

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
      items,
      total,
    } = body;


    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        {
          error: "Cart is empty",
        },
        { status: 400 }
      );
    }


    const order = await prisma.order.create({
      data: {
        userId: session.user.id,

        orderNumber: generateOrderNumber(),

        total: Number(total || 0),

        items: {
          create: items.map((item) => ({
            productId: item.id,
            quantity: Number(item.qty || 1),
            price: Number(item.price || 0),

            selectedColor:
              item.selectedColor || null,

            selectedSize:
              item.selectedSize || null,

            customMeasurements:
              item.customSizing || null,
          })),
        },
      },

      include: {
        items: true,
      },
    });


    return NextResponse.json({
      success: true,
      order,
    });

  } catch (error) {
    console.error(
      "Create order error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to create order",
      },
      { status: 500 }
    );
  }
}