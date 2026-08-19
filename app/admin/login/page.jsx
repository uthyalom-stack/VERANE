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
          success: false,
          error: "Password is required.",
        },
        { status: 400 }
      );
    }

    const adminEntry = Object.entries(ADMINS).find(
      ([, account]) => account.password === password
    );

    if (!adminEntry) {
      return NextResponse.json(
        {
          success: false,
          error: "Incorrect password.",
        },
        { status: 401 }
      );
    }

    const [role, account] = adminEntry;

    const adminData = {
      role,
      name: account.name,
      brand: account.brand,
    };

    const response = NextResponse.json({
      success: true,
      admin: adminData,
    });

    /*
     * Main admin authentication cookie.
     *
     * This matches middleware.js:
     * request.cookies.get("adminAuth")
     */
    response.cookies.set(
      "adminAuth",
      JSON.stringify(adminData),
      {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 7,
      }
    );

    /*
     * Keep the old cookie name too so nothing else in the
     * existing application breaks if it still references it.
     */
    response.cookies.set(
      "verane_admin",
      JSON.stringify(adminData),
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
        success: false,
        error: "Unable to log in.",
      },
      { status: 500 }
    );
  }
}