"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import SiteFooter from "@/components/SiteFooter";

/**
 * Display active collaboration products with galleries, options, and cart actions.
 * @returns {JSX.Element} The collaboration collection page.
 */
export default function CollaborationPage() {
  const router = useRouter();
  const [collaborations, setCollaborations] = useState([]);
  const [loading, setLoading] = useState(true);

  // Active image index & selections per collaboration product
  const [selectedImages, setSelectedImages] = useState({});
  const [selectedVariants, setSelectedVariants] = useState({});
  const [selectedColors, setSelectedColors] = useState({});
  const [selectedSizes, setSelectedSizes] = useState({});
  const [addedIds, setAddedIds] = useState({});

  useEffect(() => {
    async function loadCollaborations() {
      try {
        const res = await fetch("/api/collaborations", { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to load collaborations");
        const data = await res.json();
        setCollaborations(data?.collaborations || []);
      } catch (err) {
        console.error("Collaborations error:", err);
      } finally {
        setLoading(false);
      }
    }

    loadCollaborations();
  }, []);

  function parseImages(images) {
    if (!images) return [];
    try {
      const parsed = typeof images === "string" ? JSON.parse(images) : images;
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return typeof images === "string" ? [images] : [];
    }
  }

  function formatPrice(amount) {
    return "₦" + Number(amount || 0).toLocaleString("en-NG");
  }

  function getProductImages(collabProduct) {
    let images = parseImages(collabProduct.images);
    if (images.length === 0 && collabProduct.productA) {
      images = parseImages(collabProduct.productA.images);
    }
    if (images.length === 0 && collabProduct.productB && collabProduct.productB.id !== collabProduct.productA?.id) {
      images = parseImages(collabProduct.productB.images);
    }
    return images;
  }

  function getAvailableColors(sourceProduct) {
    if (!sourceProduct) return [];
    if (Array.isArray(sourceProduct.productColors) && sourceProduct.productColors.length > 0) {
      return sourceProduct.productColors;
    }
    const colorMap = new Map();
    if (Array.isArray(sourceProduct.variants)) {
      for (const v of sourceProduct.variants) {
        if (v.color?.name && !colorMap.has(v.color.name)) {
          colorMap.set(v.color.name, v.color);
        }
      }
    }
    return Array.from(colorMap.values());
  }

  function getAvailableSizes(sourceProduct) {
    if (!sourceProduct || !Array.isArray(sourceProduct.variants)) return [];
    const sizes = new Set();
    for (const v of sourceProduct.variants) {
      if (v.size) sizes.add(v.size);
    }
    return Array.from(sizes);
  }

  function addToCart(collabProduct) {
    const sourceProduct = collabProduct.productA;
    const images = getProductImages(collabProduct);
    const primaryImage = images[0] || "";

    const selectedColor = selectedColors[collabProduct.id] || getAvailableColors(sourceProduct)[0]?.name || null;
    const selectedSize = selectedSizes[collabProduct.id] || getAvailableSizes(sourceProduct)[0] || null;

    let matchedVariant = null;
    if (sourceProduct && Array.isArray(sourceProduct.variants)) {
      matchedVariant = sourceProduct.variants.find((v) => {
        const matchesColor = !selectedColor || v.color?.name === selectedColor;
        const matchesSize = !selectedSize || v.size === selectedSize;
        return matchesColor && matchesSize;
      }) || sourceProduct.variants[0];
    }

    const cartItemKey = `collab_${collabProduct.id}_${matchedVariant?.id || "default"}_${selectedColor || "nocolor"}_${selectedSize || "nosize"}`;

    const cartLine = {
      id: `collab_${collabProduct.id}`,
      cartItemKey,
      isCollaboration: true,
      collaborationProductId: collabProduct.id,
      collaborationVariantId: matchedVariant?.id || null,
      productId: sourceProduct?.id || collabProduct.productAId,
      productAId: collabProduct.productAId,
      productBId: collabProduct.productBId,
      variantId: matchedVariant?.id || null,
      name: collabProduct.name,
      brand: "VÉRANE COLLABORATION",
      price: collabProduct.price,
      images: JSON.stringify([primaryImage]),
      selectedColor: selectedColor,
      selectedSize: selectedSize,
      qty: 1,
    };

    let cart;
    try {
      cart = JSON.parse(localStorage.getItem("cart") || '{"items":[],"total":0,"event":"Verane"}');
    } catch {
      cart = { items: [], total: 0, event: "Verane" };
    }

    if (!Array.isArray(cart.items)) cart.items = [];

    const existingIndex = cart.items.findIndex(
      (item) => item.cartItemKey === cartItemKey
    );

    if (existingIndex !== -1) {
      cart.items[existingIndex].qty = (cart.items[existingIndex].qty || 1) + 1;
    } else {
      cart.items.push(cartLine);
    }

    cart.total = cart.items.reduce(
      (sum, item) => sum + Number(item.price || 0) * Number(item.qty || 0),
      0
    );

    localStorage.setItem("cart", JSON.stringify(cart));
    window.dispatchEvent(new CustomEvent("cart-updated"));

    setAddedIds((prev) => ({ ...prev, [collabProduct.id]: true }));
    setTimeout(() => {
      setAddedIds((prev) => ({ ...prev, [collabProduct.id]: false }));
    }, 1200);
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-neutral-500 text-xs uppercase tracking-[0.3em] animate-pulse">
          Loading collaborations...
        </div>
      </main>
    );
  }

  const activeCollabsWithProducts = collaborations.filter(
    (c) => Array.isArray(c.products) && c.products.length > 0
  );

  return (
    <main className="min-h-screen bg-black text-white">

      {/* HERO */}
      <section className="relative py-24 md:py-32 border-b border-white/10 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-amber-500/10 via-black/50 to-black pointer-events-none" />
        <div className="max-w-7xl mx-auto px-5 sm:px-8 relative z-10">
          <p className="text-amber-400 text-xs font-bold uppercase tracking-[0.4em]">
            VÉRANE EDITIONS
          </p>

          <h1 className="text-5xl sm:text-7xl md:text-8xl font-black tracking-tighter mt-4 leading-[0.85]">
            COLLABORATIONS
          </h1>

          <p className="mt-6 max-w-2xl text-neutral-400 text-base md:text-lg leading-relaxed">
            Where luxury apparel meets bespoke handcrafted footwear and accessories.
            Each collaboration represents a unified expression co-created across both houses, purchased as one complete piece.
          </p>
        </div>
      </section>

      {/* COLLABORATIONS LIST */}
      <section className="max-w-7xl mx-auto px-5 sm:px-8 py-20">
        {activeCollabsWithProducts.length === 0 ? (
          <div className="rounded-3xl border border-white/10 bg-neutral-950 p-16 text-center">
            <p className="text-amber-400 text-[10px] font-bold uppercase tracking-[0.3em]">
              Limited Drops
            </p>
            <h2 className="text-3xl font-black mt-3">No active collaboration drops at this time</h2>
            <p className="text-neutral-500 text-sm mt-3 max-w-md mx-auto">
              Check back soon for exclusive capsule releases co-created by UTHY LUXURY and ALOMZIEE FOOTIES.
            </p>
            <Link
              href="/catalog"
              className="inline-block mt-8 rounded-full bg-white text-black px-8 py-4 text-xs font-black uppercase tracking-widest hover:bg-amber-400 transition"
            >
              Explore Full Catalog
            </Link>
          </div>
        ) : (
          <div className="space-y-32">
            {activeCollabsWithProducts.map((collaboration) => (
              <div key={collaboration.id} className="space-y-10">
                {/* COLLABORATION HEADER */}
                <div className="border-b border-white/10 pb-6">
                  <p className="text-amber-400 text-xs font-bold uppercase tracking-[0.3em]">
                    {collaboration.brandA} × {collaboration.brandB}
                  </p>
                  <h2 className="text-3xl sm:text-5xl font-black tracking-tight mt-2">
                    {collaboration.name}
                  </h2>
                  {collaboration.description && (
                    <p className="text-neutral-400 text-sm mt-3 max-w-3xl leading-relaxed">
                      {collaboration.description}
                    </p>
                  )}
                </div>

                {/* COLLABORATION PRODUCTS */}
                <div className="space-y-16">
                  {collaboration.products.map((collabProduct) => {
                    const images = getProductImages(collabProduct);
                    const activeImageIdx = selectedImages[collabProduct.id] || 0;
                    const primaryImage = images[activeImageIdx] || images[0] || "";
                    const isAdded = addedIds[collabProduct.id];

                    const sourceProduct = collabProduct.productA;
                    const colors = getAvailableColors(sourceProduct);
                    const sizes = getAvailableSizes(sourceProduct);

                    const activeColor = selectedColors[collabProduct.id] || colors[0]?.name || null;
                    const activeSize = selectedSizes[collabProduct.id] || sizes[0] || null;

                    return (
                      <div
                        key={collabProduct.id}
                        className="rounded-[2.5rem] border border-white/10 bg-neutral-950 overflow-hidden grid lg:grid-cols-2 gap-8 md:gap-12 p-6 sm:p-10"
                      >

                        {/* GALLERY */}
                        <div>
                          <div className="relative aspect-[4/5] rounded-2xl overflow-hidden bg-neutral-900 border border-white/5 group">
                            {primaryImage ? (
                              <img
                                src={primaryImage}
                                alt={collabProduct.name}
                                className="w-full h-full object-cover transition-transform duration-500"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-neutral-600 uppercase text-xs tracking-widest">
                                Collaboration Piece
                              </div>
                            )}

                            <div className="absolute top-4 left-4 bg-black/80 backdrop-blur-md border border-amber-400/30 text-amber-400 px-4 py-2 rounded-full text-[9px] font-black uppercase tracking-[0.2em]">
                              Co-Created
                            </div>

                            {/* SWIPE / PREV-NEXT CONTROLS */}
                            {images.length > 1 && (
                              <div className="absolute inset-0 flex items-center justify-between p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setSelectedImages((prev) => ({
                                      ...prev,
                                      [collabProduct.id]:
                                        (activeImageIdx - 1 + images.length) % images.length,
                                    }))
                                  }
                                  className="w-10 h-10 rounded-full bg-black/70 border border-white/20 text-white flex items-center justify-center text-sm hover:bg-black"
                                >
                                  ←
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setSelectedImages((prev) => ({
                                      ...prev,
                                      [collabProduct.id]: (activeImageIdx + 1) % images.length,
                                    }))
                                  }
                                  className="w-10 h-10 rounded-full bg-black/70 border border-white/20 text-white flex items-center justify-center text-sm hover:bg-black"
                                >
                                  →
                                </button>
                              </div>
                            )}
                          </div>

                          {/* THUMBNAILS */}
                          {images.length > 1 && (
                            <div className="flex gap-3 mt-4 overflow-x-auto pb-1">
                              {images.map((img, idx) => (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={() =>
                                    setSelectedImages((prev) => ({
                                      ...prev,
                                      [collabProduct.id]: idx,
                                    }))
                                  }
                                  className={`w-20 h-24 rounded-xl overflow-hidden bg-neutral-900 border transition shrink-0 ${
                                    activeImageIdx === idx
                                      ? "border-amber-400 ring-2 ring-amber-400/30"
                                      : "border-white/10 hover:border-white/30"
                                  }`}
                                >
                                  <img src={img} alt="" className="w-full h-full object-cover" />
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* DETAILS & OPTIONS */}
                        <div className="flex flex-col justify-between">
                          <div>
                            <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.25em] text-amber-400">
                              <span>UTHY LUXURY</span>
                              <span>×</span>
                              <span>ALOMZIEE FOOTIES</span>
                            </div>

                            <h2 className="text-3xl sm:text-5xl font-black tracking-tight mt-3">
                              {collabProduct.name}
                            </h2>

                            <p className="text-2xl sm:text-3xl font-bold mt-4 text-white">
                              {formatPrice(collabProduct.price)}
                            </p>

                            {collabProduct.description && (
                              <p className="text-neutral-400 text-sm mt-6 leading-relaxed">
                                {collabProduct.description}
                              </p>
                            )}

                            {/* SOURCE PRODUCT INFO */}
                            {sourceProduct && (
                              <div className="mt-8 pt-6 border-t border-white/10">
                                <p className="text-[9px] font-bold uppercase tracking-widest text-amber-400">
                                  Base Piece
                                </p>
                                <p className="text-sm font-bold mt-1 text-neutral-200">
                                  {sourceProduct.name}
                                </p>
                                <p className="text-xs text-neutral-500 mt-1">
                                  Category: {sourceProduct.category || "Atelier"}
                                </p>
                              </div>
                            )}

                            {/* COLOR SELECTION */}
                            {colors.length > 0 && (
                              <div className="mt-8">
                                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-400 mb-3">
                                  Select Color
                                </p>
                                <div className="flex flex-wrap gap-3">
                                  {colors.map((c) => {
                                    const isSelected = activeColor === c.name;
                                    return (
                                      <button
                                        key={c.id || c.name}
                                        type="button"
                                        onClick={() =>
                                          setSelectedColors((prev) => ({
                                            ...prev,
                                            [collabProduct.id]: c.name,
                                          }))
                                        }
                                        className={`px-4 py-2.5 rounded-xl border text-xs font-bold transition flex items-center gap-2 ${
                                          isSelected
                                            ? "border-amber-400 bg-amber-400/10 text-white"
                                            : "border-white/10 text-neutral-400 hover:border-white/20"
                                        }`}
                                      >
                                        {c.hex && (
                                          <span
                                            className="w-3.5 h-3.5 rounded-full border border-white/20 inline-block"
                                            style={{ backgroundColor: c.hex }}
                                          />
                                        )}
                                        {c.name}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            {/* SIZE SELECTION */}
                            {sizes.length > 0 && (
                              <div className="mt-8">
                                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-400 mb-3">
                                  Select Size
                                </p>
                                <div className="flex flex-wrap gap-2.5">
                                  {sizes.map((s) => {
                                    const isSelected = activeSize === s;
                                    return (
                                      <button
                                        key={s}
                                        type="button"
                                        onClick={() =>
                                          setSelectedSizes((prev) => ({
                                            ...prev,
                                            [collabProduct.id]: s,
                                          }))
                                        }
                                        className={`min-w-12 h-11 px-3.5 rounded-xl border text-xs font-bold transition ${
                                          isSelected
                                            ? "border-amber-400 bg-amber-400/10 text-white"
                                            : "border-white/10 text-neutral-400 hover:border-white/20"
                                        }`}
                                      >
                                        {s}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* ADD TO CART */}
                          <div className="mt-10 pt-6 border-t border-white/10">
                            <button
                              type="button"
                              onClick={() => addToCart(collabProduct)}
                              className={`w-full py-4 rounded-full font-black text-xs uppercase tracking-[0.18em] transition ${
                                isAdded
                                  ? "bg-emerald-400 text-black"
                                  : "bg-amber-500 text-black hover:bg-amber-400"
                              }`}
                            >
                              {isAdded ? "Added to Bag" : "Add Collaboration to Bag"}
                            </button>
                          </div>

                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <SiteFooter />
    </main>
  );
}
