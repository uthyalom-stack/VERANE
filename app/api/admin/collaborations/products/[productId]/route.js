import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAdminSession } from "@/lib/admin-auth";

function normalizeBrand(value) {
  if (!value) return "";
  const brand = String(value).trim().toUpperCase();
  if (brand === "UTHY" || brand === "UTHY_LUXURY") return "UTHY";
  if (brand === "ALOMZIEE" || brand === "ALOMZIEE_FOOTIES") return "ALOMZIEE";
  return brand;
}

export async function GET(request, { params }) {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized." }, { status: 401 });
    }

    const { productId } = await params;

    const collabProduct = await prisma.collaborationProduct.findUnique({
      where: { id: productId },
      include: {
        collaboration: true,
        productA: {
          include: { productColors: true, variants: { include: { color: true } } },
        },
        productB: {
          include: { productColors: true, variants: { include: { color: true } } },
        },
      },
    });

    if (!collabProduct) {
      return NextResponse.json({ success: false, error: "Collaboration product not found." }, { status: 404 });
    }

    if (session.role !== "SUPERADMIN") {
      const brandA = normalizeBrand(collabProduct.collaboration.brandA);
      const brandB = normalizeBrand(collabProduct.collaboration.brandB);
      if (brandA !== session.role && brandB !== session.role) {
        return NextResponse.json({ success: false, error: "Forbidden. Access denied." }, { status: 403 });
      }
    }

    return NextResponse.json({ success: true, product: collabProduct });
  } catch (error) {
    console.error("GET COLLABORATION PRODUCT ERROR:", error);
    return NextResponse.json({ success: false, error: error?.message || "Failed to load product." }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized." }, { status: 401 });
    }

    if (session.role !== "UTHY" && session.role !== "ALOMZIEE") {
      return NextResponse.json({ success: false, error: "Forbidden. Brand admin required." }, { status: 403 });
    }

    const { productId } = await params;
    const body = await request.json();

    const collabProduct = await prisma.collaborationProduct.findUnique({
      where: { id: productId },
      include: { collaboration: true, productA: true, productB: true },
    });

    if (!collabProduct) {
      return NextResponse.json({ success: false, error: "Collaboration product not found." }, { status: 404 });
    }

    const brandA = normalizeBrand(collabProduct.collaboration.brandA);
    const brandB = normalizeBrand(collabProduct.collaboration.brandB);
    if (brandA !== session.role && brandB !== session.role) {
      return NextResponse.json({ success: false, error: "Forbidden. You cannot manage this collaboration." }, { status: 403 });
    }

    const name = body?.name != null ? String(body.name).trim() : collabProduct.name;
    const description = body?.description != null ? String(body.description).trim() : collabProduct.description;
    const price = body?.price != null ? Number(body.price) : collabProduct.price;
    const status = body?.status != null ? (String(body.status).trim().toLowerCase() === "draft" ? "draft" : "published") : collabProduct.status;

    if (!name) {
      return NextResponse.json({ success: false, error: "Collaboration product name is required." }, { status: 400 });
    }

    if (Number.isNaN(price) || price <= 0) {
      return NextResponse.json({ success: false, error: "Valid price is required." }, { status: 400 });
    }

    // Photo update handling:
    let imagesList = [];
    const customImagesRaw = body?.customImages ?? body?.images;

    if (customImagesRaw !== undefined) {
      try {
        const parsed = typeof customImagesRaw === "string" ? JSON.parse(customImagesRaw) : customImagesRaw;
        if (Array.isArray(parsed) && parsed.length > 0) {
          imagesList = parsed.map((x) => String(x).trim()).filter(Boolean);
        } else if (typeof customImagesRaw === "string" && customImagesRaw.trim() && !customImagesRaw.trim().startsWith("[")) {
          imagesList = customImagesRaw.split(",").map((x) => x.trim()).filter(Boolean);
        }
      } catch {
        if (typeof customImagesRaw === "string" && customImagesRaw.trim()) {
          imagesList = customImagesRaw.split(",").map((x) => x.trim()).filter(Boolean);
        }
      }
    }

    // If no custom images set or cleared, fall back to full source product images
    if (imagesList.length === 0) {
      if (collabProduct.productA?.images) {
        try {
          const parsed = JSON.parse(collabProduct.productA.images);
          if (Array.isArray(parsed)) imagesList.push(...parsed);
          else if (typeof parsed === "string") imagesList.push(parsed);
        } catch {
          if (typeof collabProduct.productA.images === "string") {
            imagesList.push(...collabProduct.productA.images.split(",").map((x) => x.trim()).filter(Boolean));
          }
        }
      }
    }

    const updatedProduct = await prisma.collaborationProduct.update({
      where: { id: productId },
      data: {
        name,
        description,
        price,
        status,
        images: JSON.stringify(imagesList),
      },
      include: {
        collaboration: true,
        productA: true,
        productB: true,
      },
    });

    return NextResponse.json({ success: true, product: updatedProduct });
  } catch (error) {
    console.error("UPDATE COLLABORATION PRODUCT ERROR:", error);
    return NextResponse.json({ success: false, error: error?.message || "Failed to update product." }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized." }, { status: 401 });
    }

    if (session.role !== "UTHY" && session.role !== "ALOMZIEE") {
      return NextResponse.json({ success: false, error: "Forbidden. Brand admin required." }, { status: 403 });
    }

    const { productId } = await params;

    const collabProduct = await prisma.collaborationProduct.findUnique({
      where: { id: productId },
      include: { collaboration: true },
    });

    if (!collabProduct) {
      return NextResponse.json({ success: false, error: "Collaboration product not found." }, { status: 404 });
    }

    const brandA = normalizeBrand(collabProduct.collaboration.brandA);
    const brandB = normalizeBrand(collabProduct.collaboration.brandB);
    if (brandA !== session.role && brandB !== session.role) {
      return NextResponse.json({ success: false, error: "Forbidden. You cannot delete this product." }, { status: 403 });
    }

    // Safely delete ONLY the collaboration product record.
    // The source Product records (productA, productB) remain completely untouched.
    await prisma.collaborationProduct.delete({
      where: { id: productId },
    });

    return NextResponse.json({
      success: true,
      message: "Collaboration product deleted successfully. Source products were NOT deleted.",
    });
  } catch (error) {
    console.error("DELETE COLLABORATION PRODUCT ERROR:", error);
    return NextResponse.json({ success: false, error: error?.message || "Failed to delete product." }, { status: 500 });
  }
}
