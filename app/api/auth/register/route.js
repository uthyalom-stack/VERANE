import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  hashPassword,
  createCustomerSession,
  customerCookieOptions,
} from "@/lib/auth/customer";

export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    const body = await request.json();

    const name = String(body.name || "").trim();
    const email = String(body.email || "")
      .trim()
      .toLowerCase();
    const password = String(body.password || "");

    if (!name) {
      return NextResponse.json(
        {
          success: false,
          error: "Please enter your name.",
        },
        { status: 400 }
      );
    }

    if (!email) {
      return NextResponse.json(
        {
          success: false,
          error: "Please enter your email.",
        },
        { status: 400 }
      );
    }

    if (!email.includes("@")) {
      return NextResponse.json(
        {
          success: false,
          error: "Please enter a valid email address.",
        },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Your password must be at least 8 characters.",
        },
        { status: 400 }
      );
    }

    const existingUser =
      await prisma.user.findUnique({
        where: {
          email,
        },
      });

    if (existingUser) {
      return NextResponse.json(
        {
          success: false,
          error:
            "An account with this email already exists.",
        },
        { status: 409 }
      );
    }

    const hashedPassword =
      hashPassword(password);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
      },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
      },
    });

    const session =
      createCustomerSession(user);

    // Send welcome email
    try {
      const { sendWelcomeEmail } = await import("@/lib/email");
      await sendWelcomeEmail({ email: user.email, name: user.name });
    } catch (e) {
      console.error("Welcome email execution error:", e);
    }

    const response = NextResponse.json({
      success: true,
      user,
    });

    response.cookies.set({
      ...customerCookieOptions(),
      value: session,
    });

    return response;
  } catch (error) {
    console.error(
      "CUSTOMER REGISTER ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Something went wrong while creating your account.",
      },
      { status: 500 }
    );
  }
}