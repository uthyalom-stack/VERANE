"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

const categories = [
  { id: "all", name: "All" },
  { id: "shirts", name: "Shirts" },
  { id: "trousers", name: "Trousers" },
  { id: "hoodies", name: "Hoodies" },
  { id: "traditional", name: "Traditional" },
  { id: "shoes", name: "Shoes" },
  { id: "sandals", name: "Sandals" },
  { id: "slides", name: "Slides" },
  { id: "boots", name: "Boots" },
  { id: "belts", name: "Belts" },
  { id: "bags", name: "Bags" },
];

const brands = [
  { id: "all", name: "All Collections" },
  { id: "UTHY_LUXURY", name: "UTHY LUXURY" },
  { id: "ALOMZIEE_FOOTIES", name: "ALOMZIEE FOOTIES" },
];

function getImage(images: unknown) {
  if (!images) return null;

  try {
    const parsed = typeof images === "string" ? JSON.parse(images) : images;

    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed[0];
    }
  } catch {
    return null;
  }

  return null;
}

function getBrandName(brand: string) {
  return brand === "UTHY_LUXURY" ? "UTHY LUXURY" : "ALOMZIEE FOOTIES";
}

export default function CatalogPage() {
  const searchParams = useSearchParams();

  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeBrand, setActiveBrand] = useState(
    searchParams.get("brand") || "all"
  );
  const [activeCat, setActiveCat] = useState("all");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("newest");

  useEffect(() => {
    async function loadProducts() {
      try {
        const response = await fetch("/api/products");

        if (!response.ok) {
          throw new Error("Failed to fetch products");
        }

        const data = await response.json();

        setProducts(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Failed to load products:", error);
        setProducts([]);
      } finally {
        setLoading(false);
      }
    }

    loadProducts();
  }, []);

  const filtered = useMemo(() => {
    const result = products.filter((product) => {
      const matchBrand =
        activeBrand === "all" || product.brand === activeBrand;

      const matchCat =
        activeCat === "all" || product.category === activeCat;

      const searchTerm = search.toLowerCase().trim();

      const matchSearch =
        !searchTerm ||
        product.name?.toLowerCase().includes(searchTerm) ||
        product.description?.toLowerCase().includes(searchTerm) ||
        product.brand?.toLowerCase().includes(searchTerm) ||
        product.category?.toLowerCase().includes(searchTerm);

      return matchBrand && matchCat && matchSearch;
    });

    return [...result].sort((a, b) => {
      if (sort === "price-low") {
        return Number(a.price) - Number(b.price);
      }

      if (sort === "price-high") {
        return Number(b.price) - Number(a.price);
      }

      return (
        new Date(b.createdAt || 0).getTime() -
        new Date(a.createdAt || 0).getTime()
      );
    });
  }, [products, activeBrand, activeCat, search, sort]);

  const activeBrandName =
    brands.find((brand) => brand.id === activeBrand)?.name ||
    "All Collections";

  if (loading) {
    return (
      <main className="min-h-screen bg-black text-white">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 py-16 md:py-24">
          <div className="h-3 w-32 bg-neutral-900 rounded-full animate-pulse mb-6" />
          <div className="h-16 md:h-24 w-2/3 bg-neutral-900 rounded-2xl animate-pulse mb-12" />

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i}>
                <div className="aspect-[4/5] rounded-2xl bg-neutral-900 animate-pulse" />
                <div className="h-3 w-24 bg-neutral-900 rounded mt-4 animate-pulse" />
                <div className="h-4 w-32 bg-neutral-900 rounded mt-2 animate-pulse" />
                <div className="h-3 w-20 bg-neutral-900 rounded mt-2 animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white overflow-hidden">

      {/* =====================================================
          EDITORIAL HEADER
      ====================================================== */}
      <section className="relative border-b border-white/5">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 pt-20 md:pt-28 pb-14">

          <div className="max-w-4xl">
            <p className="text-amber-400 text-[10px] md:text-xs font-bold tracking-[0.45em] uppercase mb-5">
              The Collection
            </p>

            <h1 className="text-5xl sm:text-6xl md:text-8xl font-black tracking-[-0.05em] leading-[0.9]">
              DRESS YOUR
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-500 to-amber-600">
                EXPRESSION.
              </span>
            </h1>

            <p className="text-neutral-400 text-sm md:text-lg max-w-xl mt-7 leading-relaxed">
              Explore UTHY LUXURY and ALOMZIEE FOOTIES — clothing, footwear
              and accessories designed to work together.
            </p>
          </div>

          {/* Collection selector */}
          <div className="mt-14 flex gap-8 overflow-x-auto border-b border-white/10 scrollbar-hide">
            {brands.map((brand) => (
              <button
                key={brand.id}
                onClick={() => {
                  setActiveBrand(brand.id);
                  setActiveCat("all");
                }}
                className={`relative pb-5 whitespace-nowrap text-[10px] md:text-xs font-bold tracking-[0.2em] uppercase transition ${
                  activeBrand === brand.id
                    ? "text-white"
                    : "text-neutral-500 hover:text-neutral-300"
                }`}
              >
                {brand.name}

                {activeBrand === brand.id && (
                  <span className="absolute bottom-[-1px] left-0 right-0 h-px bg-amber-400" />
                )}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* =====================================================
          CONTROLS
      ====================================================== */}
      <section className="max-w-7xl mx-auto px-5 sm:px-8 py-8">

        <div className="flex flex-col lg:flex-row gap-4 justify-between">

          {/* Search */}
          <div className="relative w-full lg:max-w-md">
            <svg
              className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="m21 21-4.35-4.35m2.35-5.65a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z"
              />
            </svg>

            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search the collection..."
              className="w-full bg-neutral-950 border border-white/10 rounded-full pl-12 pr-5 py-3.5 text-sm text-white placeholder:text-neutral-600 outline-none focus:border-amber-500/60 transition"
            />
          </div>

          {/* Sort */}
          <div className="flex items-center gap-3">
            <span className="hidden sm:block text-[10px] uppercase tracking-[0.2em] text-neutral-600">
              Sort
            </span>

            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="bg-neutral-950 border border-white/10 rounded-full px-5 py-3 text-xs text-neutral-300 outline-none cursor-pointer"
            >
              <option value="newest">Newest</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
            </select>
          </div>
        </div>

        {/* Categories */}
        <div className="flex gap-2 overflow-x-auto pt-7 pb-2 scrollbar-hide">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setActiveCat(category.id)}
              className={`px-4 py-2.5 rounded-full whitespace-nowrap text-[10px] font-bold uppercase tracking-wider transition ${
                activeCat === category.id
                  ? "bg-amber-500 text-black"
                  : "bg-neutral-950 border border-white/5 text-neutral-500 hover:text-white hover:border-white/20"
              }`}
            >
              {category.name}
            </button>
          ))}
        </div>
      </section>

      {/* =====================================================
          RESULTS HEADER
      ====================================================== */}
      <section className="max-w-7xl mx-auto px-5 sm:px-8 pt-5 pb-8">
        <div className="flex items-end justify-between">

          <div>
            <p className="text-[10px] text-amber-400 uppercase tracking-[0.3em] font-bold mb-2">
              {activeBrandName}
            </p>

            <h2 className="text-2xl md:text-3xl font-black">
              {activeCat === "all"
                ? "All Pieces"
                : categories.find((c) => c.id === activeCat)?.name}
            </h2>
          </div>

          <p className="text-xs text-neutral-600">
            {filtered.length}{" "}
            {filtered.length === 1 ? "piece" : "pieces"}
          </p>
        </div>
      </section>

      {/* =====================================================
          PRODUCTS
      ====================================================== */}
      <section className="max-w-7xl mx-auto px-5 sm:px-8 pb-28">

        {filtered.length === 0 ? (
          <div className="border border-white/5 rounded-3xl bg-neutral-950 py-28 px-6 text-center">

            <div className="w-16 h-16 rounded-full border border-white/10 mx-auto flex items-center justify-center mb-6">
              <svg
                className="w-6 h-6 text-neutral-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="m21 21-4.35-4.35m2.35-5.65a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z"
                />
              </svg>
            </div>

            <h3 className="text-xl font-bold">
              Nothing found.
            </h3>

            <p className="text-neutral-500 text-sm mt-2 max-w-sm mx-auto">
              Try another search or explore a different collection.
            </p>

            <button
              onClick={() => {
                setSearch("");
                setActiveCat("all");
                setActiveBrand("all");
              }}
              className="mt-7 text-amber-400 text-xs font-bold uppercase tracking-wider hover:text-amber-300"
            >
              Clear all filters →
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-12 md:gap-x-6 md:gap-y-16">

            {filtered.map((product, index) => {
              const image = getImage(product.images);
              const isNew = index < 4;
              const isOutOfStock = Number(product.inventory) <= 0;

              return (
                <Link
                  key={product.id}
                  href={`/product/${product.id}`}
                  className="group block"
                >
                  {/* Image */}
                  <div className="relative aspect-[4/5] bg-neutral-950 rounded-2xl overflow-hidden">

                    {image ? (
                      <img
                        src={image}
                        alt={product.name}
                        loading={index < 4 ? "eager" : "lazy"}
                        className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.045]"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-neutral-900 to-black">
                        <span className="text-neutral-700 text-xs uppercase tracking-[0.3em]">
                          No Image
                        </span>
                      </div>
                    )}

                    {/* Gradient */}
                    <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/50 to-transparent pointer-events-none" />

                    {/* New badge */}
                    {isNew && !isOutOfStock && (
                      <span className="absolute top-3 left-3 bg-white text-black px-3 py-1.5 rounded-full text-[8px] font-black uppercase tracking-[0.15em]">
                        New
                      </span>
                    )}

                    {/* Stock badge */}
                    {isOutOfStock && (
                      <span className="absolute top-3 left-3 bg-black/80 backdrop-blur-md border border-white/10 text-neutral-300 px-3 py-1.5 rounded-full text-[8px] font-bold uppercase tracking-[0.15em]">
                        Sold Out
                      </span>
                    )}

                    {/* Wishlist */}
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      aria-label="Add to wishlist"
                      className="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-white hover:text-black"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
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

                    {/* Quick view */}
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 translate-y-3 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
                      <span className="bg-white text-black rounded-full px-5 py-2.5 text-[9px] font-black uppercase tracking-wider whitespace-nowrap">
                        View Piece →
                      </span>
                    </div>
                  </div>

                  {/* Details */}
                  <div className="pt-4">

                    <p className="text-[8px] md:text-[9px] text-amber-400 font-bold tracking-[0.2em] uppercase">
                      {getBrandName(product.brand)}
                    </p>

                    <div className="flex justify-between gap-3 mt-1.5">
                      <h3 className="text-sm md:text-[15px] font-semibold leading-tight group-hover:text-amber-100 transition">
                        {product.name}
                      </h3>

                      <span className="text-xs md:text-sm text-neutral-300 whitespace-nowrap">
                        ₦{Number(product.price || 0).toLocaleString()}
                      </span>
                    </div>

                    {product.category && (
                      <p className="text-[10px] text-neutral-600 uppercase tracking-wider mt-2">
                        {product.category}
                      </p>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* =====================================================
          OUTFIT BUILDER CTA
      ====================================================== */}
      <section className="border-t border-white/5 bg-neutral-950">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 py-20 md:py-28">

          <div className="rounded-[2rem] border border-white/10 overflow-hidden relative">

            <div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 via-transparent to-transparent" />

            <div className="relative px-7 py-14 md:px-14 md:py-20 flex flex-col md:flex-row md:items-center justify-between gap-10">

              <div>
                <p className="text-amber-400 text-[10px] font-bold tracking-[0.35em] uppercase mb-4">
                  VÉRANE STUDIO
                </p>

                <h2 className="text-4xl md:text-6xl font-black leading-[0.9]">
                  FOUND SOMETHING?
                  <br />
                  <span className="text-neutral-500">
                    BUILD THE LOOK.
                  </span>
                </h2>

                <p className="text-neutral-400 text-sm md:text-base max-w-lg mt-6 leading-relaxed">
                  Mix pieces from UTHY LUXURY and ALOMZIEE FOOTIES to create
                  your complete outfit before you buy.
                </p>
              </div>

              <Link
                href="/outfit-builder"
                className="shrink-0 bg-amber-500 text-black px-7 py-4 rounded-full text-xs font-black uppercase tracking-wider hover:bg-amber-400 hover:scale-[1.02] transition text-center"
              >
                Build Your Outfit →
              </Link>

            </div>
          </div>
        </div>
      </section>

    </main>
  );
}