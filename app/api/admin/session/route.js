import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET() {
  try {
    const cookieStore = await cookies();

    const authCookie = cookieStore.get("adminAuth")?.value;

    if (!authCookie) {
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

    let admin;

    try {
      admin = JSON.parse(authCookie);
    } catch {
      return NextResponse.json(
        {
          authenticated: false,
          error: "Invalid session.",
        },
        {
          status: 401,
        }
      );
    }

    if (
      !admin?.role ||
      !admin?.brand ||
      !admin?.name
    ) {
      return NextResponse.json(
        {
          authenticated: false,
          error: "Invalid admin session.",
        },
        {
          status: 401,
        }
      );
    }

    return NextResponse.json({
      authenticated: true,
      admin,
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