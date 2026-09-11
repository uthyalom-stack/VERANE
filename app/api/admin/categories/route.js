import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAdminSession } from "@/lib/admin-auth";

export async function GET() {
  try {
    const admin = await getAdminSession();

    if (!admin) {
      return NextResponse.json({ success: false, error: "Unauthorized." }, { status: 401 });
    }

    if (admin.isSuperAdmin) {
      return NextResponse.json({ success: false, error: "Super Admin does not manage store categories." }, { status: 403 });
    }

    const categories = await prisma.category.findMany({
      where: { brand: admin.brand },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    });

    return NextResponse.json(categories);
  } catch (error) {
    console.error("GET /api/admin/categories error:", error);
    return NextResponse.json({ success: false, error: "Failed to load categories." }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const admin = await getAdminSession();

    if (!admin) {
      return NextResponse.json({ success: false, error: "Unauthorized." }, { status: 401 });
    }

    if (admin.isSuperAdmin) {
      return NextResponse.json({ success: false, error: "Super Admin does not manage store categories." }, { status: 403 });
    }

    const body = await request.json();

    const name = typeof body.name === "string" ? body.name.trim() : "";
    const description = typeof body.description === "string" ? body.description.trim() : "";

    const allowedSizeTypes = ["none", "clothing", "footwear", "waist"];
    const sizeType = allowedSizeTypes.includes(body.sizeType) ? body.sizeType : "none";

    const slug = typeof body.slug === "string" && body.slug.trim()
      ? body.slug.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")
      : name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

    const enabled = body.enabled !== false;
    const sortOrder = Number.isFinite(Number(body.sortOrder)) ? Number(body.sortOrder) : 0;

    if (!name || !slug) {
      return NextResponse.json({ success: false, error: "A valid category name is required." }, { status: 400 });
    }

    const existing = await prisma.category.findFirst({
      where: { brand: admin.brand, slug },
    });

    if (existing) {
      return NextResponse.json({ success: false, error: "A category with this name already exists." }, { status: 409 });
    }

    let shippingWeight = null;
    if (body.shippingWeight !== undefined && body.shippingWeight !== null && body.shippingWeight !== "") {
      const parsedWeight = Number(body.shippingWeight);
      if (isNaN(parsedWeight) || parsedWeight < 0.15 || parsedWeight > 1.50) {
        return NextResponse.json(
          { success: false, error: "Category shipping weight must be between 0.15 kg and 1.50 kg." },
          { status: 400 }
        );
      }
      shippingWeight = Math.round(parsedWeight * 100) / 100;
    } else {
      return NextResponse.json(
        { success: false, error: "Category shipping weight is required (0.15 kg to 1.50 kg)." },
        { status: 400 }
      );
    }

    const category = await prisma.category.create({
      data: {
        brand: admin.brand,
        name,
        slug,
        description: description || null,
        sizeType,
        shippingWeight,
        enabled,
        sortOrder,
      },
    });

    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    console.error("POST /api/admin/categories error:", error);
    return NextResponse.json({ success: false, error: "Failed to create category." }, { status: 500 });
  }
}
