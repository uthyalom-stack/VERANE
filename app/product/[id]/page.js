
"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import Link from "next/link";

export default function ProductDetail() {
  const { id } = useParams();
  const router = useRouter();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [qty, setQty] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const [wishlist, setWishlist] = useState(false);
  const [wishlistLoading, setWishlistLoading] = useState(false);

  useEffect(() => {
    async function loadProduct() {
      try {
        const response = await fetch("/api/products", {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Failed to fetch products");
        }

        const products = await response.json();
        const found = products.find((p) => p.id === id);

        setProduct(found || null);
      } catch (error) {
        console.error("Failed to load product:", error);
        setProduct(null);
      } finally {
        setLoading(false);
      }
    }

    async function loadWishlistStatus() {
      try {
        const response = await fetch("/api/wishlist", {
          cache: "no-store",
        });

        if (response.status === 401) {
          return;
        }

        if (!response.ok) {
          return;
        }

        const data = await response.json();

        const isSaved = Array.isArray(data.wishlist)
          ? data.wishlist.some(
              (item) => item.productId === id
            )
          : false;

        setWishlist(isSaved);
      } catch (error) {
        console.error(
          "Failed to load wishlist status:",
          error
        );
      }
    }

    if (id) {
      loadProduct();
      loadWishlistStatus();
    }
  }, [id]);

  const getImages = (images) => {
    if (!images) return [];

    try {
      const parsed =
        typeof images === "string"
          ? JSON.parse(images)
          : images;

      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  const getColors = (colors) => {
    if (!colors) return [];

    try {
      const parsed =
        typeof colors === "string"
          ? JSON.parse(colors)
          : colors;

      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  const getBrandName = (brand) => {
    if (brand === "UTHY_LUXURY") {
      return "UTHY LUXURY";
    }

    if (brand === "ALOMZIEE_FOOTIES") {
      return "ALOMZIEE FOOTIES";
    }

    return brand || "VÉRANE";
  };

  const toggleWishlist = async () => {
    if (!product || wishlistLoading) {
      return;
    }

    setWishlistLoading(true);

    try {
      const response = await fetch("/api/wishlist", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          productId: product.id,
        }),
      });

      const data = await response.json();

      if (response.status === 401) {
        router.push("/login");
        return;
      }

      if (!response.ok) {
        throw new Error(
          data?.error || "Failed to update wishlist"
        );
      }

      setWishlist(Boolean(data.wishlisted));
    } catch (error) {
      console.error(
        "Wishlist update failed:",
        error
      );
    } finally {
      setWishlistLoading(false);
    }
  };

  const addToCart = () => {
    if (!product) return;

    const cart = JSON.parse(
      localStorage.getItem("cart") ||
        '{"items":[],"total":0,"event":"Verane"}'
    );

    if (!Array.isArray(cart.items)) {
      cart.items = [];
    }

    const existing = cart.items.find(
      (item) => item.id === product.id
    );

    if (existing) {
      existing.qty += qty;
    } else {
      cart.items.push({
        ...product,
        qty,
      });
    }

    cart.total = cart.items.reduce(
      (sum, item) =>
        sum +
        Number(item.price || 0) *
          Number(item.qty || 0),
      0
    );

    localStorage.setItem(
      "cart",
      JSON.stringify(cart)
    );

    router.push("/cart");
  };

  const images = product
    ? getImages(product.images)
    : [];

  const colors = product
    ? getColors(product.colors)
    : [];

  const inventory = Number(
    product?.inventory ?? 0
  );

  const isOutOfStock = inventory <= 0;

  if (loading) {
    return (
      <main className="min-h-screen bg-black text-white">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 py-16 md:py-24">
          <div className="h-3 w-20 bg-neutral-900 rounded-full animate-pulse mb-8" />

          <div className="grid md:grid-cols-2 gap-10 lg:gap-16">
            <div className="aspect-[4/5] bg-neutral-900 rounded-[2rem] animate-pulse" />

            <div className="space-y-5 pt-4 md:pt-10">
              <div className="h-3 w-32 bg-neutral-900 rounded animate-pulse" />

              <div className="h-14 md:h-20 w-4/5 bg-neutral-900 rounded-2xl animate-pulse" />

              <div className="h-8 w-40 bg-neutral-900 rounded animate-pulse" />

              <div className="h-24 w-full bg-neutral-900 rounded-2xl animate-pulse mt-8" />

              <div className="h-14 w-full bg-neutral-900 rounded-full animate-pulse mt-8" />
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (!product) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center px-5">
        <div className="text-center">
          <p className="text-neutral-500 text-sm uppercase tracking-[0.2em]">
            Product not found
          </p>

          <Link
            href="/catalog"
            className="text-amber-400 text-sm mt-5 inline-block hover:text-amber-300 transition"
          >
            ← Back to catalog
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white">

      {/* BACK */}
      <div className="max-w-7xl mx-auto px-5 sm:px-8 pt-8 md:pt-12">
        <Link
          href="/catalog"
          className="inline-flex items-center gap-2 text-neutral-500 text-xs uppercase tracking-[0.15em] hover:text-white transition"
        >
          <span>←</span>
          Back to collection
        </Link>
      </div>

      {/* PRODUCT */}
      <section className="max-w-7xl mx-auto px-5 sm:px-8 py-8 md:py-12 lg:py-16">
        <div className="grid md:grid-cols-2 gap-10 lg:gap-16">

          {/* IMAGES */}
          <div>
            <div className="relative aspect-[4/5] bg-neutral-950 rounded-[2rem] overflow-hidden border border-white/5">

              {images.length > 0 ? (
                <img
                  src={images[selectedImage]}
                  alt={product.name || "Product"}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-neutral-900 to-black">
                  <span className="text-neutral-700 text-xs uppercase tracking-[0.3em]">
                    No Image
                  </span>
                </div>
              )}

              {/* IMAGE COUNTER */}
              {images.length > 1 && (
                <div className="absolute bottom-4 right-4 bg-black/60 backdrop-blur-md border border-white/10 rounded-full px-3 py-1.5 text-[9px] text-neutral-300">
                  {selectedImage + 1} / {images.length}
                </div>
              )}

              {/* SOLD OUT */}
              {isOutOfStock && (
                <span className="absolute top-5 left-5 bg-black/80 backdrop-blur-md border border-white/10 text-neutral-300 px-4 py-2 rounded-full text-[9px] font-bold uppercase tracking-[0.15em]">
                  Sold Out
                </span>
              )}
            </div>

            {/* THUMBNAILS */}
            {images.length > 1 && (
              <div className="flex gap-3 mt-4 overflow-x-auto pb-1">
                {images.map((img, index) => (
                  <button
                    key={index}
                    onClick={() =>
                      setSelectedImage(index)
                    }
                    className={`shrink-0 w-20 h-24 md:w-24 md:h-28 rounded-xl overflow-hidden border-2 transition-all ${
                      index === selectedImage
                        ? "border-amber-500"
                        : "border-white/5 hover:border-white/20"
                    }`}
                    aria-label={`View image ${
                      index + 1
                    }`}
                  >
                    <img
                      src={img}
                      alt={`${product.name} ${
                        index + 1
                      }`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* DETAILS */}
          <div className="flex flex-col">

            {/* BRAND */}
            <p className="text-amber-400 text-[10px] md:text-xs font-bold tracking-[0.35em] uppercase mb-4">
              {getBrandName(product.brand)}
            </p>

            {/* NAME + WISHLIST */}
            <div className="flex items-start justify-between gap-5">

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-[-0.04em] leading-[0.95]">
                {product.name}
              </h1>

              {/* WISHLIST HEART */}
              <button
                type="button"
                onClick={toggleWishlist}
                disabled={wishlistLoading}
                aria-label={
                  wishlist
                    ? "Remove from wishlist"
                    : "Add to wishlist"
                }
                aria-pressed={wishlist}
                className={`shrink-0 w-11 h-11 rounded-full border flex items-center justify-center transition-all duration-300 ${
                  wishlist
                    ? "bg-white text-black border-white"
                    : "border-white/10 text-neutral-400 hover:text-white hover:border-white/30"
                } ${
                  wishlistLoading
                    ? "opacity-50 cursor-wait"
                    : ""
                }`}
              >
                <svg
                  className="w-5 h-5"
                  fill={
                    wishlist
                      ? "currentColor"
                      : "none"
                  }
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={
                      wishlist ? 1 : 1.7
                    }
                    d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78Z"
                  />
                </svg>
              </button>
            </div>

            {/* CATEGORY */}
            {product.category && (
              <p className="text-[10px] text-neutral-600 uppercase tracking-[0.2em] mt-4">
                {product.category}
              </p>
            )}

            {/* PRICE */}
            <div className="mt-7">
              <p className="text-3xl md:text-4xl font-bold">
                ₦
                {Number(
                  product.price || 0
                ).toLocaleString()}
              </p>

              {!isOutOfStock && (
                <p className="text-xs text-emerald-500 mt-2">
                  In stock
                  {inventory > 0 &&
                  inventory < 10
                    ? ` · Only ${inventory} left`
                    : ""}
                </p>
              )}
            </div>

            {/* DESCRIPTION */}
            {product.description && (
              <div className="mt-8 pt-8 border-t border-white/5">
                <p className="text-neutral-400 text-sm md:text-base leading-relaxed">
                  {product.description}
                </p>
              </div>
            )}

            {/* COLORS */}
            {colors.length > 0 && (
              <div className="mt-8">
                <p className="text-[10px] text-neutral-500 uppercase tracking-[0.2em] font-bold mb-3">
                  Available Colors
                </p>

                <div className="flex flex-wrap gap-2">
                  {colors.map((color, index) => (
                    <span
                      key={index}
                      className="px-4 py-2.5 rounded-full border border-white/10 text-xs text-neutral-300"
                    >
                      {color}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* QUANTITY */}
            {!isOutOfStock && (
              <div className="mt-8">
                <p className="text-[10px] text-neutral-500 uppercase tracking-[0.2em] font-bold mb-3">
                  Quantity
                </p>

                <div className="inline-flex items-center gap-5 border border-white/10 rounded-full px-2 py-2">

                  <button
                    onClick={() =>
                      setQty(
                        Math.max(1, qty - 1)
                      )
                    }
                    className="w-9 h-9 rounded-full bg-neutral-900 border border-white/5 text-lg hover:bg-neutral-800 transition"
                    aria-label="Decrease quantity"
                  >
                    −
                  </button>

                  <span className="text-sm font-bold w-5 text-center">
                    {qty}
                  </span>

                  <button
                    onClick={() =>
                      setQty(
                        Math.min(
                          inventory || qty + 1,
                          qty + 1
                        )
                      )
                    }
                    className="w-9 h-9 rounded-full bg-neutral-900 border border-white/5 text-lg hover:bg-neutral-800 transition"
                    aria-label="Increase quantity"
                  >
                    +
                  </button>

                </div>
              </div>
            )}

            {/* ADD TO CART */}
            <button
              onClick={addToCart}
              disabled={isOutOfStock}
              className={`mt-8 w-full px-8 py-4 rounded-full font-bold text-sm uppercase tracking-[0.12em] transition-all ${
                isOutOfStock
                  ? "bg-neutral-800 text-neutral-500 cursor-not-allowed"
                  : "bg-amber-500 text-black hover:bg-amber-400 hover:scale-[1.01]"
              }`}
            >
              {isOutOfStock
                ? "Sold Out"
                : `Add to Cart — ₦${(
                    Number(
                      product.price || 0
                    ) * qty
                  ).toLocaleString()}`}
            </button>

            {/* BENEFITS */}
            <div className="mt-8 grid grid-cols-3 gap-2 md:gap-3">

              <div className="border border-white/5 rounded-2xl p-4 text-center">
                <div className="text-lg mb-2">
                  🚚
                </div>

                <p className="text-[9px] md:text-[10px] text-neutral-500 uppercase tracking-wider">
                  Worldwide shipping
                </p>
              </div>

              <div className="border border-white/5 rounded-2xl p-4 text-center">
                <div className="text-lg mb-2">
                  🔒
                </div>

                <p className="text-[9px] md:text-[10px] text-neutral-500 uppercase tracking-wider">
                  Secure checkout
                </p>
              </div>

              <div className="border border-white/5 rounded-2xl p-4 text-center">
                <div className="text-lg mb-2">
                  ✋
                </div>

                <p className="text-[9px] md:text-[10px] text-neutral-500 uppercase tracking-wider">
                  Crafted with care
                </p>
              </div>

            </div>

            {/* PRODUCT INFO */}
            <div className="mt-10 border-t border-white/5">

              {product.style && (
                <div className="flex justify-between py-4 border-b border-white/5 text-sm">
                  <span className="text-neutral-500">
                    Style
                  </span>

                  <span className="text-neutral-300">
                    {product.style}
                  </span>
                </div>
              )}

              {product.occasion && (
                <div className="flex justify-between py-4 border-b border-white/5 text-sm">
                  <span className="text-neutral-500">
                    Occasion
                  </span>

                  <span className="text-neutral-300">
                    {product.occasion}
                  </span>
                </div>
              )}

              {product.outfitLayer && (
                <div className="flex justify-between py-4 border-b border-white/5 text-sm">
                  <span className="text-neutral-500">
                    Outfit layer
                  </span>

                  <span className="text-neutral-300">
                    {product.outfitLayer}
                  </span>
                </div>
              )}

            </div>
          </div>
        </div>
      </section>

      {/* OUTFIT BUILDER CTA */}
      <section className="border-t border-white/5 bg-neutral-950">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 py-20 md:py-28">

          <div className="relative overflow-hidden rounded-[2rem] border border-white/10">

            <div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 via-transparent to-transparent" />

            <div className="relative px-7 py-14 md:px-14 md:py-16">

              <p className="text-amber-400 text-[10px] font-bold tracking-[0.35em] uppercase mb-4">
                VÉRANE STUDIO
              </p>

              <h2 className="text-3xl md:text-5xl font-black leading-[0.95]">
                BUILD THE
                <br />
                <span className="text-neutral-500">
                  COMPLETE LOOK.
                </span>
              </h2>

              <p className="text-neutral-400 text-sm max-w-xl mt-5 leading-relaxed">
                Pair this piece with clothing,
                footwear and accessories from
                both VÉRANE collections.
              </p>

              <Link
                href="/outfit-builder"
                className="inline-block mt-7 bg-white text-black px-7 py-4 rounded-full text-xs font-black uppercase tracking-wider hover:bg-neutral-200 transition"
              >
                Open Outfit Builder →
              </Link>

            </div>
          </div>
        </div>
      </section>

    </main>
  );
}