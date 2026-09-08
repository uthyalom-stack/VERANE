import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import ProductDetailClient from "./ProductDetailClient";

export const revalidate = 60; // Revalidate every minute

function getBrandName(brand) {
  if (brand === "UTHY_LUXURY") {
    return "UTHY LUXURY";
  }
  if (brand === "ALOMZIEE_FOOTIES") {
    return "ALOMZIEE FOOTIES";
  }
  return brand || "VÉRANE";
}

/**
 * Dynamic metadata generator for product pages.
 */
export async function generateMetadata({ params }) {
  const { id } = (await params) || {};

  if (!id) {
    return {
      title: "Product | VÉRANE",
    };
  }

  try {
    const product = await prisma.product.findFirst({
      where: {
        id,
        archivedAt: null,
      },
      select: {
        name: true,
        description: true,
        brand: true,
      },
    });

    if (!product) {
      return {
        title: "Product Not Found | VÉRANE",
      };
    }

    const brandName = getBrandName(product.brand);

    return {
      title: `${product.name} — ${brandName} | VÉRANE`,
      description: product.description || `Explore ${product.name} by ${brandName} on VÉRANE.`,
    };
  } catch (error) {
    console.error("Error generating product metadata:", error);
    return {
      title: "Product | VÉRANE",
    };
  }
}

/**
 * Server Component for the /product/[id] route.
 * Retrieves product details directly from Prisma server-side.
 */
export default async function ProductDetailPage({ params }) {
  const { id } = (await params) || {};

  if (!id) {
    notFound();
  }

  let product = null;

  try {
    const rawProduct = await prisma.product.findFirst({
      where: {
        id,
        archivedAt: null,
      },
      include: {
        variants: {
          orderBy: {
            createdAt: "asc",
          },
          include: {
            color: true,
          },
        },
        productColors: {
          orderBy: {
            createdAt: "asc",
          },
        },
        categoryRef: true,
        collection: true,
      },
    });

    if (!rawProduct) {
      notFound();
    }

    product = {
      id: rawProduct.id,
      name: rawProduct.name,
      price: Number(rawProduct.price || 0),
      brand: rawProduct.brand,
      category: rawProduct.category,
      description: rawProduct.description,
      images: rawProduct.images,
      inventory: Math.max(0, Number(rawProduct.inventory || 0)),
      initialInventory: Math.max(0, Number(rawProduct.initialInventory || rawProduct.inventory || 0)),
      preOrderEnabled: Boolean(rawProduct.preOrderEnabled),
      isPreOrder: Boolean(rawProduct.preOrderEnabled),
      customSizingEnabled: Boolean(rawProduct.customSizingEnabled),
      fulfillmentTime: rawProduct.fulfillmentTime || null,
      sizeType: rawProduct.sizeType || null,
      style: rawProduct.style || null,
      occasion: rawProduct.occasion || null,
      outfitLayer: rawProduct.outfitLayer || null,
      createdAt: rawProduct.createdAt ? rawProduct.createdAt.toISOString() : null,
      categoryRef: rawProduct.categoryRef
        ? {
            id: rawProduct.categoryRef.id,
            name: rawProduct.categoryRef.name,
            slug: rawProduct.categoryRef.slug,
          }
        : null,
      collection: rawProduct.collection
        ? {
            id: rawProduct.collection.id,
            name: rawProduct.collection.name,
          }
        : null,
      productColors: (rawProduct.productColors || []).map((c) => ({
        id: c.id,
        name: c.name,
        hex: c.hex,
      })),
      variants: (rawProduct.variants || []).map((v) => ({
        id: v.id,
        productId: v.productId,
        stock: Math.max(0, Number(v.stock || 0)),
        inventory: Math.max(0, Number(v.stock || 0)),
        size: v.size || null,
        colorId: v.colorId || null,
        color: v.color
          ? {
              id: v.color.id,
              name: v.color.name,
              hex: v.color.hex,
            }
          : null,
      })),
    };
  } catch (error) {
    console.error("Error loading product in Server Component:", error);
    notFound();
  }

  return <ProductDetailClient initialProduct={product} />;
}
