import { NextResponse } from "next/server";
import prisma from "../../../lib/prisma";

export async function GET(request) {
  try {
    const sessionResponse = await fetch(
      new URL("/api/auth/session", request.url),
      {
        headers: {
          cookie: request.headers.get("cookie") || "",
        },
        cache: "no-store",
      }
    );

    const session = await sessionResponse.json();

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
        authenticated: true,
        orders: [],
        error:
          error instanceof Error
            ? error.message
            : "Failed to load orders",
      },
      { status: 500 }
    );
  }
}