import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

/**
 * GET /api/admin/discounts
 *
 * Returns all discount codes stored in site settings.
 */
export async function GET() {
  try {
    const rows = await prisma.siteSetting.findMany({
      where: {
        key: {
          startsWith: "discount_",
        },
      },
      orderBy: {
        key: "desc",
      },
    });

    const discounts = [];

    for (const row of rows) {
      try {
        const parsed = JSON.parse(row.value);

        discounts.push({
          id: row.key,
          ...parsed,
        });
      } catch (error) {
        console.error(
          `Invalid discount data for ${row.key}:`,
          error
        );
      }
    }

    // Calculate live status from dates.
    const now = new Date();

    const formattedDiscounts = discounts.map((discount) => {
      const startsAt = discount.startsAt
        ? new Date(discount.startsAt)
        : null;

      const expiresAt = discount.expiresAt
        ? new Date(discount.expiresAt)
        : null;

      const hasStarted =
        !startsAt || now >= startsAt;

      const hasExpired =
        expiresAt && now > expiresAt;

      const active =
        discount.enabled !== false &&
        hasStarted &&
        !hasExpired;

      return {
        ...discount,
        active,
        expired: Boolean(hasExpired),
      };
    });

    return NextResponse.json({
      success: true,
      discounts: formattedDiscounts,
    });
  } catch (error) {
    console.error("GET DISCOUNTS ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        discounts: [],
        error: "Unable to load discounts.",
      },
      {
        status: 500,
      }
    );
  }
}

/**
 * POST /api/admin/discounts
 *
 * Creates a new discount.
 */
export async function POST(request) {
  try {
    const body = await request.json();

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid discount data.",
        },
        {
          status: 400,
        }
      );
    }

    const code = String(body.code || "")
      .trim()
      .toUpperCase();

    if (!code) {
      return NextResponse.json(
        {
          success: false,
          error: "Discount code is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (code.length < 3 || code.length > 40) {
      return NextResponse.json(
        {
          success: false,
          error: "Discount code must be between 3 and 40 characters.",
        },
        {
          status: 400,
        }
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
          error: "Discount value must be greater than zero.",
        },
        {
          status: 400,
        }
      );
    }

    if (type === "percentage" && value > 100) {
      return NextResponse.json(
        {
          success: false,
          error: "Percentage discount cannot exceed 100%.",
        },
        {
          status: 400,
        }
      );
    }

    const maxUses =
      body.maxUses === null ||
      body.maxUses === undefined ||
      body.maxUses === ""
        ? null
        : Number(body.maxUses);

    if (
      maxUses !== null &&
      (!Number.isInteger(maxUses) || maxUses < 1)
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Maximum uses must be a positive whole number.",
        },
        {
          status: 400,
        }
      );
    }

    const minimumOrder =
      body.minimumOrder === null ||
      body.minimumOrder === undefined ||
      body.minimumOrder === ""
        ? 0
        : Number(body.minimumOrder);

    if (!Number.isFinite(minimumOrder) || minimumOrder < 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Minimum order value is invalid.",
        },
        {
          status: 400,
        }
      );
    }

    const startsAt = body.startsAt
      ? new Date(body.startsAt)
      : null;

    const expiresAt = body.expiresAt
      ? new Date(body.expiresAt)
      : null;

    if (startsAt && Number.isNaN(startsAt.getTime())) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid start date.",
        },
        {
          status: 400,
        }
      );
    }

    if (expiresAt && Number.isNaN(expiresAt.getTime())) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid expiry date.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      startsAt &&
      expiresAt &&
      expiresAt <= startsAt
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Expiry date must be after the start date.",
        },
        {
          status: 400,
        }
      );
    }

    const normalizedDiscount = {
      code,

      name: String(
        body.name || code
      ).trim(),

      description: String(
        body.description || ""
      ).trim(),

      type,

      value,

      enabled: body.enabled !== false,

      startsAt: startsAt
        ? startsAt.toISOString()
        : null,

      expiresAt: expiresAt
        ? expiresAt.toISOString()
        : null,

      minimumOrder,

      maxUses,

      usedCount: 0,

      // Optional product/collection targeting.
      productIds: Array.isArray(body.productIds)
        ? body.productIds
        : [],

      collectionIds: Array.isArray(body.collectionIds)
        ? body.collectionIds
        : [],

      // Whether the discount can be combined with others.
      stackable: Boolean(body.stackable),

      createdAt: new Date().toISOString(),

      updatedAt: new Date().toISOString(),
    };

    const existing = await prisma.siteSetting.findFirst({
      where: {
        key: {
          startsWith: "discount_",
        },
        value: {
          contains: `"code":"${code}"`,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        {
          success: false,
          error: "A discount with this code already exists.",
        },
        {
          status: 409,
        }
      );
    }

    const id = `discount_${Date.now()}_${Math.random()
      .toString(36)
      .slice(2, 8)}`;

    await prisma.siteSetting.create({
      data: {
        key: id,
        value: JSON.stringify(normalizedDiscount),
      },
    });

    return NextResponse.json(
      {
        success: true,
        discount: {
          id,
          ...normalizedDiscount,
        },
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error("POST DISCOUNT ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Unable to create discount.",
      },
      {
        status: 500,
      }
    );
  }
}