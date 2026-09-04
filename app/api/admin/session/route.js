import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";

/**
 * Check the current administrator's authentication status.
 * @returns {Response} A JSON response containing authentication status and, when authenticated, the administrator's role, brand, and name.
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
