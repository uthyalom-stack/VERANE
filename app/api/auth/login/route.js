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

    // Extract trusted client IP from platform-managed headers
    const ip =
      request.headers.get("x-real-ip")?.trim() ||
      request.headers.get("cf-connecting-ip")?.trim() ||
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "127.0.0.1";

    const acctKey = `customer_acct:${email}`;
    const ipKey = `customer_ip:${ip}`;

    // 1. IP Hard Limit Read Check: Check if source IP is blocked from accumulated failed attempts (30 failed attempts / 15m)
    const ipCheck = await checkRateLimit(ipKey, { maxAttempts: 30, windowMs: 15 * 60 * 1000 });
    if (!ipCheck.allowed) {
      const minutes = Math.ceil(ipCheck.resetMs / 60000);
      return NextResponse.json(
        {
          success: false,
          error: `Too many failed login attempts from this network. Please try again in ${minutes} minute${minutes > 1 ? "s" : ""}.`,
        },
        { status: 429 }
      );
    }

    // 2. Account Failure Throttling: Check accumulated failure history for account without locking out legitimate user
    const acctCheck = await checkRateLimit(acctKey, { maxAttempts: 5, windowMs: 15 * 60 * 1000 });
    if (!acctCheck.allowed) {
      const penaltyDelay = Math.min(1000 * Math.max(1, 6 - acctCheck.remaining), 3000);
      await new Promise((res) => setTimeout(res, penaltyDelay));
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

    // On successful authentication, clear account failure state. Successful logins DO NOT consume IP failure budget.
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