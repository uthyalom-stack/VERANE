"use client";

import Link from "next/link";
import StorefrontProductActions from "@/components/StorefrontProductActions";
import { getProductStockStatus } from "@/lib/product-options";

function formatPrice(price) {
  return `₦${Number(price || 0).toLocaleString("en-NG")}`;
}

function extractPrimaryImage(images) {
  if (!images) return "";
  if (Array.isArray(images)) return images[0] || "";

  try {
    const parsed = typeof images === "string" ? JSON.parse(images) : images;
    return Array.isArray(parsed) ? parsed[0] || "" : "";
  } catch {
    return String(images).split(",")[0]?.trim() || "";
  }
}

function getBrandDisplayName(brand) {
  if (brand === "UTHY_LUXURY") return "UTHY LUXURY";
  if (brand === "ALOMZIEE_FOOTIES") return "ALOMZIEE FOOTIES";
  return brand || "VÉRANE";
}

/**
 * Shared Storefront ProductCard primitive.
 * Supports standard, UTHY couture, and ALOMZIEE footwear presentation variants.
 *
 * @param {Object} props
 * @param {Object} props.product - The product object.
 * @param {'standard' | 'uthy' | 'alomziee'} [props.variant='standard'] - Presentation variant.
 * @param {boolean} [props.showActions=true] - Whether to render Quick Add / Wishlist controls.
 * @param {string} [props.className=''] - Additional container styles.
 */
export default function ProductCard({
  product,
  variant = "standard",
  showActions = true,
  className = "",
}) {
  if (!product || !product.id) return null;

  const image = extractPrimaryImage(product.images);
  const stockStatus = getProductStockStatus(product);
  const brandName = getBrandDisplayName(product.brand);

  // Variant-specific aspect ratios
  const aspectClass =
    variant === "uthy"
      ? "aspect-[3/4]"
      : variant === "alomziee"
      ? "aspect-square"
      : "aspect-[4/5]";

  return (
    <div className={`group relative flex flex-col min-w-0 ${className}`}>
      {/* CARD IMAGE CONTAINER */}
      <div className={`relative ${aspectClass} w-full overflow-hidden rounded-2xl bg-neutral-900 border border-white/10 transition duration-300 group-hover:border-amber-400/30`}>
        <Link
          href={`/product/${product.id}`}
          className="absolute inset-0 z-0 block"
          aria-label={`View details for ${product.name || "Product"}`}
        >
          {image ? (
            <img
              src={image}
              alt={product.name || "Product image"}
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover transition duration-700 ease-out group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-neutral-900 text-3xl font-editorial text-white/20">
              VÉRANE
            </div>
          )}
        </Link>

        {/* STOCK / PRE-ORDER BADGE OVERLAY */}
        {stockStatus?.label && (
          <div className="pointer-events-none absolute left-3 top-3 z-10 flex flex-col gap-1">
            <span className={`rounded-full border px-2.5 py-0.5 text-[8px] font-black uppercase tracking-[0.18em] backdrop-blur-md ${stockStatus.colorClass || "border-white/20 bg-black/60 text-white"}`}>
              {stockStatus.label}
            </span>
          </div>
        )}
      </div>

      {/* CARD CONTENT METADATA */}
      <div className="flex flex-col flex-1 pt-3.5 px-0.5">
        <Link href={`/product/${product.id}`} className="block group/title">
          <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-amber-400/90 truncate">
            {brandName}
          </p>
          <h3 className={`mt-0.5 truncate text-xs font-semibold text-white transition group-hover/title:text-amber-300 ${variant === "uthy" ? "font-editorial text-sm font-medium tracking-wide" : ""}`}>
            {product.name || "Unnamed Product"}
          </h3>
          <p className="mt-1 text-xs font-bold text-neutral-300">
            {formatPrice(product.price)}
          </p>
        </Link>

        {/* ACTIONS / QUICK ADD */}
        {showActions && (
          <div className="mt-2.5 pt-2 border-t border-white/5">
            <StorefrontProductActions product={product} />
          </div>
        )}
      </div>
    </div>
  );
}
