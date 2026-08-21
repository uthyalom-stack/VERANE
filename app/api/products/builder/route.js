"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

const CATEGORIES = [
  { key: "top", label: "TOP" },
  { key: "bottom", label: "BOTTOM" },
  { key: "feet", label: "FEET" },
  { key: "waist", label: "WAIST" },
  { key: "hand", label: "HAND" },
];

const EMPTY_ITEMS = {
  top: [],
  bottom: [],
  feet: [],
  waist: [],
  hand: [],
};

function Mannequin({ outfit }) {
  return (
    <div className="relative h-[560px] w-[300px] sm:h-[650px] sm:w-[350px]">

      {/* HEAD */}
      <div className="absolute left-1/2 top-2 h-[86px] w-[86px] -translate-x-1/2 rounded-full border border-white/10 bg-[#c7a27d]" />

      {/* BODY */}
      <div className="absolute left-1/2 top-[78px] h-[250px] w-[150px] -translate-x-1/2 rounded-[45%_45%_30%_30%] border border-white/10 bg-[#262626]" />

      {/* LEFT ARM */}
      <div className="absolute left-[50px] top-[105px] h-[210px] w-[48px] rotate-[5deg] rounded-full border border-white/10 bg-[#262626]" />

      {/* RIGHT ARM */}
      <div className="absolute right-[50px] top-[105px] h-[210px] w-[48px] -rotate-[5deg] rounded-full border border-white/10 bg-[#262626]" />

      {/* BOTTOM / LEFT LEG */}
      <div className="absolute left-1/2 top-[300px] h-[220px] w-[70px] -translate-x-[92%] rounded-b-[30px] border border-white/10 bg-[#262626]" />

      {/* BOTTOM / RIGHT LEG */}
      <div className="absolute left-1/2 top-[300px] h-[220px] w-[70px] translate-x-[-8%] rounded-b-[30px] border border-white/10 bg-[#262626]" />

      {/* TOP ASSET */}
      {outfit.top?.assetUrl && (
        <img
          src={outfit.top.assetUrl}
          alt={outfit.top.name}
          className="pointer-events-none absolute left-1/2 top-[65px] z-20 h-auto w-[190px] -translate-x-1/2 object-contain"
          style={{
            transform: `translateX(calc(-50% + ${outfit.top.positionX || 0}px)) translateY(${outfit.top.positionY || 0}px) scale(${outfit.top.scale || 1})`,
            transformOrigin: "center center",
          }}
        />
      )}

      {/* BOTTOM ASSET */}
      {outfit.bottom?.assetUrl && (
        <img
          src={outfit.bottom.assetUrl}
          alt={outfit.bottom.name}
          className="pointer-events-none absolute left-1/2 top-[285px] z-20 h-auto w-[145px] -translate-x-1/2 object-contain"
          style={{
            transform: `translateX(calc(-50% + ${outfit.bottom.positionX || 0}px)) translateY(${outfit.bottom.positionY || 0}px) scale(${outfit.bottom.scale || 1})`,
            transformOrigin: "center center",
          }}
        />
      )}

      {/* FEET ASSET */}
      {outfit.feet?.assetUrl && (
        <img
          src={outfit.feet.assetUrl}
          alt={outfit.feet.name}
          className="pointer-events-none absolute bottom-[5px] left-1/2 z-30 h-auto w-[190px] -translate-x-1/2 object-contain"
          style={{
            transform: `translateX(calc(-50% + ${outfit.feet.positionX || 0}px)) translateY(${outfit.feet.positionY || 0}px) scale(${outfit.feet.scale || 1})`,
            transformOrigin: "center center",
          }}
        />
      )}

      {/* WAIST ASSET */}
      {outfit.waist?.assetUrl && (
        <img
          src={outfit.waist.assetUrl}
          alt={outfit.waist.name}
          className="pointer-events-none absolute left-1/2 top-[270px] z-40 h-auto w-[165px] -translate-x-1/2 object-contain"
          style={{
            transform: `translateX(calc(-50% + ${outfit.waist.positionX || 0}px)) translateY(${outfit.waist.positionY || 0}px) scale(${outfit.waist.scale || 1})`,
            transformOrigin: "center center",
          }}
        />
      )}

      {/* HAND / BAG ASSET */}
      {outfit.hand?.assetUrl && (
        <img
          src={outfit.hand.assetUrl}
          alt={outfit.hand.name}
          className="pointer-events-none absolute right-[5px] top-[255px] z-50 h-auto w-[95px] object-contain"
          style={{
            transform: `translate(${outfit.hand.positionX || 0}px, ${outfit.hand.positionY || 0}px) scale(${outfit.hand.scale || 1})`,
            transformOrigin: "center center",
          }}
        />
      )}

      {/* BRAND MARK */}
      {outfit.top && (
        <div className="absolute left-1/2 top-[150px] z-50 -translate-x-1/2 text-[8px] font-bold uppercase tracking-[0.25em] text-black/40">
          UTHY
        </div>
      )}
    </div>
  );
}

