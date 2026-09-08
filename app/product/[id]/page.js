import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import ProductDetailClient from "./ProductDetailClient";

async function getProduct(id) {
  try {
    const product = await prisma.product.findFirst({
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

    if (!product) {
      return null;
    }

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
  } catch (error) {
    console.error("Failed to load product server-side:", error);
    return null;
  }
}

export async function generateMetadata({ params }) {
  const { id } = await params;
  const product = await getProduct(id);

  if (!product) {
    return {
      title: "Product Not Found — VÉRANE",
      description: "The requested VÉRANE piece could not be found.",
    };
  }

  const brandName =
    product.brand === "UTHY_LUXURY"
      ? "UTHY LUXURY"
      : product.brand === "ALOMZIEE_FOOTIES"
      ? "ALOMZIEE FOOTIES"
      : "VÉRANE";

  let firstImage = null;
  try {
    const parsed =
      typeof product.images === "string"
        ? JSON.parse(product.images)
        : product.images;
    if (Array.isArray(parsed) && parsed.length > 0) {
      firstImage = parsed[0];
    }
  } catch {
    firstImage = null;
  }

  return {
    title: `${product.name} — ${brandName}`,
    description:
      product.description ||
      `Discover ${product.name} from the ${brandName} collection at VÉRANE.`,
    openGraph: {
      title: `${product.name} — ${brandName}`,
      description: product.description,
      images: firstImage ? [{ url: firstImage }] : [],
    },
  };
}

export default async function ProductDetailPage({ params }) {
  const { id } = await params;
  const product = await getProduct(id);

  if (!product) {
    notFound();
  }

  return <ProductDetailClient product={product} />;
}