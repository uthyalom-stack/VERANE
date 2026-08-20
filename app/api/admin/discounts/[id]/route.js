import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAdminSession } from "@/lib/admin-auth";

export async function PUT(request, { params }) {
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
          error: "Super Admin does not manage store discounts.",
        },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();

    const existing = await prisma.discount.findFirst({
      where: {
        id,
        brand: admin.brand,
      },
    });

    if (!existing) {
      return NextResponse.json(
        {
          success: false,
          error: "Discount not found.",
        },
        { status: 404 }
      );
    }

    const code = String(
      body.code ?? existing.code
    )
      .trim()
      .toUpperCase();

    const name = String(
      body.name ?? existing.name
    ).trim();

    const description =
      body.description === undefined
        ? existing.description
        : String(body.description || "").trim() || null;

    const type =
      body.type === "fixed" ||
      body.type === "percentage"
        ? body.type
        : existing.type;

    const value =
      body.value === undefined
        ? existing.value
        : Number(body.value);

    if (!code || !name) {
      return NextResponse.json(
        {
          success: false,
          error: "Discount code and name are required.",
        },
        { status: 400 }
      );
    }

    if (!Number.isFinite(value) || value <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Discount value must be greater than zero.",
        },
        { status: 400 }
      );
    }

    if (type === "percentage" && value > 100) {
      return NextResponse.json(
        {
          success: false,
          error: "Percentage discount cannot exceed 100%.",
        },
        { status: 400 }
      );
    }

    const minOrderValue =
      body.minimumOrder === undefined
        ? existing.minOrderValue
        : body.minimumOrder === null ||
          body.minimumOrder === ""
        ? null
        : Number(body.minimumOrder);

    const usageLimit =
      body.maxUses === undefined
        ? existing.usageLimit
        : body.maxUses === null ||
          body.maxUses === ""
        ? null
        : Number(body.maxUses);

    if (
      minOrderValue !== null &&
      (!Number.isFinite(minOrderValue) ||
        minOrderValue < 0)
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Minimum order value is invalid.",
        },
        { status: 400 }
      );
    }

    if (
      usageLimit !== null &&
      (!Number.isInteger(usageLimit) ||
        usageLimit < 1)
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Maximum uses must be a positive whole number.",
        },
        { status: 400 }
      );
    }

    const startsAt =
      body.startsAt === undefined
        ? existing.startsAt
        : body.startsAt
        ? new Date(body.startsAt)
        : null;

    const endsAt =
      body.expiresAt === undefined
        ? existing.endsAt
        : body.expiresAt
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
          error: "Expiry date must be after the start date.",
        },
        { status: 400 }
      );
    }

    const duplicate = await prisma.discount.findFirst({
      where: {
        code,
        NOT: {
          id,
        },
      },
    });

    if (duplicate) {
      return NextResponse.json(
        {
          success: false,
          error:
            "A discount with this code already exists.",
        },
        { status: 409 }
      );
    }

    const discount = await prisma.discount.update({
      where: {
        id,
      },
      data: {
        brand: admin.brand,
        code,
        name,
        description,
        type,
        value,
        enabled:
          typeof body.enabled === "boolean"
            ? body.enabled
            : existing.enabled,
        minOrderValue,
        usageLimit,
        startsAt,
        endsAt,
      },
    });

    return NextResponse.json({
      success: true,
      discount,
    });
  } catch (error) {
    console.error(
      "PUT /api/admin/discounts/[id] error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error?.message ||
          "Unable to update discount.",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
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
          error: "Super Admin does not manage store discounts.",
        },
        { status: 403 }
      );
    }

    const { id } = await params;

    const existing = await prisma.discount.findFirst({
      where: {
        id,
        brand: admin.brand,
      },
    });

    if (!existing) {
      return NextResponse.json(
        {
          success: false,
          error: "Discount not found.",
        },
        { status: 404 }
      );
    }

    await prisma.discount.delete({
      where: {
        id,
      },
    });

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error(
      "DELETE /api/admin/discounts/[id] error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error?.message ||
          "Unable to delete discount.",
      },
      { status: 500 }
    );
  }
}