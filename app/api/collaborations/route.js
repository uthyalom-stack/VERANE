import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

/**
 * Projects a product into its public storefront representation, removing internal operational stock metadata.
 * @param {Object} product
 * @returns {Object}
 */
function toPublicSourceProduct(product) {
  if (!product) return null;
  return {
    id: product.id,
    name: product.name,
    brand: product.brand,
    category: product.category,
    price: product.price,
    images: product.images,
    productColors: (product.productColors || []).map((c) => ({
      id: c.id,
      name: c.name,
      hex: c.hex,
    })),
    variants: (product.variants || []).map((v) => ({
      id: v.id,
      productId: v.productId,
      size: v.size || null,
      colorId: v.colorId || null,
      color: v.color ? { id: v.color.id, name: v.color.name, hex: v.color.hex } : null,
      isAvailable: Math.max(0, Number(v.stock || 0)) > 0,
    })),
  };
}

/**
 * Projects a collaboration variant into its public storefront representation.
 * @param {Object} cv
 * @returns {Object}
 */
function toPublicCollabVariant(cv) {
  if (!cv) return null;
  return {
    id: cv.id,
    collaborationProductId: cv.collaborationProductId,
    productAVariantId: cv.productAVariantId,
    productBVariantId: cv.productBVariantId,
    productASize: cv.productASize,
    productAColor: cv.productAColor,
    productAColorHex: cv.productAColorHex,
    productBSize: cv.productBSize,
    productBColor: cv.productBColor,
    productBColorHex: cv.productBColorHex,
    isAvailable: Math.max(0, Number(cv.stock || 0)) > 0,
    productAVariant: cv.productAVariant
      ? {
          id: cv.productAVariant.id,
          size: cv.productAVariant.size,
          color: cv.productAVariant.color ? { id: cv.productAVariant.color.id, name: cv.productAVariant.color.name, hex: cv.productAVariant.color.hex } : null,
        }
      : null,
    productBVariant: cv.productBVariant
      ? {
          id: cv.productBVariant.id,
          size: cv.productBVariant.size,
          color: cv.productBVariant.color ? { id: cv.productBVariant.color.id, name: cv.productBVariant.color.name, hex: cv.productBVariant.color.hex } : null,
        }
      : null,
  };
}

/**
 * Projects a collaboration product into its public storefront representation.
 * @param {Object} cp
 * @returns {Object}
 */
function toPublicCollabProduct(cp) {
  if (!cp) return null;
  return {
    id: cp.id,
    collaborationId: cp.collaborationId,
    productAId: cp.productAId,
    productBId: cp.productBId,
    name: cp.name,
    description: cp.description,
    price: cp.price,
    images: cp.images,
    status: cp.status,
    productA: toPublicSourceProduct(cp.productA),
    productB: toPublicSourceProduct(cp.productB),
    variants: (cp.variants || []).map(toPublicCollabVariant).filter(Boolean),
  };
}

export async function GET() {
  try {
    const rawCollaborations = await prisma.collaboration.findMany({
      where: {
        status: "active",
      },
      include: {
        products: {
          where: {
            status: "published",
          },
          include: {
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
            variants: {
              include: {
                productAVariant: {
                  include: {
                    color: true,
                  },
                },
                productBVariant: {
                  include: {
                    color: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    const collaborations = rawCollaborations.map((c) => ({
      id: c.id,
      name: c.name,
      description: c.description,
      brandA: c.brandA,
      brandB: c.brandB,
      status: c.status,
      products: (c.products || []).map(toPublicCollabProduct).filter(Boolean),
    }));

    return NextResponse.json({
      success: true,
      collaborations,
    });
  } catch (error) {
    console.error("GET /api/collaborations error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to load active collaborations.",
      },
      { status: 500 }
    );
  }
}
