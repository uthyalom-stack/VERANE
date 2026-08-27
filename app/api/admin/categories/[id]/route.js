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
          error:
            "Super Admin does not manage store categories.",
        },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();

    const existing = await prisma.category.findFirst({
      where: {
        id,
        brand: admin.brand,
      },
    });

    if (!existing) {
      return NextResponse.json(
        {
          success: false,
          error: "Category not found.",
        },
        { status: 404 }
      );
    }

    const name =
      typeof body.name === "string"
        ? body.name.trim()
        : existing.name;

    const description =
      typeof body.description === "string"
        ? body.description.trim()
        : existing.description || "";

const allowedSizeTypes = [
  "none",
  "clothing",
  "footwear",
  "waist",
];

const sizeType = allowedSizeTypes.includes(
  body.sizeType
)
  ? body.sizeType
  : "none";

    const slug =
      typeof body.slug === "string" && body.slug.trim()
        ? body.slug
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "")
        : name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "");

    const enabled =
      typeof body.enabled === "boolean"
        ? body.enabled
        : existing.enabled;

    const sortOrder = Number.isFinite(
      Number(body.sortOrder)
    )
      ? Number(body.sortOrder)
      : existing.sortOrder;

    if (!name || !slug) {
      return NextResponse.json(
        {
          success: false,
          error: "A valid category name is required.",
        },
        { status: 400 }
      );
    }

    const duplicate = await prisma.category.findFirst({
      where: {
        brand: admin.brand,
        slug,
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
            "Another category with this name already exists.",
        },
        { status: 409 }
      );
    }

    const category = await prisma.category.update({
      where: {
        id,
      },
      data: {
  name,
  slug,
  description: description || null,
  sizeType,
  enabled,
  sortOrder,
},
    });

    return NextResponse.json(category);
  } catch (error) {
    console.error(
      "PUT /api/admin/categories/[id] error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error?.message || "Failed to update category.",
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
          error:
            "Super Admin does not manage store categories.",
        },
        { status: 403 }
      );
    }

    const { id } = await params;

    const existing = await prisma.category.findFirst({
      where: {
        id,
        brand: admin.brand,
      },
    });

    if (!existing) {
      return NextResponse.json(
        {
          success: false,
          error: "Category not found.",
        },
        { status: 404 }
      );
    }

    await prisma.category.delete({
      where: {
        id,
      },
    });

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error(
      "DELETE /api/admin/categories/[id] error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error?.message || "Failed to delete category.",
      },
      { status: 500 }
    );
  }
}