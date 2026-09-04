import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";

/**
 * Retrieves the current admin session information from cookies.
 * @returns {Promise<NextResponse>} JSON response with authentication status and admin data if authenticated.
 */
export async function GET() {
  try {
    const admin = await getAdminSession();

    if (!admin) {
      return NextResponse.json(
        {
          authenticated: false,
          error: "Not authenticated.",
        },
        {
          status: 401,
        }
      );
    }

    return NextResponse.json({
      authenticated: true,
      admin: {
        role: admin.role,
        brand: admin.brand,
        name: admin.name,
      },
    });
  } catch (error) {
    console.error("Admin session error:", error);

    return NextResponse.json(
      {
        authenticated: false,
        error: "Unable to read admin session.",
      },
      {
        status: 500,
      }
    );
  }
}
