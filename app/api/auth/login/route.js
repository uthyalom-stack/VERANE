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

    // Separate account-level and IP-level keys
    const acctKey = `customer_acct:${email}`;
    const ipKey = `customer_ip:${ip}`;

    // Account limit: 5 failed attempts per 15 minutes
    const acctLimit = await checkRateLimit(acctKey, { maxAttempts: 5, windowMs: 15 * 60 * 1000 });
    // IP limit: 30 failed attempts per 15 minutes (protects against account spraying across multiple accounts)
    const ipLimit = await checkRateLimit(ipKey, { maxAttempts: 30, windowMs: 15 * 60 * 1000 });

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
      await Promise.all([
        recordFailedAttempt(acctKey),
        recordFailedAttempt(ipKey),
      ]);
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
      await Promise.all([
        recordFailedAttempt(acctKey),
        recordFailedAttempt(ipKey),
      ]);
      return NextResponse.json(
        {
          success: false,
          error:
            "Invalid email or password.",
        },
        { status: 401 }
      );
    }

    // On successful login, clear account-specific failure counter
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