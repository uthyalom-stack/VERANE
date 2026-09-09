"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { productRequiresOptions, getProductStockStatus } from "@/lib/product-options";

/* Module-scoped singleton promise to collapse concurrent /api/wishlist fetches into 1 request */
let globalWishlistPromise = null;

function getSharedWishlistSet() {
  if (!globalWishlistPromise) {
    globalWishlistPromise = fetch("/api/wishlist", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        const set = new Set();
        if (Array.isArray(data?.wishlist)) {
          data.wishlist.forEach((item) => {
            if (item?.productId) set.add(item.productId);
          });
        }
        return set;
      })
      .catch((err) => {
        console.error("Shared wishlist fetch error:", err);
        return new Set();
      });
  }
  return globalWishlistPromise;
}

function getProductPrimaryImage(images) {
  if (!images) return null;

  try {
    if (Array.isArray(images)) return images[0] || null;

    if (typeof images === "string") {
      const parsed = JSON.parse(images);
      if (Array.isArray(parsed)) return parsed[0] || null;
      if (typeof parsed === "string") return parsed;
    }
  } catch {
    if (typeof images === "string") {
      const first = images
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)[0];
      return first || null;
    }
  }

  return null;
}

function getBrandDisplayName(brand) {
  if (brand === "UTHY_LUXURY") return "UTHY LUXURY";
  if (brand === "ALOMZIEE_FOOTIES") return "ALOMZIEE FOOTIES";
  return brand || "VÉRANE";
}

function formatPriceNaira(price) {
  const number = Number(price || 0);
  return "₦" + number.toLocaleString("en-NG");
}

function HeartIcon({ filled }) {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={filled ? 1.5 : 1.8}
        d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78Z"
      />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg className="h-4 w-4 animate-spin text-current" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" strokeDasharray="20 40" />
    </svg>
  );
}

/**
 * Universal Storefront ProductCard component supporting:
 * - `standard`: Balanced editorial product presentation
 * - `uthy`: Couture / fashion house presentation with portrait focus, serif display, and minimalist metadata
 * - `alomziee`: Handcrafted / footwear presentation with clean square silhouette focus and detail highlights
 *
 * All interactive controls (<button>) are positioned as sibling overlays OUTSIDE <Link> tags
 * to avoid invalid nested interactive HTML elements.
 *
 * @param {Object} props
 * @param {Object} props.product - The product database object or DTO
 * @param {"standard"|"uthy"|"alomziee"} [props.variant="standard"] - Card visual presentation mode
 * @param {boolean} [props.priority=false] - Eager image loading for top-of-page products
 * @param {string} [props.className=""] - Additional container CSS classes
 */