function ProductCard({ item, selected, onSelect }) {
  const image =
    item.assetUrl ||
    (Array.isArray(item.images) ? item.images[0] : null);

  return (
    <button
      type="button"
      onClick={() => onSelect(item)}
      className={[
        "group overflow-hidden rounded-2xl border text-left transition",
        selected
          ? "border-amber-400"
          : "border-white/10 hover:border-white/30",
      ].join(" ")}
    >
      <div className="aspect-square overflow-hidden bg-neutral-900">

        {image ? (
          <img
            src={image}
            alt={item.name}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-neutral-800">
            <span className="text-[9px] uppercase tracking-[0.2em] text-white/20">
              No Image
            </span>
          </div>
        )}

      </div>

      <div className="bg-neutral-950 p-3">

        <p className="truncate text-[10px] font-bold uppercase tracking-wider">
          {item.name}
        </p>

        {item.brand && (
          <p className="mt-1 truncate text-[8px] uppercase tracking-wider text-amber-400/60">
            {item.brand}
          </p>
        )}

        <p className="mt-1 text-[8px] uppercase tracking-wider text-white/30">
          {selected ? "Selected" : "Add to look"}
        </p>

      </div>
    </button>
  );
}

export default function OutfitBuilderPage() {
  const [activeCategory, setActiveCategory] = useState("top");

  const [items, setItems] = useState(EMPTY_ITEMS);

  const [outfit, setOutfit] = useState({
    top: null,
    bottom: null,
    feet: null,
    waist: null,
    hand: null,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadProducts() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch("/api/products/builder", {
          cache: "no-store",
        });

        const data = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(
            data?.error || "Unable to load Outfit Builder products."
          );
        }

        setItems({
          top: Array.isArray(data?.top) ? data.top : [],
          bottom: Array.isArray(data?.bottom) ? data.bottom : [],
          feet: Array.isArray(data?.feet) ? data.feet : [],
          waist: Array.isArray(data?.waist) ? data.waist : [],
          hand: Array.isArray(data?.hand) ? data.hand : [],
        });
      } catch (err) {
        console.error("Outfit Builder loading error:", err);

        setError(
          err?.message ||
            "Unable to load Outfit Builder products."
        );
      } finally {
        setLoading(false);
      }
    }

    loadProducts();
  }, []);

  const currentItems = useMemo(() => {
    return items[activeCategory] || [];
  }, [items, activeCategory]);

  function selectItem(item) {
    setOutfit((current) => ({
      ...current,
      [activeCategory]: item,
    }));
  }

  function removeItem() {
    setOutfit((current) => ({
      ...current,
      [activeCategory]: null,
    }));
  }

  function clearLook() {
    setOutfit({
      top: null,
      bottom: null,
      feet: null,
      waist: null,
      hand: null,
    });
  }

  const selectedCount =
    Object.values(outfit).filter(Boolean).length;

  return (
    <main className="min-h-screen bg-black text-white">

      <section className="mx-auto max-w-[1600px] px-5 pb-20 pt-16 sm:px-8 lg:px-12">

        {/* HEADER */}
        <div className="mb-10 max-w-3xl">

          <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.4em] text-amber-400">
            VÉRANE STUDIO
          </p>

          <h1 className="text-5xl font-black tracking-[-0.05em] sm:text-7xl lg:text-8xl">
            BUILD YOUR LOOK.
          </h1>

          <p className="mt-5 max-w-xl text-sm leading-7 text-neutral-400 sm:text-base">
            Combine UTHY LUXURY clothing with ALOMZIEE FOOTIES
            footwear and accessories. Build the complete look before
            you buy.
          </p>

        </div>

        {/* ERROR */}
        {error && (
          <div className="mb-6 rounded-2xl border border-red-500/20 bg-red-500/5 px-5 py-4 text-sm text-red-300">
            {error}
          </div>
        )}

        {/* BUILDER */}
        <div className="grid overflow-hidden rounded-[2rem] border border-white/10 bg-neutral-950 lg:grid-cols-[1fr_420px]">

          {/* MANNEQUIN */}
          <div className="relative flex min-h-[650px] items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_center,_#262626_0%,_#0a0a0a_55%,_#000_100%)] p-8 sm:min-h-[760px]">

            <div className="absolute left-8 top-8 text-[9px] uppercase tracking-[0.3em] text-white/20">
              Your Look
            </div>

            <Mannequin outfit={outfit} />

            <div className="absolute bottom-7 left-1/2 flex -translate-x-1/2 items-center gap-3 whitespace-nowrap text-[8px] uppercase tracking-[0.25em] text-white/20">
              <span className="h-px w-8 bg-white/10" />
              LIVE PREVIEW
              <span className="h-px w-8 bg-white/10" />
            </div>

          </div>

          {/* CONTROLS */}
          <div className="border-t border-white/10 bg-[#0d0d0d] lg:border-l lg:border-t-0">

            {/* CATEGORY HEADER */}
            <div className="border-b border-white/10 p-5 sm:p-7">

              <div className="flex items-center justify-between">

                <div>

                  <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-amber-400">
                    STYLE IT
                  </p>

                  <h2 className="mt-2 text-xl font-black">
                    Choose your pieces
                  </h2>

                </div>

                <button
                  type="button"
                  onClick={clearLook}
                  className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/30 transition hover:text-white"
                >
                  Clear
                </button>

              </div>

              {/* CATEGORY TABS */}
              <div className="mt-6 grid grid-cols-5 gap-1 rounded-xl border border-white/10 bg-black p-1">

                {CATEGORIES.map((category) => (
                  <button
                    key={category.key}
                    type="button"
                    onClick={() =>
                      setActiveCategory(category.key)
                    }
                    className={[
                      "rounded-lg px-2 py-3 text-[8px] font-bold uppercase tracking-wider transition",
                      activeCategory === category.key
                        ? "bg-white text-black"
                        : "text-white/35 hover:text-white",
                    ].join(" ")}
                  >
                    {category.label}
                  </button>
                ))}

              </div>

            </div>

            {/* PRODUCTS */}
            <div className="max-h-[500px] overflow-y-auto p-5 sm:p-7">

              <div className="mb-5 flex items-center justify-between">

                <div>

                  <p className="text-[9px] uppercase tracking-[0.25em] text-white/30">
                    {activeCategory}
                  </p>

                  <p className="mt-1 text-sm font-semibold">
                    {loading
                      ? "Loading pieces..."
                      : currentItems.length > 0
                      ? "Select a piece"
                      : "No pieces available"}
                  </p>

                </div>

                {outfit[activeCategory] && (
                  <button
                    type="button"
                    onClick={removeItem}
                    className="text-[8px] uppercase tracking-[0.2em] text-red-400/70 hover:text-red-400"
                  >
                    Remove
                  </button>
                )}

              </div>

              {loading ? (
                <div className="rounded-2xl border border-white/10 bg-black p-10 text-center">

                  <div className="mx-auto mb-4 h-6 w-6 animate-spin rounded-full border-2 border-white/10 border-t-white" />

                  <p className="text-[9px] uppercase tracking-[0.2em] text-white/30">
                    Loading collection
                  </p>

                </div>
              ) : currentItems.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/10 bg-black p-10 text-center">

                  <p className="text-sm font-semibold">
                    Nothing here yet.
                  </p>

                  <p className="mt-2 text-xs leading-5 text-neutral-600">
                    Add an Outfit Builder compatible product
                    from the admin panel.
                  </p>

                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">

                  {currentItems.map((item) => (
                    <ProductCard
                      key={item.id}
                      item={item}
                      selected={
                        outfit[activeCategory]?.id === item.id
                      }
                      onSelect={selectItem}
                    />
                  ))}

                </div>
              )}

            </div>

            {/* BOTTOM */}
            <div className="border-t border-white/10 p-5 sm:p-7">

              <div className="mb-5 flex items-center justify-between">

                <div>

                  <p className="text-[8px] uppercase tracking-[0.25em] text-white/30">
                    Current look
                  </p>

                  <p className="mt-1 text-xs text-white/60">
                    {selectedCount} pieces selected
                  </p>

                </div>

                <span className="text-lg">
                  ✦
                </span>

              </div>

              <Link
                href="/catalog"
                className="block rounded-full bg-white px-6 py-4 text-center text-[10px] font-bold uppercase tracking-[0.2em] text-black transition hover:bg-amber-400"
              >
                Shop the collection
              </Link>

            </div>

          </div>

        </div>

      </section>

    </main>
  );
}