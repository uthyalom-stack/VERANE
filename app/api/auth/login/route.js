import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  verifyPassword,
  createCustomerSession,
  customerCookieOptions,
} from "@/lib/auth/customer";
import { rateLimitAndIncrement, resetRateLimit } from "@/lib/rate-limit";

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

    // Extract trusted client IP from platform-managed headers
    const ip =
      request.headers.get("x-real-ip")?.trim() ||
      request.headers.get("cf-connecting-ip")?.trim() ||
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "127.0.0.1";

    // Separate account-level and IP-level keys
    const acctKey = `customer_acct:${email}`;
    const ipKey = `customer_ip:${ip}`;

    // Atomically increment and evaluate rate limits
    const [acctLimit, ipLimit] = await Promise.all([
      rateLimitAndIncrement(acctKey, { maxAttempts: 5, windowMs: 15 * 60 * 1000 }),
      rateLimitAndIncrement(ipKey, { maxAttempts: 30, windowMs: 15 * 60 * 1000 }),
    ]);

    if (!acctLimit.allowed || !ipLimit.allowed) {
      const resetMs = !acctLimit.allowed ? acctLimit.resetMs : ipLimit.resetMs;
      const minutes = Math.ceil(resetMs / 60000);
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
      return NextResponse.json(
        {
          success: false,
          error:
            "Invalid email or password.",
        },
        { status: 401 }
      );
    }

    // On successful login, clear account-specific failure counter (preserve IP history)
    await resetRateLimit(acctKey);

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