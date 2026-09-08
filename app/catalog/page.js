import prisma from "@/lib/prisma";
import CatalogClient from "./CatalogClient";

export const revalidate = 60; // Revalidate every minute

/**
 * Server Component for the /catalog route.
 * Retrieves initial catalog products and collections directly from Prisma server-side.
 */
export default async function CatalogPage({ searchParams }) {
  const resolvedSearchParams = (await searchParams) || {};
  const brandParam = resolvedSearchParams.brand || "all";

  const queryOptions = {
    where: {
      archivedAt: null,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 16,
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
  };

  let products = [];
  let collections = [];

  try {
    const [fetchedProducts, fetchedCollections] = await Promise.all([
      prisma.product.findMany(queryOptions),
      prisma.collection.findMany({
        where: { enabled: true },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    products = fetchedProducts.map((product) => ({
      id: product.id,
      name: product.name,
      price: Number(product.price || 0),
      brand: product.brand,
      category: product.category,
      description: product.description,
      images: product.images,
      inventory: Math.max(0, Number(product.inventory || 0)),
      preOrderEnabled: Boolean(product.preOrderEnabled),
      customSizingEnabled: Boolean(product.customSizingEnabled),
      fulfillmentTime: product.fulfillmentTime || null,
      sizeType: product.sizeType || null,
      style: product.style || null,
      occasion: product.occasion || null,
      collectionId: product.collectionId || null,
      createdAt: product.createdAt ? product.createdAt.toISOString() : null,
      categoryRef: product.categoryRef
        ? {
            id: product.categoryRef.id,
            name: product.categoryRef.name,
            slug: product.categoryRef.slug,
          }
        : null,
      collection: product.collection
        ? {
            id: product.collection.id,
            name: product.collection.name,
          }
        : null,
      productColors: (product.productColors || []).map((c) => ({
        id: c.id,
        name: c.name,
        hex: c.hex,
      })),
      variants: (product.variants || []).map((v) => ({
        id: v.id,
        productId: v.productId,
        stock: Math.max(0, Number(v.stock || 0)),
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
    }));

    collections = fetchedCollections.map((col) => ({
      id: col.id,
      name: col.name,
      enabled: col.enabled,
    }));
  } catch (error) {
    console.error("Error loading catalog data in Server Component:", error);
  }

  return (
    <CatalogClient
      initialProducts={products}
      initialCollections={collections}
      initialBrand={brandParam}
    />
  );
}
