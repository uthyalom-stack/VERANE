import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAdminSession } from "@/lib/admin-auth";

export async function GET() {
  try {
    const admin = await getAdminSession();

    if (!admin) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized.",
        },
        { status: 401 }
      );
    }

    const subscribers = await prisma.subscriber.findMany({
      where: admin.isSuperAdmin
        ? {}
        : {
            brand: admin.brand,
          },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(subscribers);
  } catch (error) {
    console.error(
      "GET /api/admin/subscribers error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Failed to load subscribers.",
      },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const admin = await getAdminSession();

    if (!admin) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized.",
        },
        { status: 401 }
      );
    }

    const body = await request.json();

    const email =
      typeof body.email === "string"
        ? body.email.trim().toLowerCase()
        : "";

    if (!email) {
      return NextResponse.json(
        {
          success: false,
          error: "Email is required.",
        },
        { status: 400 }
      );
    }

    const brand = admin.isSuperAdmin
      ? typeof body.brand === "string" &&
        body.brand.trim()
        ? body.brand.trim()
        : null
      : admin.brand;

    const existing =
      await prisma.subscriber.findUnique({
        where: {
          email_brand: {
            email,
            brand,
          },
        },
      });

    if (existing) {
      return NextResponse.json(
        {
          success: false,
          error: "This subscriber already exists.",
        },
        { status: 409 }
      );
    }

    const subscriber =
      await prisma.subscriber.create({
        data: {
          email,
          brand,
        },
      });

    return NextResponse.json(subscriber, {
      status: 201,
    });
  } catch (error) {
    console.error(
      "POST /api/admin/subscribers error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error?.message ||
          "Failed to create subscriber.",
      },
      { status: 500 }
    );
  }
}