export default function ProductCard({
  product,
  variant = "standard",
  priority = false,
  className = "",
}) {
  const router = useRouter();
  const [wishlisted, setWishlisted] = useState(false);
  const [wishlistLoading, setWishlistLoading] = useState(false);
  const [cartBusy, setCartBusy] = useState(false);
  const [cartAdded, setCartAdded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    if (product?.id) {
      getSharedWishlistSet().then((set) => {
        if (!cancelled) setWishlisted(set.has(product.id));
      });
    }

    const handleWishlistUpdated = (event) => {
      if (event?.detail && event.detail.productId === product?.id && !cancelled) {
        setWishlisted(Boolean(event.detail.wishlisted));
      }
    };

    window.addEventListener("wishlist-updated", handleWishlistUpdated);

    return () => {
      cancelled = true;
      window.removeEventListener("wishlist-updated", handleWishlistUpdated);
    };
  }, [product?.id]);

  if (!product) return null;

  const image = getProductPrimaryImage(product.images);
  const stockStatus = getProductStockStatus(product);
  const requiresOptions = productRequiresOptions(product);
  const isSoldOut = stockStatus.isSoldOut;
  const brandName = getBrandDisplayName(product.brand);

  const toggleWishlist = async (event) => {
    event.preventDefault();

    if (!product?.id || wishlistLoading) return;

    const previousState = wishlisted;
    setWishlisted(!previousState);
    setWishlistLoading(true);

    try {
      const response = await fetch("/api/wishlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: product.id }),
      });

      const data = await response.json().catch(() => ({}));

      if (response.status === 401) {
        setWishlisted(previousState);
        router.push("/login");
        return;
      }

      if (!response.ok) {
        throw new Error(data?.error || "Wishlist update failed");
      }

      const isNowWishlisted = Boolean(data.wishlisted);
      setWishlisted(isNowWishlisted);
      globalWishlistPromise = null;

      // Broadcast wishlist state change to all mounted cards
      window.dispatchEvent(
        new CustomEvent("wishlist-updated", {
          detail: { productId: product.id, wishlisted: isNowWishlisted },
        })
      );
    } catch (error) {
      console.error("Wishlist action error:", error);
      setWishlisted(previousState);
    } finally {
      setWishlistLoading(false);
    }
  };

  const handleQuickAction = (event) => {
    event.preventDefault();

    if (!product?.id || isSoldOut || cartBusy) return;

    if (requiresOptions) {
      router.push(`/product/${product.id}`);
      return;
    }

    setCartBusy(true);

    try {
      let cart;
      try {
        cart = JSON.parse(
          localStorage.getItem("cart") || '{"items":[],"total":0,"event":"Verane"}'
        );
      } catch {
        cart = { items: [], total: 0, event: "Verane" };
      }

      if (!Array.isArray(cart.items)) cart.items = [];

      const cartItemKey = `${product.id}||||`;
      const inventory = Math.max(0, Number(product.inventory ?? 0));

      const existing = cart.items.find(
        (item) => (item?.cartItemKey || `${item?.id}||||`) === cartItemKey
      );

      if (existing) {
        existing.cartItemKey = cartItemKey;
        existing.qty = Math.min(
          Number(existing.qty || 0) + 1,
          inventory > 0 ? inventory : Number(existing.qty || 0) + 1
        );
      } else {
        cart.items.push({
          ...product,
          cartItemKey,
          qty: 1,
        });
      }

      cart.total = cart.items.reduce(
        (sum, item) => sum + Number(item.price || 0) * Number(item.qty || 0),
        0
      );

      localStorage.setItem("cart", JSON.stringify(cart));
      window.dispatchEvent(new CustomEvent("cart-updated"));

      setCartAdded(true);
      setTimeout(() => setCartAdded(false), 1200);
    } catch (error) {
      console.error("Quick add error:", error);
    } finally {
      setTimeout(() => setCartBusy(false), 300);
    }
  };

  // Aspect Ratio & Variant-Specific Styling
  const imageAspectClass =
    variant === "uthy"
      ? "aspect-[3/4]"
      : variant === "alomziee"
      ? "aspect-square"
      : "aspect-[4/5]";

  const cardBorderClass =
    variant === "uthy"
      ? "border-white/[0.06] hover:border-amber-400/30"
      : variant === "alomziee"
      ? "border-white/[0.08] hover:border-white/30"
      : "border-white/[0.06] hover:border-amber-400/25";

  return (
    <div className={`group relative flex flex-col justify-between h-full ${className}`}>
      {/* IMAGE CONTAINER WITH NON-NESTED OVERLAYS */}
      <div className="relative w-full">
        <Link
          href={`/product/${product.id}`}
          className={`block relative w-full overflow-hidden rounded-2xl bg-neutral-950 border ${cardBorderClass} transition duration-500 ${imageAspectClass}`}
        >
          {image ? (
            <img
              src={image}
              alt={product.name || "VÉRANE Piece"}
              loading={priority ? "eager" : "lazy"}
              decoding={priority ? "sync" : "async"}
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-neutral-900 to-black text-white/20">
              <span className="text-4xl font-editorial font-light tracking-widest">V</span>
            </div>
          )}

          {/* Vignette Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

          {/* Badges Top Left */}
          <div className="absolute left-3 top-3 z-10 flex flex-col gap-1.5 pointer-events-none">
            <span
              className={`rounded-full border px-2.5 py-1 text-[8px] font-bold uppercase tracking-couture backdrop-blur-md shadow-sm ${stockStatus.colorClass}`}
            >
              {stockStatus.label}
            </span>
          </div>
        </Link>

        {/* Wishlist Button Overlay — SIBLING of <Link>, not a child */}
        <div className="absolute right-3 top-3 z-20 pointer-events-auto">
          <button
            type="button"
            onClick={toggleWishlist}
            disabled={wishlistLoading}
            aria-label={wishlisted ? "Remove from wishlist" : "Save to wishlist"}
            className={`flex h-9 w-9 items-center justify-center rounded-full border backdrop-blur-xl transition-all duration-300 ${
              wishlisted
                ? "border-white bg-white text-black scale-105"
                : "border-white/15 bg-black/60 text-white/70 hover:border-white/40 hover:bg-black/90 hover:text-white"
            } ${wishlistLoading ? "opacity-60 cursor-wait" : ""}`}
          >
            {wishlistLoading ? <SpinnerIcon /> : <HeartIcon filled={wishlisted} />}
          </button>
        </div>

        {/* Desktop Quick Add Bar Overlay — SIBLING of <Link>, not a child */}
        {!isSoldOut && (
          <div className="absolute inset-x-3 bottom-3 z-20 hidden md:block opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300 pointer-events-auto">
            <button
              type="button"
              onClick={handleQuickAction}
              disabled={cartBusy}
              className={`w-full py-2.5 px-4 rounded-full text-[9px] font-black uppercase tracking-luxury transition-all duration-300 shadow-xl ${
                cartAdded
                  ? "bg-emerald-400 text-black"
                  : "bg-white text-black hover:bg-amber-400 hover:scale-[1.01]"
              }`}
            >
              {cartBusy
                ? "Processing..."
                : cartAdded
                ? "Added to Bag"
                : requiresOptions
                ? "CHECK OPTIONS"
                : "QUICK ADD TO CART"}
            </button>
          </div>
        )}
      </div>

      {/* METADATA & INFORMATION */}
      <div className="pt-3.5 px-0.5 flex flex-col flex-1 justify-between">
        <Link href={`/product/${product.id}`} className="block group-hover:opacity-95">
          <p className="text-[9px] font-bold uppercase tracking-couture text-amber-400/90 mb-1">
            {brandName}
          </p>

          <h3
            className={`text-sm md:text-base font-medium text-neutral-100 tracking-tight leading-tight line-clamp-1 ${
              variant === "uthy" ? "font-editorial text-base md:text-lg" : ""
            }`}
          >
            {product.name}
          </h3>

          <div className="mt-1.5 flex items-center justify-between">
            <p className="text-sm md:text-base font-semibold text-white">
              {formatPriceNaira(product.price)}
            </p>

            {product.category && (
              <span className="text-[9px] font-semibold uppercase tracking-luxury text-neutral-500">
                {product.category}
              </span>
            )}
          </div>
        </Link>

        {/* Mobile Quick Action Button — OUTSIDE Link */}
        {!isSoldOut && (
          <div className="mt-3 md:hidden pointer-events-auto">
            <button
              type="button"
              onClick={handleQuickAction}
              disabled={cartBusy}
              className={`w-full py-2 px-3 rounded-full text-[9px] font-bold uppercase tracking-luxury border transition ${
                cartAdded
                  ? "border-emerald-400 bg-emerald-400 text-black"
                  : "border-white/15 bg-white/[0.04] text-neutral-200 hover:border-amber-400/50 hover:bg-amber-400 hover:text-black"
              }`}
            >
              {cartBusy
                ? "..."
                : cartAdded
                ? "Added"
                : requiresOptions
                ? "OPTIONS"
                : "ADD TO CART"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
