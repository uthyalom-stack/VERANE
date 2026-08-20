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

export async function GET(request, { params }) {
  try {
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

    const brandAProducts =
      await prisma.product.findMany({
        where: {
          brand: {
            in: [
              collaboration.brandA,
              normalizeBrand(
                collaboration.brandA
              ) === "UTHY"
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
              normalizeBrand(
                collaboration.brandB
              ) === "UTHY"
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

    if (!Number.isFinite(price) || price < 0) {
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

    if (collaboration.status !== "active") {
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

    /*
     * Make sure each selected product actually
     * belongs to one of the two collaborating brands.
     */

    const allowedBrands = [
      collaboration.brandA,
      collaboration.brandB,
      collaboration.brandA === "UTHY"
        ? "UTHY_LUXURY"
        : "ALOMZIEE_FOOTIES",
      collaboration.brandB === "UTHY"
        ? "UTHY_LUXURY"
        : "ALOMZIEE_FOOTIES",
    ];

    if (!allowedBrands.includes(productA.brand)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Product A does not belong to a collaborating brand.",
        },
        { status: 400 }
      );
    }

    if (!allowedBrands.includes(productB.brand)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Product B does not belong to a collaborating brand.",
        },
        { status: 400 }
      );
    }

    if (productA.brand === productB.brand) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Choose products from two different brands.",
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

          images: JSON.stringify([
            ...(productA.images
              ? String(productA.images)
                  .split(",")
                  .map((x) => x.trim())
                  .filter(Boolean)
              : []),

            ...(productB.images
              ? String(productB.images)
                  .split(",")
                  .map((x) => x.trim())
                  .filter(Boolean)
              : []),
          ]),

          status: "draft",
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