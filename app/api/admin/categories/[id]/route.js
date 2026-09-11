import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAdminSession } from "@/lib/admin-auth";

export async function PUT(request, { params }) {
  try {
    const admin = await getAdminSession();

    if (!admin) {
      return NextResponse.json({ success: false, error: "Unauthorized." }, { status: 401 });
    }

    if (admin.isSuperAdmin) {
      return NextResponse.json({ success: false, error: "Super Admin does not manage store categories." }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();

    const existing = await prisma.category.findFirst({
      where: { id, brand: admin.brand },
    });

    if (!existing) {
      return NextResponse.json({ success: false, error: "Category not found." }, { status: 404 });
    }

    const name = typeof body.name === "string" ? body.name.trim() : existing.name;
    const description = typeof body.description === "string" ? body.description.trim() : existing.description || "";

    const allowedSizeTypes = ["none", "clothing", "footwear", "waist"];
    const sizeType = allowedSizeTypes.includes(body.sizeType) ? body.sizeType : "none";

    const slug = typeof body.slug === "string" && body.slug.trim()
      ? body.slug.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")
      : name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

    const enabled = typeof body.enabled === "boolean" ? body.enabled : existing.enabled;
    const sortOrder = Number.isFinite(Number(body.sortOrder)) ? Number(body.sortOrder) : existing.sortOrder;

    if (!name || !slug) {
      return NextResponse.json({ success: false, error: "A valid category name is required." }, { status: 400 });
    }

    const duplicate = await prisma.category.findFirst({
      where: { brand: admin.brand, slug, NOT: { id } },
    });

    if (duplicate) {
      return NextResponse.json({ success: false, error: "Another category with this name already exists." }, { status: 409 });
    }

    let shippingWeight = existing.shippingWeight;
    if (body.shippingWeight !== undefined && body.shippingWeight !== null && body.shippingWeight !== "") {
      const parsedWeight = Number(body.shippingWeight);
      if (isNaN(parsedWeight) || parsedWeight < 0.15 || parsedWeight > 1.50) {
        return NextResponse.json(
          { success: false, error: "Category shipping weight must be between 0.15 kg and 1.50 kg." },
          { status: 400 }
        );
      }
      shippingWeight = Math.round(parsedWeight * 100) / 100;
    }

    const category = await prisma.category.update({
      where: { id },
      data: {
        name,
        slug,
        description: description || null,
        sizeType,
        shippingWeight,
        enabled,
        sortOrder,
      },
    });

    return NextResponse.json(category);
  } catch (error) {
    console.error("PUT /api/admin/categories/[id] error:", error);
    return NextResponse.json({ success: false, error: "Failed to update category." }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const admin = await getAdminSession();

    if (!admin) {
      return NextResponse.json({ success: false, error: "Unauthorized." }, { status: 401 });
    }

    if (admin.isSuperAdmin) {
      return NextResponse.json({ success: false, error: "Super Admin does not manage store categories." }, { status: 403 });
    }

    const { id } = await params;

    const existing = await prisma.category.findFirst({
      where: { id, brand: admin.brand },
    });

    if (!existing) {
      return NextResponse.json({ success: false, error: "Category not found." }, { status: 404 });
    }

    await prisma.category.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/admin/categories/[id] error:", error);
    return NextResponse.json({ success: false, error: "Failed to delete category." }, { status: 500 });
  }
}
