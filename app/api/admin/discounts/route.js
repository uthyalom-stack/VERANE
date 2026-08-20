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

    const discounts = await prisma.discount.findMany({
      where: admin.isSuperAdmin
        ? {}
        : {
            brand: admin.brand,
          },
      orderBy: {
        createdAt: "desc",
      },
    });

    const now = new Date();

    const formattedDiscounts = discounts.map((discount) => {
      const hasStarted =
        !discount.startsAt || now >= discount.startsAt;

      const hasExpired =
        discount.endsAt && now > discount.endsAt;

      return {
        ...discount,
        active:
          discount.enabled &&
          hasStarted &&
          !hasExpired,
        expired: Boolean(hasExpired),
      };
    });

    return NextResponse.json({
      success: true,
      discounts: formattedDiscounts,
    });
  } catch (error) {
    console.error(
      "GET /api/admin/discounts error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        discounts: [],
        error: "Unable to load discounts.",
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

    if (admin.isSuperAdmin) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Super Admin does not create store discounts.",
        },
        { status: 403 }
      );
    }

    const body = await request.json();

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid discount data.",
        },
        { status: 400 }
      );
    }

    const code = String(body.code || "")
      .trim()
      .toUpperCase();

    const name = String(body.name || code).trim();

    const description = String(
      body.description || ""
    ).trim();

    if (!code) {
      return NextResponse.json(
        {
          success: false,
          error: "Discount code is required.",
        },
        { status: 400 }
      );
    }

    if (code.length < 3 || code.length > 40) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Discount code must be between 3 and 40 characters.",
        },
        { status: 400 }
      );
    }

    const type =
      body.type === "fixed" ||
      body.type === "percentage"
        ? body.type
        : "percentage";

    const value = Number(body.value);

    if (!Number.isFinite(value) || value <= 0) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Discount value must be greater than zero.",
        },
        { status: 400 }
      );
    }

    if (type === "percentage" && value > 100) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Percentage discount cannot exceed 100%.",
        },
        { status: 400 }
      );
    }

    const minOrderValue =
      body.minimumOrder === null ||
      body.minimumOrder === undefined ||
      body.minimumOrder === ""
        ? null
        : Number(body.minimumOrder);

    if (
      minOrderValue !== null &&
      (!Number.isFinite(minOrderValue) ||
        minOrderValue < 0)
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Minimum order value is invalid.",
        },
        { status: 400 }
      );
    }

    const usageLimit =
      body.maxUses === null ||
      body.maxUses === undefined ||
      body.maxUses === ""
        ? null
        : Number(body.maxUses);

    if (
      usageLimit !== null &&
      (!Number.isInteger(usageLimit) ||
        usageLimit < 1)
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Maximum uses must be a positive whole number.",
        },
        { status: 400 }
      );
    }

    const startsAt = body.startsAt
      ? new Date(body.startsAt)
      : null;

    const endsAt = body.expiresAt
      ? new Date(body.expiresAt)
      : null;

    if (
      startsAt &&
      Number.isNaN(startsAt.getTime())
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid start date.",
        },
        { status: 400 }
      );
    }

    if (
      endsAt &&
      Number.isNaN(endsAt.getTime())
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid expiry date.",
        },
        { status: 400 }
      );
    }

    if (startsAt && endsAt && endsAt <= startsAt) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Expiry date must be after the start date.",
        },
        { status: 400 }
      );
    }

    const existing = await prisma.discount.findUnique({
      where: {
        code,
      },
    });

    if (existing) {
      return NextResponse.json(
        {
          success: false,
          error:
            "A discount with this code already exists.",
        },
        { status: 409 }
      );
    }

    const discount = await prisma.discount.create({
      data: {
        brand: admin.brand,
        code,
        name,
        description: description || null,
        type,
        value,
        enabled: body.enabled !== false,
        minOrderValue,
        usageLimit,
        usageCount: 0,
        startsAt,
        endsAt,
      },
    });

    return NextResponse.json(
      {
        success: true,
        discount,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(
      "POST /api/admin/discounts error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error?.message ||
          "Unable to create discount.",
      },
      { status: 500 }
    );
  }
}