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

export async function POST(request) {
  try {
    const body =
      await request.json();

    const collaborationId =
      String(
        body?.collaborationId || ""
      ).trim();

    const productAId =
      String(
        body?.productAId || ""
      ).trim();

    const productBId =
      String(
        body?.productBId || ""
      ).trim();

    const name =
      String(
        body?.name || ""
      ).trim();

    const description =
      String(
        body?.description || ""
      ).trim();

    const price =
      Number(body?.price);

    const status =
      String(
        body?.status || "draft"
      )
        .trim()
        .toLowerCase();

    /*
     * ----------------------------------------------------------
     * VALIDATION
     * ----------------------------------------------------------
     */

    if (!collaborationId) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Collaboration ID is required.",
        },
        { status: 400 }
      );
    }

    if (!productAId) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Product A is required.",
        },
        { status: 400 }
      );
    }

    if (!productBId) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Product B is required.",
        },
        { status: 400 }
      );
    }

    if (!name) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Collaboration product name is required.",
        },
        { status: 400 }
      );
    }

    if (
      Number.isNaN(price) ||
      price <= 0
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "A valid collaboration price is required.",
        },
        { status: 400 }
      );
    }

    /*
     * ----------------------------------------------------------
     * LOAD COLLABORATION
     * ----------------------------------------------------------
     */

    const collaboration =
      await prisma.collaboration.findUnique(
        {
          where: {
            id: collaborationId,
          },
        }
      );

    if (!collaboration) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Collaboration not found.",
        },
        { status: 404 }
      );
    }

    if (
      collaboration.status !==
        "active" &&
      collaboration.status !==
        "accepted"
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "The collaboration must be active before creating a collaboration product.",
        },
        { status: 400 }
      );
    }

    /*
     * ----------------------------------------------------------
     * LOAD BOTH PRODUCTS
     * ----------------------------------------------------------
     */

    const [
      productA,
      productB,
    ] = await Promise.all([
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
          error:
            "Product A could not be found.",
        },
        { status: 404 }
      );
    }

    if (!productB) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Product B could not be found.",
        },
        { status: 404 }
      );
    }

    /*
     * ----------------------------------------------------------
     * VERIFY THE PRODUCTS ACTUALLY BELONG
     * TO THE TWO COLLABORATING BRANDS
     * ----------------------------------------------------------
     */

    const brandA =
      normalizeBrand(
        collaboration.brandA
      );

    const brandB =
      normalizeBrand(
        collaboration.brandB
      );

    const productABrand =
      normalizeBrand(
        productA.brand
      );

    const productBBrand =
      normalizeBrand(
        productB.brand
      );

    const validPair =
      (
        productABrand === brandA &&
        productBBrand === brandB
      ) ||
      (
        productABrand === brandB &&
        productBBrand === brandA
      );

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
     * ----------------------------------------------------------
     * PREVENT DUPLICATE PAIRS
     * ----------------------------------------------------------
     */

    const existing =
      await prisma.collaborationProduct.findFirst(
        {
          where: {
            collaborationId,
            OR: [
              {
                productAId,
                productBId,
              },
              {
                productAId:
                  productBId,
                productBId:
                  productAId,
              },
            ],
          },
        }
      );

    if (existing) {
      return NextResponse.json(
        {
          success: false,
          error:
            "This product combination already exists in this collaboration.",
          product:
            existing,
        },
        { status: 409 }
      );
    }

    /*
     * ----------------------------------------------------------
     * CREATE COLLABORATION PRODUCT
     * ----------------------------------------------------------
     */

    const collaborationProduct =
      await prisma.collaborationProduct.create(
        {
          data: {
            collaborationId,

            productAId,

            productBId,

            name,

            description:
              description || null,

            price,

            images: JSON.stringify(
              [
                productA.images,
                productB.images,
              ]
            ),

            status:
              status === "published"
                ? "published"
                : "draft",
          },

          include: {
            collaboration: true,
            productA: true,
            productB: true,
          },
        }
      );

    return NextResponse.json(
      {
        success: true,

        product:
          collaborationProduct,

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
      {
        status: 500,
      }
    );
  }
}


/*
|--------------------------------------------------------------------------
| GET
|--------------------------------------------------------------------------
|
| Returns all collaboration products.
|
| Optional:
|
| ?collaborationId=...
|
*/

export async function GET(request) {
  try {
    const { searchParams } =
      new URL(request.url);

    const collaborationId =
      searchParams.get(
        "collaborationId"
      );

    const products =
      await prisma.collaborationProduct.findMany(
        {
          where:
            collaborationId
              ? {
                  collaborationId,
                }
              : undefined,

          include: {
            collaboration: true,
            productA: true,
            productB: true,
          },

          orderBy: {
            updatedAt: "desc",
          },
        }
      );

    return NextResponse.json(
      {
        success: true,
        products,
      }
    );
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
      {
        status: 500,
      }
    );
  }
}