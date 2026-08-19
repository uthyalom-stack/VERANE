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
    const { password } = await request.json();

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

    /*
     * Find the admin account matching the password.
     */
    const admin = Object.entries(ADMINS).find(
      ([, account]) => account.password === password
    );

    if (!admin) {
      return NextResponse.json(
        {
          error: "Incorrect password.",
        },
        {
          status: 401,
        }
      );
    }

    const [role, account] = admin;

    /*
     * Admin session information.
     */
    const adminSession = {
      role,
      name: account.name,
      brand: account.brand,
    };

    const response = NextResponse.json({
      success: true,
      admin: adminSession,
    });

    /*
     * IMPORTANT:
     *
     * middleware.js checks for:
     *
     * request.cookies.get("adminAuth")
     *
     * Therefore the login API MUST create the same cookie.
     */
    response.cookies.set(
      "adminAuth",
      JSON.stringify(adminSession),
      {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 7,
      }
    );

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