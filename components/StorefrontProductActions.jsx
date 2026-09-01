"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

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

function CartIcon() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
        d="M6 6h15l-1.5 8.5H8L6 3H3"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
        d="M9 19.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3ZM18 19.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Z"
      />
    </svg>
  );
}

export default function StorefrontProductActions({ product }) {
  const router = useRouter();
  const [wishlisted, setWishlisted] = useState(false);
  const [wishlistLoading, setWishlistLoading] = useState(false);
  const [cartAdded, setCartAdded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadWishlist() {
      try {
        const response = await fetch("/api/wishlist", {
          cache: "no-store",
        });

        if (!response.ok) return;

        const data = await response.json().catch(() => null);
        const saved = Array.isArray(data?.wishlist)
          ? data.wishlist.some(
              (item) => item?.productId === product?.id
            )
          : false;

        if (!cancelled) setWishlisted(saved);
      } catch (error) {
        console.error("Failed to load wishlist status:", error);
      }
    }

    if (product?.id) loadWishlist();

    return () => {
      cancelled = true;
    };
  }, [product?.id]);

  async function toggleWishlist(event) {
    event.preventDefault();
    event.stopPropagation();

    if (!product?.id || wishlistLoading) return;

    const previous = wishlisted;
    setWishlisted(!previous);
    setWishlistLoading(true);

    try {
      const response = await fetch("/api/wishlist", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ productId: product.id }),
      });

      const data = await response.json().catch(() => ({}));

      if (response.status === 401) {
        setWishlisted(previous);
        router.push("/login");
        return;
      }

      if (!response.ok) {
        throw new Error(data?.error || "Failed to update wishlist.");
      }

      setWishlisted(Boolean(data.wishlisted));
    } catch (error) {
      console.error("Wishlist update failed:", error);
      setWishlisted(previous);
    } finally {
      setWishlistLoading(false);
    }
  }

  function addToCart(event) {
    event.preventDefault();
    event.stopPropagation();

    if (!product?.id || Number(product.inventory ?? 0) <= 0) return;

    try {
      let cart;

      try {
        cart = JSON.parse(
          localStorage.getItem("cart") ||
            '{"items":[],"total":0,"event":"Verane"}'
        );
      } catch {
        cart = { items: [], total: 0, event: "Verane" };
      }

      if (!Array.isArray(cart.items)) cart.items = [];

      const cartItemKey = `${product.id}||||`;

      const existing = cart.items.find(
        (item) => (item?.cartItemKey || `${item?.id}||||`) === cartItemKey
      );

      const inventory = Math.max(
        0,
        Number(product.inventory ?? 0)
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
        (sum, item) =>
          sum +
          Number(item.price || 0) * Number(item.qty || 0),
        0
      );

      localStorage.setItem("cart", JSON.stringify(cart));
      window.dispatchEvent(new CustomEvent("cart-updated"));

      setCartAdded(true);
      window.setTimeout(() => setCartAdded(false), 900);
    } catch (error) {
      console.error("Failed to add product to cart:", error);
    }
  }

  const soldOut = Number(product?.inventory ?? 0) <= 0;

  return (
    <div className="mt-3 flex items-center gap-2">
      <button
        type="button"
        onClick={toggleWishlist}
        disabled={wishlistLoading}
        aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
        aria-pressed={wishlisted}
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition ${
          wishlisted
            ? "border-white bg-white text-black"
            : "border-white/10 bg-white/[0.03] text-white/50 hover:border-white/25 hover:text-white"
        } ${wishlistLoading ? "opacity-50" : ""}`}
      >
        <HeartIcon filled={wishlisted} />
      </button>

      <button
        type="button"
        onClick={addToCart}
        disabled={soldOut}
        className={`flex h-10 flex-1 items-center justify-center gap-2 rounded-full px-4 text-[10px] font-black uppercase tracking-[0.12em] transition ${
          soldOut
            ? "cursor-not-allowed border border-white/5 bg-white/[0.03] text-white/20"
            : cartAdded
            ? "bg-emerald-400 text-black"
            : "bg-white text-black hover:bg-amber-400"
        }`}
      >
        <CartIcon />
        {soldOut ? "Sold Out" : cartAdded ? "Added" : "Add to Cart"}
      </button>
    </div>
  );
}
