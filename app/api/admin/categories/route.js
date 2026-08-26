import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAdminSession } from "@/lib/admin-auth";

const VALID_SIZE_TYPES = new Set(["none", "clothing", "footwear", "belt", "custom"]);

function normalizeSizeType(value) {
  const sizeType = typeof value === "string" ? value.trim().toLowerCase() : "none";
  return VALID_SIZE_TYPES.has(sizeType) ? sizeType : null;
}

export async function GET() {
  try {
    const admin = await getAdminSession();
    if (!admin) return NextResponse.json({ success: false, error: "Unauthorized." }, { status: 401 });
    if (admin.isSuperAdmin) return NextResponse.json({ success: false, error: "Super Admin does not manage store categories." }, { status: 403 });

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
    if (!admin) return NextResponse.json({ success: false, error: "Unauthorized." }, { status: 401 });
    if (admin.isSuperAdmin) return NextResponse.json({ success: false, error: "Super Admin does not manage store categories." }, { status: 403 });

    const body = await request.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const description = typeof body.description === "string" ? body.description.trim() : "";
    const slug = typeof body.slug === "string" ? body.slug.trim().toLowerCase() : name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    const enabled = body.enabled !== false;
    const sortOrder = Number.isFinite(Number(body.sortOrder)) ? Number(body.sortOrder) : 0;
    const sizeType = normalizeSizeType(body.sizeType);

    if (!name) return NextResponse.json({ success: false, error: "Category name is required." }, { status: 400 });
    if (!slug) return NextResponse.json({ success: false, error: "A valid category name is required." }, { status: 400 });
    if (!sizeType) return NextResponse.json({ success: false, error: "Please choose a valid sizing type." }, { status: 400 });

    const existing = await prisma.category.findFirst({ where: { brand: admin.brand, slug } });
    if (existing) return NextResponse.json({ success: false, error: "A category with this name already exists." }, { status: 409 });

    const category = await prisma.category.create({
      data: { brand: admin.brand, name, slug, description: description || null, enabled, sortOrder, sizeType },
    });
    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    console.error("POST /api/admin/categories error:", error);
    return NextResponse.json({ success: false, error: error?.message || "Failed to create category." }, { status: 500 });
  }
}