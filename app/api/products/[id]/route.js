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
          error: "Super Admin does not manage store products.",
        },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();

    const existingProduct = await prisma.product.findFirst({
      where: {
        id,
        brand: admin.brand,
      },
      include: {
        productColors: {
          orderBy: {
            createdAt: "asc",
          },
        },
        variants: {
          orderBy: {
            createdAt: "asc",
          },
        },
      },
    });

    if (!existingProduct) {
      return NextResponse.json(
        {
          success: false,
          error: "Product not found.",
        },
        { status: 404 }
      );
    }

    const name =
      typeof body.name === "string"
        ? body.name.trim()
        : existingProduct.name;

    if (!name) {
      return NextResponse.json(
        {
          success: false,
          error: "Product name is required.",
        },
        { status: 400 }
      );
    }

    const categoryInput =
      typeof body.category === "string"
        ? body.category.trim()
        : existingProduct.category;

    const category = await prisma.category.findFirst({
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

    if (!Number.isFinite(price) || price <= 0) {
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
     *
     * New format:
     * [
     *   {
     *     name: "Black",
     *     hex: "#000000"
     *   }
     * ]
     *
     * We also support the old frontend format:
     *
     * ["Black", "White"]
     */

    let colors = [];

    if (Array.isArray(body.colors)) {
      colors = body.colors
        .map((color) => {
          if (
            color &&
            typeof color === "object" &&
            typeof color.name === "string" &&
            typeof color.hex === "string"
          ) {
            return {
              name: color.name.trim(),
              hex: color.hex.trim(),
            };
          }

          if (typeof color === "string") {
            return {
              name: color.trim(),
              hex: "#000000",
            };
          }

          return null;
        })
        .filter(Boolean)
        .filter(
          (color) =>
            color.name &&
            /^#[0-9A-Fa-f]{6}$/.test(color.hex)
        );
    }

    /*
     * If the new colors were not supplied,
     * preserve the existing database colors.
     */

    if (!colors.length && existingProduct.productColors.length) {
      colors = existingProduct.productColors.map((color) => ({
        name: color.name,
        hex: color.hex,
      }));
    }

    /*
     * VARIANTS
     *
     * colorIndex refers to the position of the color
     * supplied by the browser.
     */

    const rawVariants = Array.isArray(body.variants)
      ? body.variants
      : [];

    let variants = rawVariants
      .filter(
        (variant) =>
          variant &&
          typeof variant === "object"
      )
      .map((variant) => {
        const colorIndex = Number(
          variant.colorIndex
        );

        const stock = Number(variant.stock);

        const initialStock =
          variant.initialStock !== undefined &&
          variant.initialStock !== null &&
          variant.initialStock !== ""
            ? Number(variant.initialStock)
            : stock;

        return {
          colorIndex: Number.isInteger(colorIndex)
            ? colorIndex
            : null,

          size:
            typeof variant.size === "string" &&
            variant.size.trim()
              ? variant.size.trim()
              : null,

          stock:
            Number.isInteger(stock) && stock >= 0
              ? stock
              : 0,

          initialStock:
            Number.isInteger(initialStock) &&
            initialStock >= 0
              ? initialStock
              : 0,
        };
      })
      .filter(
        (variant) =>
          variant.colorIndex !== null &&
          variant.colorIndex >= 0 &&
          variant.colorIndex < colors.length
      );

    /*
     * If the edit request does not contain variants,
     * preserve the existing variants.
     *
     * This prevents the older edit page from
     * accidentally deleting inventory.
     */

    if (
      !rawVariants.length &&
      existingProduct.variants.length
    ) {
      variants = existingProduct.variants.map(
        (variant) => {
          const existingColorIndex =
            existingProduct.productColors.findIndex(
              (color) =>
                color.id === variant.colorId
            );

          return {
            colorIndex:
              existingColorIndex >= 0
                ? existingColorIndex
                : 0,

            size: variant.size,

            stock: variant.stock,

            initialStock: variant.initialStock,
          };
        }
      );
    }

    /*
     * Require inventory for every color.
     */

    for (
      let index = 0;
      index < colors.length;
      index++
    ) {
      const hasVariant = variants.some(
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
     * Calculate inventory from variants.
     */

    const totalInventory = variants.reduce(
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
     * Transaction:
     *
     * 1. Update product
     * 2. Delete old colors
     * 3. Create new colors
     * 4. Create new variants
     *
     * ProductVariant.colorId has SetNull,
     * so deleting colors will not break the variants.
     */

    const updatedProduct =
      await prisma.$transaction(async (tx) => {
        const product =
          await tx.product.update({
            where: {
              id,
            },

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

              inventory: totalInventory,

              initialInventory:
                totalInitialInventory,

              legacyColors:
                Array.isArray(body.legacyColors)
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
                Boolean(body.outfitCompatible),

              mannequinAsset:
                typeof body.mannequinAsset === "string" &&
                body.mannequinAsset
                  ? body.mannequinAsset
                  : null,

              preOrderEnabled:
                Boolean(body.preOrderEnabled),

              customSizingEnabled:
                Boolean(body.customSizingEnabled),

              fulfillmentTime:
                typeof body.fulfillmentTime === "string" &&
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
         * Remove old variants first.
         */

        await tx.productVariant.deleteMany({
          where: {
            productId: id,
          },
        });

        /*
         * Remove old colors.
         */

        await tx.productColor.deleteMany({
          where: {
            productId: id,
          },
        });

        /*
         * Create new colors.
         */

        await tx.productColor.createMany({
          data: colors.map((color) => ({
            productId: id,
            name: color.name,
            hex: color.hex,
          })),
        });

        /*
         * Get newly-created colors
         * in the same order.
         */

        const createdColors =
          await tx.productColor.findMany({
            where: {
              productId: id,
            },

            orderBy: {
              createdAt: "asc",
            },
          });

        /*
         * Convert colorIndex into colorId.
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
              productId: id,

              colorId: color.id,

              size: variant.size,

              stock: variant.stock,

              initialStock:
                variant.initialStock,
            };
          }
        );

        if (variantData.length) {
          await tx.productVariant.createMany({
            data: variantData,
          });
        }

        return product;
      });

    /*
     * Return the complete updated product.
     */

    const completeProduct =
      await prisma.product.findUnique({
        where: {
          id: updatedProduct.id,
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
      completeProduct
    );
  } catch (error) {
    console.error(
      "PUT /api/products/[id] error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error?.message ||
          "Failed to update product.",
      },
      { status: 500 }
    );
  }
}

/**
 * Deletes a store product or archives it when it has historical orders.
 * @param {Request} request - The incoming request.
 * @param {{ id: string }} params - Route parameters containing the product ID.
 * @returns {Promise<NextResponse>} A response indicating whether the product was archived or deleted.
 */
export async function DELETE(
  request,
  { params }
) {
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
            "Super Admin does not manage store products.",
        },
        { status: 403 }
      );
    }

    const { id } = await params;

    const existingProduct =
      await prisma.product.findFirst({
        where: {
          id,
          brand: admin.brand,
        },
        include: {
          orderItems: {
            take: 1,
          },
          variants: true,
        },
      });

    if (!existingProduct) {
      return NextResponse.json(
        {
          success: false,
          error: "Product not found or does not belong to your store.",
        },
        { status: 404 }
      );
    }

    const hasOrderHistory = existingProduct.orderItems.length > 0;

    if (hasOrderHistory) {
      // Archive product safely to protect historical orders
      await prisma.$transaction([
        prisma.product.update({
          where: { id },
          data: {
            inventory: 0,
            preOrderEnabled: false,
          },
        }),
        prisma.productVariant.updateMany({
          where: { productId: id },
          data: {
            stock: 0,
          },
        }),
      ]);

      return NextResponse.json({
        success: true,
        archived: true,
        message: "Product has historical order references and was safely archived (unassigned from active inventory) to preserve order history.",
      });
    }

    // Product has never been purchased - safe to hard delete with clean-up
    await prisma.$transaction([
      prisma.waitingList.deleteMany({
        where: { productId: id },
      }),
      prisma.wishlist.deleteMany({
        where: { productId: id },
      }),
      prisma.productVariant.deleteMany({
        where: { productId: id },
      }),
      prisma.productColor.deleteMany({
        where: { productId: id },
      }),
      prisma.product.delete({
        where: { id },
      }),
    ]);

    return NextResponse.json({
      success: true,
      deleted: true,
      message: "Product deleted successfully.",
    });
  } catch (error) {
    console.error(
      "DELETE /api/products/[id] error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error?.message ||
          "Failed to delete product.",
      },
      { status: 500 }
    );
  }
}