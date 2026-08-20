import { NextResponse } from "next/server";

const ADMINS = {
  UTHY: {
    password: "uthy2026",
    brand: "UTHY_LUXURY",
    name: "UTHY LUXURY",
  },

  ALOMZIEE: {
    password: "alomziee2026",
    brand: "ALOMZIEE_FOOTIES",
    name: "ALOMZIEE FOOTIES",
  },

  SUPERADMIN: {
    password: "verane2026",
    brand: "ALL",
    name: "VÉRANE ADMIN",
  },
};

export async function POST(request) {
  try {
    const body = await request.json();

    const role = body?.role;
    const password = body?.password;

    if (!role) {
      return NextResponse.json(
        {
          error: "Choose an administration.",
        },
        {
          status: 400,
        }
      );
    }

    if (!password) {
      return NextResponse.json(
        {
          error: "Password is required.",
        },
        {
          status: 400,
        }
      );
    }

    const account = ADMINS[role];

    if (!account) {
      return NextResponse.json(
        {
          error: "Invalid administration.",
        },
        {
          status: 400,
        }
      );
    }

    if (account.password !== password) {
      return NextResponse.json(
        {
          error: "Incorrect password.",
        },
        {
          status: 401,
        }
      );
    }

    const session = {
      role,
      name: account.name,
      brand: account.brand,
    };

    const response = NextResponse.json({
      success: true,
      admin: session,
    });

    response.cookies.set("adminAuth", JSON.stringify(session), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (error) {
    console.error("Admin login error:", error);

    return NextResponse.json(
      {
        error: "Unable to log in.",
      },
      {
        status: 500,
      }
    );
  }
}