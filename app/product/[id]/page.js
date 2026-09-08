"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import Link from "next/link";
import SiteFooter from "@/components/SiteFooter";

export default function ProductDetail() {
  const { id } = useParams();
  const router = useRouter();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);

  const [qty, setQty] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);

  const [wishlist, setWishlist] = useState(false);
  const [wishlistLoading, setWishlistLoading] = useState(false);

  const [selectedColor, setSelectedColor] = useState(null);
  const [selectedSize, setSelectedSize] = useState(null);

  const [selectedVariants, setSelectedVariants] = useState([]);
  const [customSizing, setCustomSizing] = useState("");
  const [sizeGuideOpen, setSizeGuideOpen] = useState(false);

  useEffect(() => {
    async function loadProduct() {
      try {
        const response = await fetch(`/api/products/${id}`, {
          cache: "no-store",
        });

        if (!response.ok) {
          setProduct(null);
          return;
        }

        const found = await response.json();
        setProduct(found && found.id ? found : null);
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

        if (response.status === 401 || !response.ok) {
          return;
        }

        const data = await response.json();
        const isSaved = Array.isArray(data.wishlist)
          ? data.wishlist.some((item) => item.productId === id)
          : false;

        setWishlist(isSaved);
      } catch (error) {
        console.error("Failed to load wishlist status:", error);
      }
    }

    if (id) {
      loadProduct();
      loadWishlistStatus();
    }
  }, [id]);

  const parseArray = (value) => {
    if (!value) return [];
    try {
      const parsed = typeof value === "string" ? JSON.parse(value) : value;
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      if (typeof value === "string") {
        return value.split(",").map((s) => s.trim()).filter(Boolean);
      }
      return [];
    }
  };

  const getImages = (images) => parseArray(images);

  const getBrandName = (brand) => {
    if (brand === "UTHY_LUXURY") return "UTHY LUXURY";
    if (brand === "ALOMZIEE_FOOTIES") return "ALOMZIEE FOOTIES";
    return brand || "VÉRANE";
  };

  const images = product ? getImages(product.images) : [];
  const productColors = Array.isArray(product?.productColors) ? product.productColors : [];
  const variants = Array.isArray(product?.variants) ? product.variants : [];

  const inventory = Math.max(0, Number(product?.inventory ?? 0));
  const initialInventory = Math.max(0, Number(product?.initialInventory ?? inventory));

  const stockPercentage =
    initialInventory > 0 ? (inventory / initialInventory) * 100 : inventory > 0 ? 100 : 0;

  const isPreOrder = Boolean(product?.preOrderEnabled || product?.isPreOrder);
  const customSizingEnabled = Boolean(product?.customSizingEnabled);
  const fulfillmentTime = product?.fulfillmentTime || product?.preOrderFulfillmentTime || "";

  const isFootwear =
    product?.brand === "ALOMZIEE_FOOTIES" ||
    ["shoes", "sandals", "slides", "boots"].includes(String(product?.category || "").toLowerCase());

  const hasSizes = variants.some((v) => Boolean(v.size || v.name || v.value || v.label));
  const needsSizeSelection = hasSizes && !isPreOrder;

  const isOutOfStock = inventory <= 0 && variants.every((v) => (v.stock ?? v.inventory ?? 0) <= 0);

  const stockStatus = isOutOfStock
    ? "Sold Out"
    : stockPercentage <= 25
    ? "Few Left"
    : stockPercentage <= 50
    ? "Almost Sold Out"
    : "Available";

  const stockStatusClass =
    stockStatus === "Sold Out"
      ? "text-red-400"
      : stockStatus === "Few Left"
      ? "text-orange-400"
      : stockStatus === "Almost Sold Out"
      ? "text-amber-400"
      : "text-emerald-400";

  const getColorValue = (color) => {
    if (!color) return "#ffffff";
    return color.hex || color.value || color.color || color.code || "#ffffff";
  };

  const toggleWishlist = async () => {
    if (!product || wishlistLoading) return;
    setWishlistLoading(true);

    try {
      const response = await fetch("/api/wishlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: product.id }),
      });

      const data = await response.json();

      if (response.status === 401) {
        router.push("/login");
        return;
      }

      if (!response.ok) throw new Error(data?.error || "Failed to update wishlist");
      setWishlist(Boolean(data.wishlisted));
    } catch (error) {
      console.error("Wishlist update failed:", error);
    } finally {
      setWishlistLoading(false);
    }
  };

  const addToCart = () => {
    if (!product || isOutOfStock) return;

    if (isPreOrder && customSizingEnabled && !customSizing.trim()) {
      alert("Please enter your sizing or measurements before adding this pre-order to your cart.");
      return;
    }

    if (needsSizeSelection && !selectedSize && selectedVariants.length === 0) {
      alert(isFootwear ? "Please select your footwear size." : "Please select your size.");
      return;
    }

    const chosenColorObj =
      selectedColor && productColors.length > 0
        ? productColors.find((c) => String(c.id) === String(selectedColor))
        : null;

    const chosenColorName = chosenColorObj?.name || chosenColorObj?.label || chosenColorObj?.value || null;

    const exactVar =
      variants.find((variant) => {
        const vSize = variant.size || variant.name || variant.value || variant.label || null;
        const sizeMatches = selectedSize ? Boolean(vSize) && String(vSize) === String(selectedSize) : true;
        const colorMatches = selectedColor ? Boolean(variant.colorId) && String(variant.colorId) === String(selectedColor) : true;
        return sizeMatches && colorMatches;
      }) || null;

    const variantKey = exactVar?.id ? String(exactVar.id) : "";
    const cartItemKey = [
      product.id,
      variantKey,
      chosenColorObj?.id || chosenColorName || "",
      selectedSize || "",
      customSizing.trim() || "",
    ].join("|");

    let cart;
    try {
      cart = JSON.parse(localStorage.getItem("cart") || '{"items":[],"total":0,"event":"Verane"}');
    } catch {
      cart = { items: [], total: 0, event: "Verane" };
    }

    if (!Array.isArray(cart.items)) cart.items = [];

    const existing = cart.items.find((cItem) => cItem.cartItemKey === cartItemKey);

    if (existing) {
      existing.qty = Number(existing.qty || 0) + qty;
    } else {
      cart.items.push({
        ...product,
        variantId: exactVar?.id || null,
        variant: exactVar || null,
        variantInventory: exactVar ? (exactVar.stock ?? exactVar.inventory ?? null) : inventory,
        qty,
        cartItemKey,
        selectedColor: chosenColorName,
        selectedColorId: chosenColorObj?.id || null,
        selectedSize: selectedSize || null,
        customSizing: customSizing.trim() || null,
        isPreOrder,
        fulfillmentTime: fulfillmentTime || null,
      });
    }

    cart.total = cart.items.reduce(
      (sum, item) => sum + Number(item.price || 0) * Number(item.qty || 0),
      0
    );

    localStorage.setItem("cart", JSON.stringify(cart));
    window.dispatchEvent(new CustomEvent("cart-updated"));
    router.push("/cart");
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-[#070707] text-white flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-amber-400" />
          <p className="mt-4 text-xs font-bold uppercase tracking-luxury text-amber-400">
            Loading Piece Details...
          </p>
        </div>
      </main>
    );
  }

  if (!product) {
    return (
      <main className="min-h-screen bg-[#070707] text-white flex items-center justify-center px-5">
        <div className="text-center max-w-md">
          <p className="text-amber-400 text-xs font-bold uppercase tracking-couture">
            PIECE NOT FOUND
          </p>
          <h1 className="text-3xl font-editorial font-light text-white mt-2">Product Unavailable</h1>
          <p className="text-neutral-400 font-light text-sm mt-3">This piece may have been archived or is no longer listed in our catalog.</p>
          <Link
            href="/catalog"
            className="inline-flex mt-6 bg-white text-black px-8 py-3 rounded-full text-xs font-bold uppercase tracking-luxury hover:bg-amber-400 transition"
          >
            ← Return to Catalog
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#070707] text-[#f5f5f5] pb-24">
      {/* NAVIGATION BACK BAR */}
      <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-12 pt-8">
        <Link
          href="/catalog"
          className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-luxury text-neutral-400 hover:text-white transition"
        >
          <span>←</span> Back to Atelier Catalog
        </Link>
      </div>

      {/* PRODUCT MAIN CONTAINER */}
      <section className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-12 py-10 lg:py-16">
        <div className="grid lg:grid-cols-12 gap-10 lg:gap-16">
          {/* IMAGES GALLERY */}
          <div className="lg:col-span-7">
            <div className="relative aspect-[4/5] bg-neutral-950 rounded-3xl overflow-hidden border border-white/[0.08] shadow-2xl">
              {images.length > 0 ? (
                <img
                  src={images[selectedImage]}
                  alt={product.name || "Product Image"}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-neutral-900 to-black text-neutral-700 font-editorial text-4xl">
                  VÉRANE
                </div>
              )}

              {images.length > 1 && (
                <div className="absolute bottom-5 right-5 bg-black/80 backdrop-blur-md border border-white/10 rounded-full px-4 py-1.5 text-[10px] font-bold uppercase tracking-luxury text-neutral-300">
                  {selectedImage + 1} / {images.length}
                </div>
              )}

              <div className="absolute top-5 left-5 flex flex-col gap-2">
                <span className={`px-4 py-1.5 rounded-full text-[9px] font-bold uppercase tracking-couture border backdrop-blur-md ${stockStatusClass}`}>
                  {stockStatus}
                </span>
                {isPreOrder && (
                  <span className="bg-amber-400 text-black px-4 py-1.5 rounded-full text-[9px] font-bold uppercase tracking-couture">
                    PRE-ORDER
                  </span>
                )}
              </div>
            </div>

            {/* THUMBNAILS */}
            {images.length > 1 && (
              <div className="flex gap-3 mt-4 overflow-x-auto pb-2">
                {images.map((img, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => setSelectedImage(index)}
                    className={`shrink-0 w-20 h-24 sm:w-24 sm:h-28 rounded-2xl overflow-hidden border-2 transition ${
                      index === selectedImage
                        ? "border-amber-400 ring-2 ring-amber-400/20"
                        : "border-white/10 hover:border-white/30 opacity-70 hover:opacity-100"
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* DETAILS & OPTIONS */}
          <div className="lg:col-span-5 flex flex-col justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-couture text-amber-400 mb-2">
                {getBrandName(product.brand)}
              </p>

              <div className="flex items-start justify-between gap-4">
                <h1 className="text-3xl sm:text-5xl font-editorial font-light tracking-tight text-white leading-tight">
                  {product.name}
                </h1>

                <button
                  type="button"
                  onClick={toggleWishlist}
                  disabled={wishlistLoading}
                  className={`w-11 h-11 rounded-full border flex items-center justify-center transition shrink-0 ${
                    wishlist
                      ? "border-white bg-white text-black"
                      : "border-white/10 bg-neutral-900/60 text-neutral-400 hover:text-white hover:border-white/30"
                  }`}
                >
                  <svg className="w-5 h-5" fill={wishlist ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={wishlist ? 1.5 : 1.8} d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78Z" />
                  </svg>
                </button>
              </div>

              <div className="mt-4 flex items-baseline gap-3">
                <p className="text-2xl sm:text-3xl font-bold text-white">
                  ₦{Number(product.price || 0).toLocaleString()}
                </p>
                {product.category && (
                  <span className="text-[10px] uppercase tracking-luxury text-neutral-500 font-semibold">
                    / {product.category}
                  </span>
                )}
              </div>

              {product.description && (
                <p className="text-neutral-300 font-light text-sm sm:text-base leading-relaxed mt-6 border-t border-white/[0.08] pt-6">
                  {product.description}
                </p>
              )}

              {/* COLOR SELECTOR */}
              {productColors.length > 0 && (
                <div className="mt-8">
                  <p className="text-[10px] font-bold uppercase tracking-luxury text-neutral-400 mb-3">
                    Available Colors
                  </p>
                  <div className="flex flex-wrap gap-2.5">
                    {productColors.map((color) => {
                      const colorId = color.id ?? color.name ?? color.value;
                      const colorName = color.name || color.label || color.value || "Color";
                      const active = String(selectedColor) === String(colorId);

                      return (
                        <button
                          type="button"
                          key={String(colorId)}
                          onClick={() => setSelectedColor(colorId)}
                          className={`flex items-center gap-2.5 rounded-full border px-4 py-2.5 text-xs font-semibold transition ${
                            active
                              ? "border-amber-400 bg-amber-400/10 text-white"
                              : "border-white/10 bg-neutral-900/60 text-neutral-300 hover:border-white/20"
                          }`}
                        >
                          <span className="w-3.5 h-3.5 rounded-full border border-white/20 shrink-0" style={{ backgroundColor: getColorValue(color) }} />
                          <span>{colorName}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* SIZE SELECTOR */}
              {hasSizes && (
                <div className="mt-8">
                  <div className="flex items-center justify-between gap-4 mb-3">
                    <p className="text-[10px] font-bold uppercase tracking-luxury text-neutral-400">
                      Select Size
                    </p>
                    {isFootwear && (
                      <button
                        type="button"
                        onClick={() => setSizeGuideOpen(true)}
                        className="text-[10px] font-bold uppercase tracking-luxury text-amber-400 hover:text-amber-300 transition"
                      >
                        Sizing Guide →
                      </button>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {Array.from(
                      new Set(variants.map((v) => v.size || v.name || v.value || v.label).filter(Boolean))
                    ).map((sizeLabel) => {
                      const active = String(selectedSize) === String(sizeLabel);

                      return (
                        <button
                          key={sizeLabel}
                          type="button"
                          onClick={() => setSelectedSize(sizeLabel)}
                          className={`min-w-12 h-11 px-4 rounded-xl border text-xs font-bold transition ${
                            active
                              ? "border-amber-400 bg-amber-400 text-black shadow-md"
                              : "border-white/10 bg-neutral-900/60 text-neutral-300 hover:border-white/20"
                          }`}
                        >
                          {sizeLabel}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* PRE-ORDER CUSTOM SIZING */}
              {isPreOrder && customSizingEnabled && (
                <div className="mt-8 rounded-2xl border border-amber-400/30 bg-amber-400/5 p-5">
                  <p className="text-[10px] font-bold uppercase tracking-couture text-amber-400 mb-2">
                    Bespoke Sizing & Measurements
                  </p>
                  <textarea
                    value={customSizing}
                    onChange={(e) => setCustomSizing(e.target.value)}
                    rows={4}
                    placeholder="Enter your sizing details or custom measurements..."
                    className="w-full rounded-xl border border-white/10 bg-neutral-900/90 p-3.5 text-xs text-white placeholder-neutral-600 outline-none transition focus:border-amber-400/50 resize-none"
                  />
                </div>
              )}

              {/* QUANTITY CONTROL */}
              {!isOutOfStock && (
                <div className="mt-8">
                  <p className="text-[10px] font-bold uppercase tracking-luxury text-neutral-400 mb-3">
                    Quantity
                  </p>
                  <div className="inline-flex items-center gap-4 rounded-full border border-white/10 bg-neutral-900/80 px-3 py-1.5">
                    <button
                      type="button"
                      onClick={() => setQty(Math.max(1, qty - 1))}
                      className="w-8 h-8 rounded-full hover:bg-white/10 text-neutral-300 flex items-center justify-center font-bold"
                    >
                      −
                    </button>
                    <span className="text-sm font-bold w-4 text-center text-white">{qty}</span>
                    <button
                      type="button"
                      onClick={() => setQty(qty + 1)}
                      className="w-8 h-8 rounded-full hover:bg-white/10 text-neutral-300 flex items-center justify-center font-bold"
                    >
                      +
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* ADD TO BAG CTA */}
            <div className="mt-10 pt-6 border-t border-white/[0.08]">
              <button
                type="button"
                onClick={addToCart}
                disabled={isOutOfStock}
                className={`w-full py-4 rounded-full font-bold text-xs uppercase tracking-luxury transition shadow-xl ${
                  isOutOfStock
                    ? "bg-neutral-800 text-neutral-500 cursor-not-allowed"
                    : "bg-amber-400 text-black hover:bg-amber-300 shadow-amber-400/10"
                }`}
              >
                {isOutOfStock ? "Sold Out" : `Add to Bag — ₦${(Number(product.price || 0) * qty).toLocaleString()}`}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* SIZING GUIDE MODAL */}
      {sizeGuideOpen && (
        <div
          className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-5"
          onClick={() => setSizeGuideOpen(false)}
        >
          <div
            className="w-full max-w-lg rounded-3xl border border-white/10 bg-neutral-950 p-6 sm:p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <h2 className="text-xl font-editorial text-white">Footwear Sizing Guide</h2>
              <button
                type="button"
                onClick={() => setSizeGuideOpen(false)}
                className="text-neutral-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="mt-6 rounded-2xl border border-white/5 overflow-hidden">
              <div className="grid grid-cols-3 bg-white/[0.04] px-4 py-3 text-[10px] uppercase tracking-luxury text-neutral-400 font-bold">
                <span>EU</span>
                <span>UK</span>
                <span>US</span>
              </div>
              {[
                ["38", "5", "6"],
                ["39", "6", "7"],
                ["40", "7", "8"],
                ["41", "8", "9"],
                ["42", "9", "10"],
                ["43", "10", "11"],
                ["44", "11", "12"],
                ["45", "12", "13"],
              ].map(([eu, uk, us]) => (
                <div key={eu} className="grid grid-cols-3 px-4 py-2.5 border-t border-white/5 text-xs">
                  <span className="text-white font-bold">{eu}</span>
                  <span className="text-neutral-400">{uk}</span>
                  <span className="text-neutral-400">{us}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <SiteFooter />
    </main>
  );
}
