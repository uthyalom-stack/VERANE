import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  verifyPassword,
  createCustomerSession,
  customerCookieOptions,
} from "@/lib/auth/customer";

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