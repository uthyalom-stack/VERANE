```jsx
"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useEffect, useMemo } from "react";
import Link from "next/link";

function parseArray(value) {
  if (!value) return [];

  if (Array.isArray(value)) return value;

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function getBrandName(brand) {
  if (brand === "UTHY_LUXURY") return "UTHY LUXURY";
  if (brand === "ALOMZIEE_FOOTIES") return "ALOMZIEE FOOTIES";
  return brand || "VÉRANE";
}

export default function ProductDetail() {
  const { id } = useParams();
  const router = useRouter();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [qty, setQty] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedColor, setSelectedColor] = useState(null);
  const [added, setAdded] = useState(false);
  const [wishlist, setWishlist] = useState(false);

  useEffect(() => {
    async function loadProduct() {
      try {
        setLoading(true);
        setError(false);

        const response = await fetch("/api/products");

        if (!response.ok) {
          throw new Error("Failed to load products");
        }

        const products = await response.json();

        const found = products.find(
          (item) => String(item.id) === String(id)
        );

        if (!found) {
          setProduct(null);
        } else {
          setProduct(found);

          const colors = parseArray(found.colors);

          if (colors.length > 0) {
            setSelectedColor(colors[0]);
          }
        }
      } catch (err) {
        console.error("Failed to load product:", err);
        setError(true);
      } finally {
        setLoading(false);
      }
    }

    if (id) {
      loadProduct();
    }
  }, [id]);

  const images = useMemo(() => {
    return parseArray(product?.images);
  }, [product]);

  const colors = useMemo(() => {
    return parseArray(product?.colors);
  }, [product]);

  const inventory = Number(product?.inventory || 0);
  const price = Number(product?.price || 0);
  const isOutOfStock = inventory <= 0;

  const maxQty = Math.max(1, inventory);

  const totalPrice = price * qty;

  const addToCart = () => {
    if (!product || isOutOfStock) return;

    try {
      const cart = JSON.parse(
        localStorage.getItem("cart") ||
          '{"items":[],"total":0,"event":"Verane"}'
      );

      if (!Array.isArray(cart.items)) {
        cart.items = [];
      }

      const existing = cart.items.find(
        (item) => String(item.id) === String(product.id)
      );

      if (existing) {
        existing.qty = Math.min(
          existing.qty + qty,
          inventory
        );

        if (selectedColor) {
          existing.selectedColor = selectedColor;
        }
      } else {
        cart.items.push({
          ...product,
          qty,
          selectedColor: selectedColor || null,
        });
      }

      cart.total = cart.items.reduce(
        (sum, item) =>
          sum + Number(item.price || 0) * Number(item.qty || 0),
        0
      );

      localStorage.setItem("cart", JSON.stringify(cart));

      setAdded(true);

      setTimeout(() => {
        setAdded(false);
      }, 2500);
    } catch (err) {
      console.error("Failed to add product to cart:", err);
    }
  };

  const buyNow = () => {
    addToCart();
    router.push("/cart");
  };

  const decreaseQty = () => {
    setQty((current) => Math.max(1, current - 1));
  };

  const increaseQty = () => {
    setQty((current) => Math.min(maxQty, current + 1));
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-black text-white">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 py-10 md:py-20">
          <div className="h-4 w-24 bg-neutral-900 rounded animate-pulse mb-10" />

          <div className="grid lg:grid-cols-[1.15fr_0.85fr] gap-10 lg:gap-20">
            <div className="space-y-4">
              <div className="aspect-[4/5] bg-neutral-900 rounded-[2rem] animate-pulse" />

              <div className="grid grid-cols-4 gap-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className="aspect-square bg-neutral-900 rounded-xl animate-pulse"
                  />
                ))}
              </div>
            </div>

            <div className="pt-4 lg:pt-12 space-y-5">
              <div className="h-3 w-32 bg-neutral-900 rounded animate-pulse" />
              <div className="h-14 w-4/5 bg-neutral-900 rounded-xl animate-pulse" />
              <div className="h-8 w-32 bg-neutral-900 rounded animate-pulse" />
              <div className="h-24 w-full bg-neutral-900 rounded-xl animate-pulse mt-8" />
              <div className="h-14 w-full bg-neutral-900 rounded-full animate-pulse" />
              <div className="h-14 w-full bg-neutral-900 rounded-full animate-pulse" />
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center px-5">
        <div className="text-center max-w-md">
          <p className="text-amber-400 text-[10px] font-bold tracking-[0.35em] uppercase mb-4">
            Something went wrong
          </p>

          <h1 className="text-3xl font-black">
            We couldn't load this piece.
          </h1>

          <p className="text-neutral-500 text-sm mt-4">
            Please try again or return to the collection.
          </p>

          <Link
            href="/catalog"
            className="inline-flex mt-8 bg-white text-black px-6 py-3 rounded-full text-xs font-black uppercase tracking-wider"
          >
            Back to Collection
          </Link>
        </div>
      </main>
    );
  }

  if (!product) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center px-5">
        <div className="text-center">
          <p className="text-amber-400 text-[10px] font-bold tracking-[0.35em] uppercase mb-4">
            VÉRANE
          </p>

          <h1 className="text-3xl font-black">
            Product not found.
          </h1>

          <Link
            href="/catalog"
            className="inline-flex mt-8 text-amber-400 text-sm hover:text-amber-300"
          >
            ← Back to collection
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white">

      {/* TOP NAVIGATION */}
      <div className="max-w-7xl mx-auto px-5 sm:px-8 pt-7 md:pt-10">
        <div className="flex items-center justify-between">
          <Link
            href="/catalog"
            className="group inline-flex items-center gap-2 text-neutral-500 hover:text-white transition text-xs uppercase tracking-[0.15em] font-bold"
          >
            <span className="group-hover:-translate-x-1 transition-transform">
              ←
            </span>
            Collection
          </Link>

          <button
            onClick={() => setWishlist((current) => !current)}
            aria-label="Add to wishlist"
            className={`w-11 h-11 rounded-full border flex items-center justify-center transition ${
              wishlist
                ? "bg-white text-black border-white"
                : "border-white/10 text-neutral-400 hover:text-white hover:border-white/30"
            }`}
          >
            <svg
              className="w-4 h-4"
              fill={wishlist ? "currentColor" : "none"}
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.7}
                d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78Z"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* PRODUCT */}
      <section className="max-w-7xl mx-auto px-5 sm:px-8 py-8 md:py-14 lg:py-20">

        <div className="grid lg:grid-cols-[1.15fr_0.85fr] gap-10 lg:gap-20">

          {/* IMAGE GALLERY */}
          <div>

            <div className="relative aspect-[4/5] bg-neutral-950 rounded-[2rem] overflow-hidden group">

              {images.length > 0 ? (
                <img
                  key={images[selectedImage]}
                  src={images[selectedImage]}
                  alt={product.name || "Product"}
                  className="w-full h-full object-cover transition-opacity duration-300"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-neutral-900 to-black">
                  <span className="text-neutral-700 text-xs uppercase tracking-[0.3em]">
                    No Image
                  </span>
                </div>
              )}

              {/* IMAGE NUMBER */}
              {images.length > 1 && (
                <div className="absolute bottom-4 right-4 bg-black/60 backdrop-blur-md border border-white/10 rounded-full px-3 py-1.5 text-[9px] text-white/70">
                  {selectedImage + 1} / {images.length}
                </div>
              )}

              {/* PREVIOUS */}
              {images.length > 1 && selectedImage > 0 && (
                <button
                  onClick={() =>
                    setSelectedImage((current) => current - 1)
                  }
                  aria-label="Previous image"
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 backdrop-blur-md border border-white/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition hover:bg-white hover:text-black"
                >
                  ←
                </button>
              )}

              {/* NEXT */}
              {images.length > 1 &&
                selectedImage < images.length - 1 && (
                  <button
                    onClick={() =>
                      setSelectedImage((current) => current + 1)
                    }
                    aria-label="Next image"
                    className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 backdrop-blur-md border border-white/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition hover:bg-white hover:text-black"
                  >
                    →
                  </button>
                )}

              {/* SOLD OUT */}
              {isOutOfStock && (
                <div className="absolute top-5 left-5 bg-black/80 backdrop-blur-md border border-white/10 rounded-full px-4 py-2 text-[9px] font-bold uppercase tracking-[0.2em] text-neutral-300">
                  Sold Out
                </div>
              )}
            </div>

            {/* THUMBNAILS */}
            {images.length > 1 && (
              <div className="grid grid-cols-4 sm:grid-cols-5 gap-3 mt-4">
                {images.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImage(index)}
                    className={`aspect-square rounded-xl overflow-hidden border transition ${
                      selectedImage === index
                        ? "border-amber-500"
                        : "border-white/5 hover:border-white/20"
                    }`}
                  >
                    <img
                      src={image}
                      alt={`${product.name} view ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* PRODUCT INFORMATION */}
          <div className="lg:pt-8">

            {/* BRAND */}
            <div className="flex items-center gap-3 mb-5">
              <p className="text-amber-400 text-[10px] font-black tracking-[0.35em] uppercase">
                {getBrandName(product.brand)}
              </p>

              {product.category && (
                <>
                  <span className="w-1 h-1 rounded-full bg-neutral-700" />
                  <p className="text-[10px] text-neutral-600 uppercase tracking-[0.2em]">
                    {product.category}
                  </p>
                </>
              )}
            </div>

            {/* NAME */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-[-0.04em] leading-[0.95]">
              {product.name}
            </h1>

            {/* PRICE */}
            <div className="mt-7 flex items-center gap-4">
              <p className="text-2xl md:text-3xl font-semibold">
                ₦{price.toLocaleString()}
              </p>

              {!isOutOfStock && inventory <= 5 && (
                <span className="text-[9px] text-amber-400 uppercase tracking-[0.15em] font-bold">
                  Only {inventory} left
                </span>
              )}
            </div>

            {/* DESCRIPTION */}
            {product.description && (
              <div className="mt-8 pt-8 border-t border-white/5">
                <p className="text-neutral-400 text-sm md:text-base leading-7">
                  {product.description}
                </p>
              </div>
            )}

            {/* COLORS */}
            {colors.length > 0 && (
              <div className="mt-8">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-neutral-400">
                    Color
                  </p>

                  {selectedColor && (
                    <span className="text-[10px] text-neutral-600">
                      {selectedColor}
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  {colors.map((color, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedColor(color)}
                      className={`px-4 py-2.5 rounded-full border text-xs transition ${
                        selectedColor === color
                          ? "border-amber-500 bg-amber-500/10 text-white"
                          : "border-white/10 text-neutral-400 hover:border-white/30 hover:text-white"
                      }`}
                    >
                      {color}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* QUANTITY */}
            {!isOutOfStock && (
              <div className="mt-8">
                <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-neutral-400 mb-3">
                  Quantity
                </p>

                <div className="inline-flex items-center border border-white/10 rounded-full p-1">
                  <button
                    onClick={decreaseQty}
                    disabled={qty <= 1}
                    className="w-10 h-10 rounded-full flex items-center justify-center text-lg text-neutral-400 hover:bg-white hover:text-black disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-neutral-400 transition"
                  >
                    −
                  </button>

                  <span className="w-12 text-center text-sm font-bold">
                    {qty}
                  </span>

                  <button
                    onClick={increaseQty}
                    disabled={qty >= maxQty}
                    className="w-10 h-10 rounded-full flex items-center justify-center text-lg text-neutral-400 hover:bg-white hover:text-black disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-neutral-400 transition"
                  >
                    +
                  </button>
                </div>
              </div>
            )}

            {/* ACTIONS */}
            <div className="mt-9 space-y-3">

              <button
                onClick={addToCart}
                disabled={isOutOfStock}
                className={`w-full py-4 rounded-full text-xs font-black uppercase tracking-[0.15em] transition ${
                  isOutOfStock
                    ? "bg-neutral-900 text-neutral-600 cursor-not-allowed"
                    : added
                    ? "bg-white text-black"
                    : "bg-amber-500 text-black hover:bg-amber-400 hover:scale-[1.01]"
                }`}
              >
                {isOutOfStock
                  ? "Sold Out"
                  : added
                  ? "Added to Cart ✓"
                  : `Add to Cart — ₦${totalPrice.toLocaleString()}`}
              </button>

              {!isOutOfStock && (
                <button
                  onClick={buyNow}
                  className="w-full py-4 rounded-full border border-white/10 text-xs font-black uppercase tracking-[0.15em] text-white hover:bg-white hover:text-black transition"
                >
                  Buy Now
                </button>
              )}
            </div>

            {/* PRODUCT PROMISES */}
            <div className="grid grid-cols-3 gap-2 mt-8">
              <div className="border border-white/5 bg-neutral-950 rounded-2xl p-4 text-center">
                <div className="text-lg mb-2">✦</div>
                <p className="text-[8px] uppercase tracking-[0.12em] text-neutral-500 leading-relaxed">
                  Premium
                  <br />
                  Craft
                </p>
              </div>

              <div className="border border-white/5 bg-neutral-950 rounded-2xl p-4 text-center">
                <div className="text-lg mb-2">↗</div>
                <p className="text-[8px] uppercase tracking-[0.12em] text-neutral-500 leading-relaxed">
                  Secure
                  <br />
                  Checkout
                </p>
              </div>

              <div className="border border-white/5 bg-neutral-950 rounded-2xl p-4 text-center">
                <div className="text-lg mb-2">◇</div>
                <p className="text-[8px] uppercase tracking-[0.12em] text-neutral-500 leading-relaxed">
                  Made
                  <br />
                  With Care
                </p>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* PRODUCT DETAILS */}
      <section className="border-t border-white/5 bg-neutral-950">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 py-16 md:py-24">

          <div className="grid md:grid-cols-2 gap-10 md:gap-20">

            <div>
              <p className="text-amber-400 text-[9px] font-bold tracking-[0.3em] uppercase mb-4">
                The Piece
              </p>

              <h2 className="text-3xl md:text-4xl font-black">
                Made to be
                <br />
                <span className="text-neutral-600">
                  remembered.
                </span>
              </h2>
            </div>

            <div className="text-sm text-neutral-400 leading-7 space-y-6">

              {product.style && (
                <div className="flex justify-between gap-6 border-b border-white/5 pb-4">
                  <span className="text-neutral-600 uppercase tracking-wider text-[9px]">
                    Style
                  </span>
                  <span className="text-right text-neutral-300">
                    {product.style}
                  </span>
                </div>
              )}

              {product.occasion && (
                <div className="flex justify-between gap-6 border-b border-white/5 pb-4">
                  <span className="text-neutral-600 uppercase tracking-wider text-[9px]">
                    Occasion
                  </span>
                  <span className="text-right text-neutral-300">
                    {product.occasion}
                  </span>
                </div>
              )}

              {product.outfitLayer && (
                <div className="flex justify-between gap-6 border-b border-white/5 pb-4">
                  <span className="text-neutral-600 uppercase tracking-wider text-[9px]">
                    Outfit Layer
                  </span>
                  <span className="text-right text-neutral-300">
                    {product.outfitLayer}
                  </span>
                </div>
              )}

              <div className="flex justify-between gap-6 border-b border-white/5 pb-4">
                <span className="text-neutral-600 uppercase tracking-wider text-[9px]">
                  Collection
                </span>
                <span className="text-right text-neutral-300">
                  {getBrandName(product.brand)}
                </span>
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* BUILD THE LOOK */}
      <section className="border-t border-white/5">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 py-16 md:py-24">

          <div className="rounded-[2rem] border border-white/10 bg-neutral-950 overflow-hidden relative">

            <div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 via-transparent to-transparent pointer-events-none" />

            <div className="relative px-7 py-12 md:px-14 md:py-16 flex flex-col md:flex-row md:items-center justify-between gap-8">

              <div>
                <p className="text-amber-400 text-[9px] font-bold tracking-[0.3em] uppercase mb-3">
                  VÉRANE STUDIO
                </p>

                <h2 className="text-3xl md:text-5xl font-black leading-none">
                  BUILD THE
                  <br />
                  <span className="text-neutral-600">
                    COMPLETE LOOK.
                  </span>
                </h2>

                <p className="text-neutral-500 text-sm mt-5 max-w-lg leading-relaxed">
                  Combine this piece with clothing, footwear and
                  accessories from across VÉRANE.
                </p>
              </div>

              <Link
                href="/outfit-builder"
                className="shrink-0 bg-white text-black px-7 py-4 rounded-full text-xs font-black uppercase tracking-wider hover:bg-amber-400 transition text-center"
              >
                Build Your Look →
              </Link>

            </div>
          </div>

        </div>
      </section>

    </main>
  );
}
```
