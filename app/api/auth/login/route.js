import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  verifyPassword,
  createCustomerSession,
  customerCookieOptions,
} from "@/lib/auth/customer";
import { checkRateLimit, recordFailedAttempt, resetRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    const body = await request.json();

    const email = String(body.email || "")
      .trim()
      .toLowerCase();

    const password = String(body.password || "");

    if (!email || !password) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Please enter your email and password.",
        },
        { status: 400 }
      );
    }

    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";
    const rateKey = `customer_login:${email}:${ip}`;

    const limit = checkRateLimit(rateKey, { maxAttempts: 5, windowMs: 15 * 60 * 1000 });
    if (!limit.allowed) {
      const minutes = Math.ceil(limit.resetMs / 60000);
      return NextResponse.json(
        {
          success: false,
          error: `Too many failed login attempts. Please try again in ${minutes} minute${minutes > 1 ? "s" : ""}.`,
        },
        { status: 429 }
      );
    }

    const user =
      await prisma.user.findUnique({
        where: {
          email,
        },
      });

    if (!user) {
      recordFailedAttempt(rateKey);
      return NextResponse.json(
        {
          success: false,
          error:
            "Invalid email or password.",
        },
        { status: 401 }
      );
    }

    const validPassword =
      verifyPassword(
        password,
        user.password
      );

    if (!validPassword) {
      recordFailedAttempt(rateKey);
      return NextResponse.json(
        {
          success: false,
          error:
            "Invalid email or password.",
        },
        { status: 401 }
      );
    }

    resetRateLimit(rateKey);

    const safeUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
    };

    const session =
      createCustomerSession(
        safeUser
      );

    const response = NextResponse.json({
      success: true,
      user: safeUser,
    });

    response.cookies.set({
      ...customerCookieOptions(),
      value: session,
    });

    return response;
  } catch (error) {
    console.error(
      "CUSTOMER LOGIN ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Something went wrong while logging in.",
      },
      { status: 500 }
    );
  }
}