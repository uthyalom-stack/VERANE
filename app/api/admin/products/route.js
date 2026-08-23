import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAdminSession } from "@/lib/admin-auth";

export async function GET() {
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
          error: "Super Admin does not manage store products.",
        },
        { status: 403 }
      );
    }

    const products = await prisma.product.findMany({
      where: {
        brand: admin.brand,
      },
      include: {
        categoryRef: true,
        collection: true,

        productColors: {
          orderBy: {
            createdAt: "asc",
          },
        },

        variants: {
          include: {
            color: true,
          },
          orderBy: {
            createdAt: "asc",
          },
        },
      },

      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(products);
  } catch (error) {
    console.error(
      "GET /api/admin/products error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Failed to load products.",
      },
      { status: 500 }
    );
  }
}

export async function POST(request) {
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
          error: "Super Admin cannot create store products.",
        },
        { status: 403 }
      );
    }

    const body = await request.json();

    const name =
      typeof body.name === "string"
        ? body.name.trim()
        : "";

    const categoryInput =
      typeof body.category === "string"
        ? body.category.trim()
        : "";

    if (!name) {
      return NextResponse.json(
        {
          success: false,
          error: "Product name is required.",
        },
        { status: 400 }
      );
    }

    if (!categoryInput) {
      return NextResponse.json(
        {
          success: false,
          error: "Product category is required.",
        },
        { status: 400 }
      );
    }

    const category =
      await prisma.category.findFirst({
        where: {
          brand: admin.brand,
          enabled: true,
          OR: [
            {
              id: categoryInput,
            },
            {
              slug: categoryInput,
            },
            {
              name: categoryInput,
            },
          ],
        },
      });

    if (!category) {
      return NextResponse.json(
        {
          success: false,
          error: "That category does not belong to your store.",
        },
        { status: 400 }
      );
    }

    const price = Number(body.price);

    if (
      !Number.isFinite(price) ||
      price <= 0
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "A valid product price is required.",
        },
        { status: 400 }
      );
    }

    /*
     * COLORS
     */

    const colors = Array.isArray(body.colors)
      ? body.colors
          .filter(
            (color) =>
              color &&
              typeof color === "object" &&
              typeof color.name === "string" &&
              typeof color.hex === "string"
          )
          .map((color) => ({
            name: color.name.trim(),
            hex: color.hex.trim(),
          }))
          .filter(
            (color) =>
              color.name &&
              /^#[0-9A-Fa-f]{6}$/.test(
                color.hex
              )
          )
      : [];

    if (!colors.length) {
      return NextResponse.json(
        {
          success: false,
          error: "At least one product color is required.",
        },
        { status: 400 }
      );
    }

    /*
     * VARIANTS
     *
     * The frontend currently sends:
     *
     * {
     *   colorName,
     *   colorHex,
     *   size,
     *   stock,
     *   initialStock
     * }
     *
     * Older code expected colorIndex.
     *
     * This API now supports BOTH.
     */

    const rawVariants = Array.isArray(body.variants)
      ? body.variants
      : [];

    const variants = rawVariants
      .filter(
        (variant) =>
          variant &&
          typeof variant === "object"
      )
      .map((variant) => {
        /*
         * First try colorIndex for compatibility
         * with older frontend code.
         */
        let colorIndex = null;

        if (
          variant.colorIndex !== undefined &&
          variant.colorIndex !== null &&
          variant.colorIndex !== ""
        ) {
          const parsedIndex = Number(
            variant.colorIndex
          );

          if (
            Number.isInteger(parsedIndex) &&
            parsedIndex >= 0 &&
            parsedIndex < colors.length
          ) {
            colorIndex = parsedIndex;
          }
        }

        /*
         * If colorIndex was not supplied,
         * identify the color using colorName.
         */
        if (
          colorIndex === null &&
          typeof variant.colorName === "string"
        ) {
          const variantColorName =
            variant.colorName.trim().toLowerCase();

          const foundIndex =
            colors.findIndex(
              (color) =>
                color.name.trim().toLowerCase() ===
                variantColorName
            );

          if (foundIndex !== -1) {
            colorIndex = foundIndex;
          }
        }

        /*
         * If colorName did not match,
         * try colorHex as a fallback.
         */
        if (
          colorIndex === null &&
          typeof variant.colorHex === "string"
        ) {
          const variantColorHex =
            variant.colorHex.trim().toLowerCase();

          const foundIndex =
            colors.findIndex(
              (color) =>
                color.hex.trim().toLowerCase() ===
                variantColorHex
            );

          if (foundIndex !== -1) {
            colorIndex = foundIndex;
          }
        }

        const stockNumber =
          Number(variant.stock);

        const initialStockNumber =
          variant.initialStock !== undefined &&
          variant.initialStock !== null &&
          variant.initialStock !== ""
            ? Number(variant.initialStock)
            : stockNumber;

        return {
          colorIndex,

          size:
            typeof variant.size === "string" &&
            variant.size.trim()
              ? variant.size.trim()
              : null,

          stock:
            Number.isInteger(stockNumber) &&
            stockNumber >= 0
              ? stockNumber
              : 0,

          initialStock:
            Number.isInteger(
              initialStockNumber
            ) &&
            initialStockNumber >= 0
              ? initialStockNumber
              : 0,
        };
      })
      .filter(
        (variant) =>
          variant.colorIndex !== null
      );

    /*
     * Make sure every color has inventory.
     *
     * For products without sizes:
     *
     * Ivory -> 10
     * Black -> 5
     *
     * For products with sizes:
     *
     * Ivory -> S -> 4
     * Ivory -> M -> 6
     * Black -> S -> 3
     * Black -> M -> 8
     */

    for (
      let index = 0;
      index < colors.length;
      index++
    ) {
      const hasVariant =
        variants.some(
          (variant) =>
            variant.colorIndex === index
        );

      if (!hasVariant) {
        return NextResponse.json(
          {
            success: false,
            error: `Inventory is missing for ${colors[index].name}.`,
          },
          { status: 400 }
        );
      }
    }

    /*
     * Calculate inventory on the server.
     */

    const totalInventory =
      variants.reduce(
        (total, variant) =>
          total + variant.stock,
        0
      );

    const totalInitialInventory =
      variants.reduce(
        (total, variant) =>
          total + variant.initialStock,
        0
      );

    /*
     * CREATE PRODUCT
     */

    const product =
      await prisma.product.create({
        data: {
          name,

          brand: admin.brand,

          category: category.slug,

          categoryId: category.id,

          price,

          description:
            typeof body.description === "string"
              ? body.description.trim()
              : "",

          images: JSON.stringify(
            Array.isArray(body.images)
              ? body.images
              : []
          ),

          inventory:
            totalInventory,

          initialInventory:
            totalInitialInventory,

          legacyColors:
            Array.isArray(
              body.legacyColors
            )
              ? JSON.stringify(
                  body.legacyColors
                )
              : null,

          style:
            typeof body.style === "string"
              ? body.style.trim()
              : "",

          occasion:
            typeof body.occasion === "string"
              ? body.occasion.trim()
              : "",

          outfitLayer:
            typeof body.outfitLayer === "string"
              ? body.outfitLayer
              : "none",

          outfitCompatible:
            Boolean(
              body.outfitCompatible
            ),

          mannequinAsset:
            typeof body.mannequinAsset ===
              "string" &&
            body.mannequinAsset
              ? body.mannequinAsset
              : null,

          preOrderEnabled:
            Boolean(
              body.preOrderEnabled
            ),

          customSizingEnabled:
            Boolean(
              body.customSizingEnabled
            ),

          fulfillmentTime:
            typeof body.fulfillmentTime ===
              "string" &&
            body.fulfillmentTime.trim()
              ? body.fulfillmentTime.trim()
              : null,

          sizeType:
            typeof body.sizeType === "string" &&
            body.sizeType.trim()
              ? body.sizeType.trim()
              : null,
        },
      });

    /*
     * CREATE COLORS
     */

    await prisma.productColor.createMany({
      data: colors.map((color) => ({
        productId: product.id,
        name: color.name,
        hex: color.hex,
      })),
    });

    /*
     * GET CREATED COLORS
     */

    const createdColors =
      await prisma.productColor.findMany({
        where: {
          productId: product.id,
        },
        orderBy: {
          createdAt: "asc",
        },
      });

    /*
     * CREATE VARIANTS
     */

    const variantData = variants.map(
      (variant) => {
        const color =
          createdColors[
            variant.colorIndex
          ];

        if (!color) {
          throw new Error(
            "Invalid product color reference."
          );
        }

        return {
          productId: product.id,

          colorId: color.id,

          size: variant.size,

          stock: variant.stock,

          initialStock:
            variant.initialStock,
        };
      }
    );

    if (variantData.length) {
      await prisma.productVariant.createMany({
        data: variantData,
      });
    }

    /*
     * RETURN COMPLETE PRODUCT
     */

    const createdProduct =
      await prisma.product.findUnique({
        where: {
          id: product.id,
        },

        include: {
          categoryRef: true,
          collection: true,

          productColors: {
            orderBy: {
              createdAt: "asc",
            },
          },

          variants: {
            include: {
              color: true,
            },

            orderBy: {
              createdAt: "asc",
            },
          },
        },
      });

    return NextResponse.json(
      createdProduct,
      { status: 201 }
    );
  } catch (error) {
    console.error(
      "POST /api/admin/products error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error?.message ||
          "Failed to create product.",
      },
      { status: 500 }
    );
  }
}