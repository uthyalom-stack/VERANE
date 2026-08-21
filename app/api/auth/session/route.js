import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  getCustomerCookieName,
  verifyCustomerSession,
} from "@/lib/auth/customer";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const token =
      request.cookies.get(
        getCustomerCookieName()
      )?.value;

    const session =
      verifyCustomerSession(token);

    if (!session) {
      return NextResponse.json({
        authenticated: false,
        user: null,
      });
    }

    const user =
      await prisma.user.findUnique({
        where: {
          id: session.id,
        },
        select: {
          id: true,
          name: true,
          email: true,
          createdAt: true,
        },
      });

    if (!user) {
      return NextResponse.json({
        authenticated: false,
        user: null,
      });
    }

    return NextResponse.json({
      authenticated: true,
      user,
    });
  } catch (error) {
    console.error(
      "CUSTOMER SESSION ERROR:",
      error
    );

    return NextResponse.json({
      authenticated: false,
      user: null,
    });
  }
}