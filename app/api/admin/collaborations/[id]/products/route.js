import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

function normalizeBrand(value) {
  if (!value) return null;

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

import { getAdminSession } from "@/lib/admin-auth";

/**
 * Retrieves collaboration products for a specific collaboration by ID.
 * @param {Request} request - The Next.js request object.
 * @param {Object} params - Route parameters containing the collaboration ID.
 * @returns {Promise<NextResponse>} JSON response with collaboration and its products.
 */
export async function GET(request, { params }) {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: "Unauthorized." },
        { status: 401 }
      );
    }

    const { id } = await params;

    const collaboration =
      await prisma.collaboration.findUnique({
        where: {
          id,
        },
        include: {
          products: {
            include: {
              productA: true,
              productB: true,
            },
            orderBy: {
              createdAt: "desc",
            },
          },
        },
      });

    if (!collaboration) {
      return NextResponse.json(
        {
          success: false,
          error: "Collaboration not found.",
        },
        { status: 404 }
      );
    }

    const collabBrandA = normalizeBrand(collaboration.brandA);
    const collabBrandB = normalizeBrand(collaboration.brandB);

    if (session.role !== "SUPERADMIN") {
      if (collabBrandA !== session.role && collabBrandB !== session.role) {
        return NextResponse.json(
          { success: false, error: "Forbidden. Access denied to this collaboration." },
          { status: 403 }
        );
      }
    }

    const brandAProducts =
      await prisma.product.findMany({
        where: {
          brand: {
            in: [
              collaboration.brandA,
              collabBrandA === "UTHY"
                ? "UTHY_LUXURY"
                : "ALOMZIEE_FOOTIES",
            ],
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

    const brandBProducts =
      await prisma.product.findMany({
        where: {
          brand: {
            in: [
              collaboration.brandB,
              collabBrandB === "UTHY"
                ? "UTHY_LUXURY"
                : "ALOMZIEE_FOOTIES",
            ],
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

    return NextResponse.json({
      success: true,
      collaboration,
      brandAProducts,
      brandBProducts,
    });
  } catch (error) {
    console.error(
      "GET COLLABORATION PRODUCTS ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error?.message ||
          "Failed to load collaboration products.",
      },
      { status: 500 }
    );
  }
}

export async function POST(request, { params }) {
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

    const { id } = await params;

    const body = await request.json();

    const productAId =
      String(body?.productAId || "").trim();

    const productBId =
      String(body?.productBId || "").trim();

    const name =
      String(body?.name || "").trim();

    const description =
      String(body?.description || "").trim();

    const price = Number(body?.price);

    const requestedStatus =
      String(body?.status || "published").trim().toLowerCase();

    const status = requestedStatus === "draft" ? "draft" : "published";

    if (!productAId || !productBId) {
      return NextResponse.json(
        {
          success: false,
          error:
            "You must select one product from each brand.",
        },
        { status: 400 }
      );
    }

    if (!name) {
      return NextResponse.json(
        {
          success: false,
          error:
            "A collaboration product name is required.",
        },
        { status: 400 }
      );
    }

    if (!Number.isFinite(price) || price <= 0) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Enter a valid collaboration product price.",
        },
        { status: 400 }
      );
    }

    const collaboration =
      await prisma.collaboration.findUnique({
        where: {
          id,
        },
      });

    if (!collaboration) {
      return NextResponse.json(
        {
          success: false,
          error: "Collaboration not found.",
        },
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
        {
          success: false,
          error:
            "This collaboration is not active.",
        },
        { status: 400 }
      );
    }

    const [productA, productB] =
      await Promise.all([
        prisma.product.findUnique({
          where: {
            id: productAId,
          },
        }),

        prisma.product.findUnique({
          where: {
            id: productBId,
          },
        }),
      ]);

    if (!productA) {
      return NextResponse.json(
        {
          success: false,
          error: "Product A was not found.",
        },
        { status: 404 }
      );
    }

    if (!productB) {
      return NextResponse.json(
        {
          success: false,
          error: "Product B was not found.",
        },
        { status: 404 }
      );
    }

    const productABrand = normalizeBrand(productA.brand);
    const productBBrand = normalizeBrand(productB.brand);

    const validPair =
      (productABrand === collabBrandA && productBBrand === collabBrandB) ||
      (productABrand === collabBrandB && productBBrand === collabBrandA);

    if (!validPair) {
      return NextResponse.json(
        {
          success: false,
          error:
            "The selected products must come from the two brands in this collaboration.",
        },
        { status: 400 }
      );
    }

    /*
     * Prevent the same pair from being created twice.
     */

    const existing =
      await prisma.collaborationProduct.findFirst({
        where: {
          collaborationId: id,
          OR: [
            {
              productAId,
              productBId,
            },
            {
              productAId: productBId,
              productBId: productAId,
            },
          ],
        },
      });

    if (existing) {
      return NextResponse.json(
        {
          success: false,
          error:
            "This product combination already exists in the collaboration.",
          collaborationProduct: existing,
        },
        { status: 409 }
      );
    }

    const imagesList = [];
    if (productA.images) {
      try {
        const parsed = JSON.parse(productA.images);
        if (Array.isArray(parsed)) imagesList.push(...parsed);
        else if (typeof parsed === "string") imagesList.push(parsed);
      } catch {
        imagesList.push(productA.images);
      }
    }

    if (productB.images) {
      try {
        const parsed = JSON.parse(productB.images);
        if (Array.isArray(parsed)) imagesList.push(...parsed);
        else if (typeof parsed === "string") imagesList.push(parsed);
      } catch {
        imagesList.push(productB.images);
      }
    }

    const collaborationProduct =
      await prisma.collaborationProduct.create({
        data: {
          collaborationId: id,

          productAId,
          productBId,

          name,

          description:
            description || null,

          price,

          images: JSON.stringify(imagesList),

          status,
        },

        include: {
          productA: true,
          productB: true,
        },
      });

    return NextResponse.json(
      {
        success: true,
        collaborationProduct,
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error(
      "CREATE COLLABORATION PRODUCT ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error?.message ||
          "Failed to create collaboration product.",
      },
      { status: 500 }
    );
  }
}