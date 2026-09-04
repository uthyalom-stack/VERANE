import { NextResponse } from "next/server";
import { createSignedAdminToken } from "@/lib/admin-auth";

const ADMIN_CONFIG = {
  UTHY: {
    getEnvPassword: () => process.env.ADMIN_UTHY_PASSWORD,
    brand: "UTHY_LUXURY",
    name: "UTHY LUXURY",
  },

  ALOMZIEE: {
    getEnvPassword: () => process.env.ADMIN_ALOMZIEE_PASSWORD,
    brand: "ALOMZIEE_FOOTIES",
    name: "ALOMZIEE FOOTIES",
  },

  SUPERADMIN: {
    getEnvPassword: () => process.env.ADMIN_SUPERADMIN_PASSWORD,
    brand: "ALL",
    name: "VÉRANE ADMIN",
  },
};

function isValidRole(role) {
  if (typeof role !== "string") {
    return false;
  }
  return Object.prototype.hasOwnProperty.call(ADMIN_CONFIG, role);
}

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

    if (!isValidRole(role)) {
      return NextResponse.json(
        {
          error: "Invalid administration.",
        },
        {
          status: 400,
        }
      );
    }

    const account = ADMIN_CONFIG[role];
    const expectedPassword = account.getEnvPassword();

    if (!expectedPassword) {
      console.error(
        `Admin login failed: Missing required password environment variable for role '${role}'.`
      );
      return NextResponse.json(
        {
          error: "Authentication service unavailable.",
        },
        {
          status: 503,
        }
      );
    }

    if (expectedPassword !== password) {
      return NextResponse.json(
        {
          error: "Incorrect password.",
        },
        {
          status: 401,
        }
      );
    }

    const sessionPayload = {
      role,
      name: account.name,
      brand: account.brand,
    };

    const token = createSignedAdminToken(sessionPayload);

    if (!token) {
      console.error(
        "Admin login failed: Unable to sign session token (missing ADMIN_AUTH_SECRET)."
      );
      return NextResponse.json(
        {
          error: "Authentication service unavailable.",
        },
        {
          status: 503,
        }
      );
    }

    const response = NextResponse.json({
      success: true,
      admin: sessionPayload,
    });

    response.cookies.set("adminAuth", token, {
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
