import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

function normalizeBrand(value) {
  if (!value) return "";

  const brand = String(value)
    .trim()
    .toUpperCase();

  if (
    brand === "UTHY" ||
    brand === "UTHY_LUXURY"
  ) {
    return "UTHY";
  }

  if (
    brand === "ALOMZIEE" ||
    brand === "ALOMZIEE_FOOTIES"
  ) {
    return "ALOMZIEE";
  }

  return brand;
}


/*
|--------------------------------------------------------------------------
| POST
|--------------------------------------------------------------------------
|
| Creates the actual collaboration product.
|
| A collaboration product contains:
|
| - one product from Brand A
| - one product from Brand B
| - its own name
| - its own description
| - its own price
| - its own status
|
*/

import { getAdminSession } from "@/lib/admin-auth";

/**
 * Creates a collaboration product for an authorized brand administrator.
 *
 * Validates the collaboration, source product, pricing, and status, and uses
 * provided images or images inherited from the associated products.
 *
 * @param {Request} request - The request containing collaboration product data.
 * @return {Promise<Response>} The created collaboration product or an error response.
 */
export async function POST(request) {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: "Unauthorized." },
        { status: 401 }
      );
    }

    if (session.role !== "UTHY" && session.role !== "ALOMZIEE") {
      return NextResponse.json(
        { success: false, error: "Forbidden. Brand admin session required." },
        { status: 403 }
      );
    }

    const adminBrand = session.role; // "UTHY" or "ALOMZIEE"

    const body = await request.json();

    const collaborationId = String(body?.collaborationId || "").trim();
    let productAId = String(body?.productAId || "").trim();
    let productBId = String(body?.productBId || "").trim();
    const sourceProductId = String(body?.sourceProductId || "").trim();

    if (!productAId && sourceProductId) {
      productAId = sourceProductId;
    }

    const name = String(body?.name || "").trim();
    const description = String(body?.description || "").trim();
    const price = Number(body?.price);
    const requestedStatus = String(body?.status || "published").trim().toLowerCase();
    const status = requestedStatus === "draft" ? "draft" : "published";

    if (!collaborationId) {
      return NextResponse.json(
        { success: false, error: "Collaboration ID is required." },
        { status: 400 }
      );
    }

    if (!productAId) {
      return NextResponse.json(
        { success: false, error: "A source store product is required." },
        { status: 400 }
      );
    }

    if (!name) {
      return NextResponse.json(
        { success: false, error: "Collaboration product name is required." },
        { status: 400 }
      );
    }

    if (Number.isNaN(price) || price <= 0) {
      return NextResponse.json(
        { success: false, error: "A valid collaboration price is required." },
        { status: 400 }
      );
    }

    const collaboration = await prisma.collaboration.findUnique({
      where: { id: collaborationId },
    });

    if (!collaboration) {
      return NextResponse.json(
        { success: false, error: "Collaboration not found." },
        { status: 404 }
      );
    }

    // Verify brand admin is allowed to manage this collaboration
    const collabBrandA = normalizeBrand(collaboration.brandA);
    const collabBrandB = normalizeBrand(collaboration.brandB);

    if (collabBrandA !== adminBrand && collabBrandB !== adminBrand) {
      return NextResponse.json(
        { success: false, error: "Forbidden. You can only manage collaboration products for your brand's collaborations." },
        { status: 403 }
      );
    }

    if (collaboration.status !== "active" && collaboration.status !== "accepted") {
      return NextResponse.json(
        { success: false, error: "The collaboration must be active before creating a collaboration product." },
        { status: 400 }
      );
    }

    const sourceProduct = await prisma.product.findUnique({ where: { id: productAId } });
    if (!sourceProduct) {
      return NextResponse.json(
        { success: false, error: "Selected source product could not be found." },
        { status: 404 }
      );
    }

    let partnerProduct = null;
    if (productBId) {
      partnerProduct = await prisma.product.findUnique({ where: { id: productBId } });
    } else {
      productBId = productAId;
      partnerProduct = sourceProduct;
    }

    // Photo handling:
    // If body.images or body.customImages is provided as a non-empty array/string, use custom photos.
    // Otherwise, automatically fall back to all images from sourceProduct (and partnerProduct if distinct).
    let imagesList = [];
    const customImagesRaw = body?.customImages ?? body?.images;

    if (customImagesRaw) {
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

    if (imagesList.length === 0) {
      // Fallback: inherit all images from sourceProduct
      if (sourceProduct.images) {
        try {
          const parsed = JSON.parse(sourceProduct.images);
          if (Array.isArray(parsed)) imagesList.push(...parsed);
          else if (typeof parsed === "string") imagesList.push(parsed);
        } catch {
          if (typeof sourceProduct.images === "string") {
            imagesList.push(...sourceProduct.images.split(",").map((x) => x.trim()).filter(Boolean));
          }
        }
      }

      if (partnerProduct && partnerProduct.id !== sourceProduct.id && partnerProduct.images) {
        try {
          const parsed = JSON.parse(partnerProduct.images);
          if (Array.isArray(parsed)) imagesList.push(...parsed);
          else if (typeof parsed === "string") imagesList.push(parsed);
        } catch {
          if (typeof partnerProduct.images === "string") {
            imagesList.push(...partnerProduct.images.split(",").map((x) => x.trim()).filter(Boolean));
          }
        }
      }
    }

    const collaborationProduct = await prisma.collaborationProduct.create({
      data: {
        collaborationId,
        productAId,
        productBId,
        name,
        description: description || sourceProduct.description || null,
        price,
        images: JSON.stringify(imagesList),
        status,
      },
      include: {
        collaboration: true,
        productA: {
          include: {
            productColors: true,
            variants: {
              include: {
                color: true,
              },
            },
          },
        },
        productB: {
          include: {
            productColors: true,
            variants: {
              include: {
                color: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json(
      {
        success: true,
        product: collaborationProduct,
        collaborationProduct,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("CREATE COLLABORATION PRODUCT ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Failed to create collaboration product.",
      },
      { status: 500 }
    );
  }
}

/**
 * Lists collaboration products available to the authenticated administrator.
 * @param {Request} request - Request containing an optional `collaborationId` query parameter.
 * @returns {Promise<Response>} A response containing the matching collaboration products, or an error response.
 */
export async function GET(request) {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: "Unauthorized." },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const collaborationId = searchParams.get("collaborationId");

    const products = await prisma.collaborationProduct.findMany({
      where: collaborationId ? { collaborationId } : undefined,
      include: {
        collaboration: true,
        productA: true,
        productB: true,
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    // Filter products if brand admin
    let filteredProducts = products;
    if (session.role !== "SUPERADMIN") {
      filteredProducts = products.filter(
        (p) =>
          normalizeBrand(p.collaboration.brandA) === session.role ||
          normalizeBrand(p.collaboration.brandB) === session.role
      );
    }

    return NextResponse.json({
      success: true,
      products: filteredProducts,
    });
  } catch (error) {
    console.error("GET COLLABORATION PRODUCTS ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Failed to load collaboration products.",
      },
      { status: 500 }
    );
  }
}