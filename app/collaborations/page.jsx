"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import SiteFooter from "@/components/SiteFooter";

export default function CollaborationPage() {
  const router = useRouter();
  const [collaborations, setCollaborations] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedImages, setSelectedImages] = useState({});
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
    if (
      images.length === 0 &&
      collabProduct.productB &&
      collabProduct.productB.id !== collabProduct.productA?.id
    ) {
      images = parseImages(collabProduct.productB.images);
    }
    return images;
  }

  function getAvailableColors(collabProduct) {
    if (!collabProduct) return [];
    const colorMap = new Map();

    if (Array.isArray(collabProduct.variants) && collabProduct.variants.length > 0) {
      for (const cv of collabProduct.variants) {
        const colorName = cv.productAColor || cv.productAVariant?.color?.name;
        const colorHex = cv.productAColorHex || cv.productAVariant?.color?.hex;
        if (colorName && !colorMap.has(colorName)) {
          colorMap.set(colorName, { id: colorName, name: colorName, hex: colorHex });
        }
      }
    }

    if (colorMap.size === 0 && collabProduct.productA) {
      if (
        Array.isArray(collabProduct.productA.productColors) &&
        collabProduct.productA.productColors.length > 0
      ) {
        for (const c of collabProduct.productA.productColors) {
          if (c.name && !colorMap.has(c.name)) colorMap.set(c.name, c);
        }
      }
      if (Array.isArray(collabProduct.productA.variants)) {
        for (const v of collabProduct.productA.variants) {
          if (v.color?.name && !colorMap.has(v.color.name)) {
            colorMap.set(v.color.name, v.color);
          }
        }
      }
    }

    return Array.from(colorMap.values());
  }

  function getAvailableSizes(collabProduct) {
    if (!collabProduct) return [];
    const sizes = new Set();

    if (Array.isArray(collabProduct.variants) && collabProduct.variants.length > 0) {
      for (const cv of collabProduct.variants) {
        const sizeName = cv.productASize || cv.productAVariant?.size;
        if (sizeName) sizes.add(sizeName);
      }
    }

    if (
      sizes.size === 0 &&
      collabProduct.productA &&
      Array.isArray(collabProduct.productA.variants)
    ) {
      for (const v of collabProduct.productA.variants) {
        if (v.size) sizes.add(v.size);
      }
    }

    return Array.from(sizes);
  }

  function addToCart(collabProduct) {
    const images = getProductImages(collabProduct);
    const primaryImage = images[0] || "";

    const availableColors = getAvailableColors(collabProduct);
    const availableSizes = getAvailableSizes(collabProduct);

    const selectedColor = selectedColors[collabProduct.id] || availableColors[0]?.name || null;
    const selectedSize = selectedSizes[collabProduct.id] || availableSizes[0] || null;

    let matchedCollabVariant = null;
    if (Array.isArray(collabProduct.variants) && collabProduct.variants.length > 0) {
      matchedCollabVariant =
        collabProduct.variants.find((cv) => {
          const cvColor = cv.productAColor || cv.productAVariant?.color?.name;
          const cvSize = cv.productASize || cv.productAVariant?.size;
          const matchesColor = !selectedColor || cvColor === selectedColor;
          const matchesSize = !selectedSize || cvSize === selectedSize;
          return matchesColor && matchesSize;
        }) || collabProduct.variants[0];
    }

    const collaborationVariantId = matchedCollabVariant?.id || null;
    const sourceProductVariantId = matchedCollabVariant?.productAVariantId || null;

    const cartItemKey = `collab_${collabProduct.id}_${collaborationVariantId || "default"}_${
      selectedColor || "nocolor"
    }_${selectedSize || "nosize"}`;

    const cartLine = {
      id: `collab_${collabProduct.id}`,
      cartItemKey,
      isCollaboration: true,
      collaborationProductId: collabProduct.id,
      collaborationVariantId: collaborationVariantId,
      productId: collabProduct.productAId,
      productAId: collabProduct.productAId,
      productBId: collabProduct.productBId,
      variantId: sourceProductVariantId,
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
      cart = JSON.parse(
        localStorage.getItem("cart") || '{"items":[],"total":0,"event":"Verane"}'
      );
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
      <main className="min-h-screen bg-[#070707] text-white flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-amber-400" />
          <p className="mt-4 text-xs font-bold uppercase tracking-luxury text-amber-400">
            Loading Capsule Collaborations...
          </p>
        </div>
      </main>
    );
  }

  const activeCollabsWithProducts = collaborations.filter(
    (c) => Array.isArray(c.products) && c.products.length > 0
  );

  return (
    <main className="min-h-screen bg-[#070707] text-[#f5f5f5]">
      {/* HERO BANNER */}
      <section className="relative py-20 lg:py-28 border-b border-white/[0.08] bg-gradient-to-b from-neutral-950 via-black to-[#070707] px-5 sm:px-8 lg:px-12 overflow-hidden">
        <div className="pointer-events-none absolute left-1/2 top-0 h-[350px] w-[700px] -translate-x-1/2 rounded-full bg-amber-500/10 blur-[130px]" />

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <span className="h-px w-8 bg-amber-400" />
            <p className="text-[10px] font-bold uppercase tracking-couture text-amber-400">
              EXCLUSIVE EDITIONS
            </p>
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-8xl font-editorial font-light tracking-tight text-white leading-none">
            UTHY <span className="italic font-normal text-amber-400">×</span> ALOMZIEE
          </h1>

          <p className="mt-6 max-w-2xl text-sm sm:text-base text-neutral-400 font-light leading-relaxed">
            Garments from UTHY LUXURY and footwear from ALOMZIEE FOOTIES crafted in unison.
            Co-created capsule collections designed to be worn together.
          </p>
        </div>
      </section>

      {/* COLLABORATIONS LIST */}
      <section className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-12 py-16 lg:py-24">
        {activeCollabsWithProducts.length === 0 ? (
          <div className="rounded-3xl border border-white/10 bg-neutral-950/60 p-12 lg:p-16 text-center">
            <p className="text-xs font-bold uppercase tracking-couture text-amber-400 mb-2">
              LIMITED DROPS
            </p>
            <h2 className="text-2xl font-editorial font-light text-white">
              No Active Capsule Drops Currently Available
            </h2>
            <p className="text-neutral-400 text-sm font-light mt-3 max-w-md mx-auto">
              Check back soon for exclusive co-created releases combining luxury apparel with handcrafted footwear.
            </p>
            <Link
              href="/catalog"
              className="inline-flex mt-8 bg-amber-400 text-black px-8 py-3.5 rounded-full text-xs font-bold uppercase tracking-luxury hover:bg-amber-300 transition shadow-lg shadow-amber-400/10"
            >
              Explore Full Catalog
            </Link>
          </div>
        ) : (
          <div className="space-y-24">
            {activeCollabsWithProducts.map((collaboration) => (
              <div key={collaboration.id} className="space-y-10">
                <div className="border-b border-white/[0.08] pb-6">
                  <p className="text-[10px] font-bold uppercase tracking-couture text-amber-400">
                    {collaboration.brandA} × {collaboration.brandB}
                  </p>
                  <h2 className="text-3xl sm:text-5xl font-editorial font-light tracking-tight text-white mt-2">
                    {collaboration.name}
                  </h2>
                  {collaboration.description && (
                    <p className="text-neutral-400 text-sm font-light mt-3 max-w-3xl leading-relaxed">
                      {collaboration.description}
                    </p>
                  )}
                </div>

                <div className="space-y-16">
                  {collaboration.products.map((collabProduct) => {
                    const images = getProductImages(collabProduct);
                    const activeImageIdx = selectedImages[collabProduct.id] || 0;
                    const primaryImage = images[activeImageIdx] || images[0] || "";
                    const isAdded = addedIds[collabProduct.id];

                    const sourceProduct = collabProduct.productA;
                    const colors = getAvailableColors(collabProduct);
                    const sizes = getAvailableSizes(collabProduct);

                    const activeColor =
                      selectedColors[collabProduct.id] || colors[0]?.name || null;
                    const activeSize = selectedSizes[collabProduct.id] || sizes[0] || null;

                    return (
                      <div
                        key={collabProduct.id}
                        className="rounded-3xl border border-white/[0.08] bg-neutral-950/70 overflow-hidden grid lg:grid-cols-2 gap-8 lg:gap-12 p-6 sm:p-10 backdrop-blur-md"
                      >
                        {/* GALLERY */}
                        <div>
                          <div className="relative aspect-[4/5] rounded-2xl overflow-hidden bg-neutral-900 border border-white/5 group">
                            {primaryImage ? (
                              <img
                                src={primaryImage}
                                alt={collabProduct.name}
                                className="w-full h-full object-cover transition duration-500 group-hover:scale-105"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-neutral-600 font-editorial">
                                VÉRANE COLLAB
                              </div>
                            )}

                            <div className="absolute top-4 left-4 bg-black/80 backdrop-blur-md border border-amber-400/30 text-amber-400 px-3.5 py-1.5 rounded-full text-[9px] font-bold uppercase tracking-couture">
                              Co-Created
                            </div>

                            {images.length > 1 && (
                              <div className="absolute inset-x-4 bottom-4 flex justify-between opacity-0 group-hover:opacity-100 transition">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setSelectedImages((prev) => ({
                                      ...prev,
                                      [collabProduct.id]:
                                        (activeImageIdx - 1 + images.length) % images.length,
                                    }))
                                  }
                                  className="w-9 h-9 rounded-full bg-black/80 border border-white/20 text-white flex items-center justify-center text-xs hover:bg-black"
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
                                  className="w-9 h-9 rounded-full bg-black/80 border border-white/20 text-white flex items-center justify-center text-xs hover:bg-black"
                                >
                                  →
                                </button>
                              </div>
                            )}
                          </div>

                          {images.length > 1 && (
                            <div className="flex gap-2.5 mt-3 overflow-x-auto pb-1">
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
                                  className={`w-16 h-20 rounded-xl overflow-hidden bg-neutral-900 border transition shrink-0 ${
                                    activeImageIdx === idx
                                      ? "border-amber-400"
                                      : "border-white/10 hover:border-white/30"
                                  }`}
                                >
                                  <img src={img} alt="" className="w-full h-full object-cover" />
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* DETAILS */}
                        <div className="flex flex-col justify-between">
                          <div>
                            <p className="text-[9px] font-bold uppercase tracking-couture text-amber-400 mb-2">
                              UTHY LUXURY × ALOMZIEE FOOTIES
                            </p>

                            <h3 className="text-2xl sm:text-4xl font-editorial font-light tracking-tight text-white">
                              {collabProduct.name}
                            </h3>

                            <p className="text-2xl font-bold text-white mt-3">
                              {formatPrice(collabProduct.price)}
                            </p>

                            {collabProduct.description && (
                              <p className="text-neutral-400 text-sm font-light mt-4 leading-relaxed">
                                {collabProduct.description}
                              </p>
                            )}

                            {colors.length > 0 && (
                              <div className="mt-6">
                                <p className="text-[10px] font-bold uppercase tracking-luxury text-neutral-400 mb-2.5">
                                  Available Color
                                </p>
                                <div className="flex flex-wrap gap-2">
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
                                        className={`px-4 py-2 rounded-full border text-xs font-semibold transition flex items-center gap-2 ${
                                          isSelected
                                            ? "border-amber-400 bg-amber-400/10 text-white"
                                            : "border-white/10 text-neutral-400 hover:border-white/20"
                                        }`}
                                      >
                                        {c.hex && (
                                          <span
                                            className="w-3 h-3 rounded-full border border-white/20 inline-block"
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

                            {sizes.length > 0 && (
                              <div className="mt-6">
                                <p className="text-[10px] font-bold uppercase tracking-luxury text-neutral-400 mb-2.5">
                                  Select Size
                                </p>
                                <div className="flex flex-wrap gap-2">
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
                                        className={`min-w-10 px-3.5 py-2 rounded-xl border text-xs font-bold transition ${
                                          isSelected
                                            ? "border-amber-400 bg-amber-400 text-black"
                                            : "border-white/10 text-neutral-300 hover:border-white/20"
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

                          <div className="mt-8 pt-6 border-t border-white/[0.08]">
                            <button
                              type="button"
                              onClick={() => addToCart(collabProduct)}
                              className={`w-full py-4 rounded-full font-bold text-xs uppercase tracking-luxury transition ${
                                isAdded
                                  ? "bg-emerald-400 text-black"
                                  : "bg-amber-400 text-black hover:bg-amber-300 shadow-lg shadow-amber-400/10"
                              }`}
                            >
                              {isAdded ? "Added to Bag" : "Add Capsule Piece to Bag →"}
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
