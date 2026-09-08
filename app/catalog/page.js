import prisma from "@/lib/prisma";
import CatalogClient from "./CatalogClient";

export const metadata = {
  title: "Catalog — VÉRANE",
  description: "Explore the VÉRANE Luxury & ALOMZIEE Footies collections.",
};

async function getInitialCatalogData(brandParam) {
  try {
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

    if (brandParam && brandParam !== "all") {
      queryOptions.where.brand = brandParam;
    }

    const [products, collections] = await Promise.all([
      prisma.product.findMany(queryOptions),
      prisma.collection.findMany({
        where: { enabled: true },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    const publicProducts = products.map((product) => {
      const publicVariants = (product.variants || []).map((v) => ({
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
      }));

      const publicColors = (product.productColors || []).map((c) => ({
        id: c.id,
        name: c.name,
        hex: c.hex,
      }));

      return {
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
              slug: product.collection.slug,
            }
          : null,
        productColors: publicColors,
        variants: publicVariants,
      };
    });

    const publicCollections = collections.map((col) => ({
      id: col.id,
      name: col.name,
      slug: col.slug,
      enabled: col.enabled,
    }));

    return {
      initialProducts: publicProducts,
      initialCollections: publicCollections,
    };
  } catch (error) {
    console.error("Failed to load server catalog data:", error);
    return {
      initialProducts: [],
      initialCollections: [],
    };
  }
}

export default async function CatalogPage({ searchParams }) {
  const resolvedSearchParams = await searchParams;
  const brand = resolvedSearchParams?.brand || "all";

  const { initialProducts, initialCollections } = await getInitialCatalogData(brand);

  return (
    <CatalogClient
      initialProducts={initialProducts}
      initialCollections={initialCollections}
      initialBrand={brand}
    />
  );
}