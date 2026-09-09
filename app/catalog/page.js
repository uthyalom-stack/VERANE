"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ProductCard from "@/components/storefront/ProductCard";

const categories = [
  { id: "all", name: "All Categories" },
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
  { id: "all", name: "The House (All Brands)" },
  { id: "UTHY_LUXURY", name: "UTHY LUXURY" },
  { id: "ALOMZIEE_FOOTIES", name: "ALOMZIEE FOOTIES" },
];

function CatalogContent({ defaultBrand = "all" }) {
  const [products, setProducts] = useState([]);
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);

  const [activeBrand, setActiveBrand] = useState(defaultBrand);
  const [activeCat, setActiveCat] = useState("all");
  const [activeCollection, setActiveCollection] = useState("all");

  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("newest");

  /*
   * Read brand, category, collection, search parameters from URL on mount / navigation.
   */
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const brand = params.get("brand");
      const urlSearch = params.get("search") || params.get("q");
      const category = params.get("category");
      const collection = params.get("collection");

      if (brand === "UTHY_LUXURY" || brand === "ALOMZIEE_FOOTIES") {
        setActiveBrand(brand);
      }
      if (urlSearch) setSearch(urlSearch);
      if (category) setActiveCat(category);
      if (collection) setActiveCollection(collection);
    } catch (error) {
      console.error("Failed to parse URL query params:", error);
    }
  }, []);

  /*
   * Fetch products and collections.
   */
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [prodRes, colRes] = await Promise.all([
          fetch("/api/products", { cache: "no-store" }),
          fetch("/api/collections", { cache: "no-store" }),
        ]);

        if (!prodRes.ok) throw new Error(`Products request failed: ${prodRes.status}`);

        const productsData = await prodRes.json();
        const collectionsData = colRes.ok ? await colRes.json() : [];

        setProducts(Array.isArray(productsData) ? productsData : []);
        setCollections(
          Array.isArray(collectionsData)
            ? collectionsData.filter((c) => c.enabled !== false)
            : []
        );
      } catch (error) {
        console.error("Failed to load catalog data:", error);
        setProducts([]);
        setCollections([]);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  /*
   * Filter and sort products (restores multi-field search: name, description, brand, category, style, occasion).
   */
  const filtered = useMemo(() => {
    const rawSearch = search.trim();
    const tokens = rawSearch ? rawSearch.toLowerCase().split(/\s+/).filter(Boolean) : [];

    const result = products.filter((product) => {
      const matchBrand = activeBrand === "all" || product.brand === activeBrand;
      const matchCat = activeCat === "all" || product.category === activeCat;
      const matchCollection =
        activeCollection === "all" || product.collectionId === activeCollection;

      if (!matchBrand || !matchCat || !matchCollection) return false;
      if (tokens.length === 0) return true;

      const nameStr = (product.name || "").toLowerCase();
      const descStr = (product.description || "").toLowerCase();
      const brandStr = (product.brand || "").toLowerCase();
      const catStr = (product.category || "").toLowerCase();
      const styleStr = (product.style || "").toLowerCase();
      const occasionStr = (product.occasion || "").toLowerCase();

      return tokens.every(
        (token) =>
          nameStr.includes(token) ||
          descStr.includes(token) ||
          brandStr.includes(token) ||
          catStr.includes(token) ||
          styleStr.includes(token) ||
          occasionStr.includes(token)
      );
    });

    return [...result].sort((a, b) => {
      if (sort === "price-low") return Number(a.price || 0) - Number(b.price || 0);
      if (sort === "price-high") return Number(b.price || 0) - Number(a.price || 0);
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    });
  }, [products, activeBrand, activeCat, activeCollection, search, sort]);

  // Card Variant determination
  const getCardVariant = (productBrand) => {
    if (productBrand === "UTHY_LUXURY") return "uthy";
    if (productBrand === "ALOMZIEE_FOOTIES") return "alomziee";
    return "standard";
  };

  return (
    <main className="min-h-screen bg-[#070707] text-[#f5f5f5] pb-24">
      {/* EDITORIAL HEADER BANNER */}
      <section className="relative border-b border-white/[0.08] bg-gradient-to-b from-neutral-950 via-black to-[#070707] py-16 md:py-24 px-5 sm:px-8 lg:px-12 overflow-hidden">
        <div className="pointer-events-none absolute left-1/2 top-0 h-[300px] w-[600px] -translate-x-1/2 rounded-full bg-amber-500/10 blur-[120px]" />

        <div className="relative mx-auto max-w-7xl">
          <div className="flex items-center gap-3 mb-4">
            <span className="h-px w-8 bg-amber-400" />
            <p className="text-[10px] font-bold uppercase tracking-couture text-amber-400">
              VÉRANE ATELIER CATALOG
            </p>
          </div>

          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
            <div>
              <h1 className="text-4xl sm:text-6xl lg:text-7xl font-light font-editorial tracking-tight text-white leading-none">
                Curated Atelier <span className="italic font-normal text-amber-400/90">Editions</span>
              </h1>
              <p className="mt-4 max-w-xl text-sm md:text-base text-neutral-400 font-light leading-relaxed">
                Explore garments from UTHY LUXURY and bespoke footwear from ALOMZIEE FOOTIES. Crafted for individuals who refuse to look ordinary.
              </p>
            </div>

            <div className="flex items-center gap-4 text-xs tracking-luxury text-neutral-500 uppercase border-t lg:border-t-0 border-white/10 pt-4 lg:pt-0">
              <span>{filtered.length} {filtered.length === 1 ? "Piece" : "Pieces"}</span>
              <span className="h-3 w-px bg-white/20" />
              <span>{activeBrand === "all" ? "All Houses" : activeBrand.replace("_", " ")}</span>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-12 pt-10">
        {/* BRAND & HOUSE SWITCHER */}
        <div className="mb-8 border-b border-white/[0.08] pb-6">
          <p className="text-[9px] font-bold uppercase tracking-couture text-neutral-500 mb-3">
            Select House
          </p>
          <div className="flex flex-wrap gap-3">
            {brands.map((brand) => (
              <button
                type="button"
                key={brand.id}
                onClick={() => setActiveBrand(brand.id)}
                className={`px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-luxury transition duration-300 ${
                  activeBrand === brand.id
                    ? "bg-amber-400 text-black shadow-lg shadow-amber-400/20"
                    : "border border-white/10 bg-neutral-900/60 text-neutral-400 hover:border-white/30 hover:text-white"
                }`}
              >
                {brand.name}
              </button>
            ))}
          </div>
        </div>

        {/* CONTROLS: SEARCH, SORT & COLLECTION PIPES */}
        <div className="mb-8 flex flex-col lg:flex-row gap-4 justify-between lg:items-center">
          {/* SEARCH BAR */}
          <div className="relative flex-1 max-w-md">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, fabric, style, occasion..."
              className="w-full rounded-full border border-white/10 bg-neutral-900/80 px-5 py-3 text-sm text-white placeholder-neutral-600 outline-none transition focus:border-amber-400/50"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-neutral-500 hover:text-white"
              >
                Clear
              </button>
            )}
          </div>

          {/* SORT DROPDOWN */}
          <div className="flex items-center gap-3">
            <span className="text-xs uppercase tracking-luxury text-neutral-500 shrink-0">
              Sort By:
            </span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="rounded-full border border-white/10 bg-neutral-900/80 px-4 py-2.5 text-xs font-semibold text-white outline-none focus:border-amber-400/50"
            >
              <option value="newest">Newest Arrivals</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
            </select>
          </div>
        </div>

        {/* COLLECTIONS SCROLLING BAR */}
        {collections.length > 0 && (
          <div className="mb-6 overflow-x-auto pb-2 scrollbar-hide">
            <div className="flex w-max gap-2">
              <button
                type="button"
                onClick={() => setActiveCollection("all")}
                className={`rounded-full px-4 py-2 text-[10px] font-bold uppercase tracking-luxury transition ${
                  activeCollection === "all"
                    ? "bg-white text-black"
                    : "border border-white/10 bg-neutral-950 text-neutral-400 hover:text-white"
                }`}
              >
                All Collections
              </button>
              {collections.map((col) => (
                <button
                  type="button"
                  key={col.id}
                  onClick={() => setActiveCollection(col.id)}
                  className={`rounded-full px-4 py-2 text-[10px] font-bold uppercase tracking-luxury transition whitespace-nowrap ${
                    activeCollection === col.id
                      ? "bg-white text-black"
                      : "border border-white/10 bg-neutral-950 text-neutral-400 hover:text-white"
                  }`}
                >
                  {col.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* CATEGORY PILLS */}
        <div className="mb-10 overflow-x-auto pb-3 scrollbar-hide">
          <div className="flex w-max gap-2">
            {categories.map((cat) => (
              <button
                type="button"
                key={cat.id}
                onClick={() => setActiveCat(cat.id)}
                className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                  activeCat === cat.id
                    ? "bg-neutral-200 text-black font-bold"
                    : "bg-neutral-900/90 text-neutral-400 hover:bg-neutral-800 hover:text-white"
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* PRODUCT GRID */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6 lg:gap-8">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="aspect-[4/5] rounded-2xl bg-neutral-900/60 animate-pulse border border-white/5"
              />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-24 text-center rounded-2xl border border-dashed border-white/10 bg-neutral-950/50 p-8">
            <p className="text-xl font-editorial text-neutral-300">
              No pieces found matching your criteria.
            </p>
            <p className="mt-2 text-sm text-neutral-500 font-light">
              Try adjusting your category, house filter, or search keywords.
            </p>
            <button
              type="button"
              onClick={() => {
                setActiveBrand("all");
                setActiveCat("all");
                setActiveCollection("all");
                setSearch("");
              }}
              className="mt-6 inline-block rounded-full bg-white px-6 py-2.5 text-xs font-bold uppercase tracking-luxury text-black hover:bg-amber-400 transition"
            >
              Reset All Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6 lg:gap-8">
            {filtered.map((product, idx) => (
              <ProductCard
                key={product.id}
                product={product}
                variant={getCardVariant(product.brand)}
                priority={idx < 4}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

export default function CatalogPage({ brand = "all" }) {
  return <CatalogContent defaultBrand={brand} />;
}
