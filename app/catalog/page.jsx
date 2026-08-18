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

function getImage(images) {
  if (!images) return null;

  try {
    const parsed =
      typeof images === "string"
        ? JSON.parse(images)
        : images;

    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed[0];
    }
  } catch {}

  return null;
}

function getBrandName(brand) {
  if (brand === "UTHY_LUXURY") {
    return "UTHY LUXURY";
  }

  if (brand === "ALOMZIEE_FOOTIES") {
    return "ALOMZIEE FOOTIES";
  }

  return brand || "";
}

export default function CatalogPage() {
  const searchParams = useSearchParams();

  const [products, setProducts] = useState([]);
  const [collections, setCollections] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [activeBrand, setActiveBrand] = useState(
    searchParams.get("brand") || "all"
  );

  const [activeCat, setActiveCat] = useState("all");
  const [activeCollection, setActiveCollection] = useState("all");

  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("newest");

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError("");

        const [prodRes, colRes] = await Promise.all([
          fetch("/api/products", {
            cache: "no-store",
          }),
          fetch("/api/admin/collections", {
            cache: "no-store",
          }),
        ]);

        if (!prodRes.ok) {
          throw new Error("Failed to load products.");
        }

        if (!colRes.ok) {
          throw new Error("Failed to load collections.");
        }

        const productsData = await prodRes.json();
        const collectionsData = await colRes.json();

        setProducts(
          Array.isArray(productsData)
            ? productsData
            : []
        );

        setCollections(
          Array.isArray(collectionsData)
            ? collectionsData.filter(
                (collection) =>
                  collection.enabled !== false
              )
            : []
        );
      } catch (err) {
        console.error("Catalog loading error:", err);
        setError(
          err.message ||
            "Something went wrong while loading the catalog."
        );
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  useEffect(() => {
    const brand = searchParams.get("brand");

    if (
      brand === "UTHY_LUXURY" ||
      brand === "ALOMZIEE_FOOTIES"
    ) {
      setActiveBrand(brand);
    } else {
      setActiveBrand("all");
    }
  }, [searchParams]);

  const filtered = useMemo(() => {
    const searchTerm = search
      .toLowerCase()
      .trim();

    const result = products.filter((product) => {
      const matchBrand =
        activeBrand === "all" ||
        product.brand === activeBrand;

      const matchCategory =
        activeCat === "all" ||
        product.category === activeCat;

      const matchCollection =
        activeCollection === "all" ||
        product.collectionId === activeCollection;

      const matchSearch =
        !searchTerm ||
        product.name
          ?.toLowerCase()
          .includes(searchTerm) ||
        product.description
          ?.toLowerCase()
          .includes(searchTerm);

      return (
        matchBrand &&
        matchCategory &&
        matchCollection &&
        matchSearch
      );
    });

    return [...result].sort((a, b) => {
      if (sort === "price-low") {
        return (
          Number(a.price) -
          Number(b.price)
        );
      }

      if (sort === "price-high") {
        return (
          Number(b.price) -
          Number(a.price)
        );
      }

      if (sort === "name") {
        return (a.name || "").localeCompare(
          b.name || ""
        );
      }

      return (
        new Date(b.createdAt || 0).getTime() -
        new Date(a.createdAt || 0).getTime()
      );
    });
  }, [
    products,
    activeBrand,
    activeCat,
    activeCollection,
    search,
    sort,
  ]);

  if (loading) {
    return (
      <main className="min-h-screen bg-black text-white">
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
          <div className="mb-10">
            <div className="h-3 w-32 rounded-full bg-neutral-900 animate-pulse" />
            <div className="mt-5 h-16 max-w-xl rounded-2xl bg-neutral-900 animate-pulse" />
          </div>

          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {Array.from({ length: 8 }).map(
              (_, index) => (
                <div
                  key={index}
                  className="aspect-[4/5] rounded-2xl bg-neutral-900 animate-pulse"
                />
              )
            )}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-7xl px-5 py-12 sm:px-8">

        {/* HEADER */}
        <header className="mb-10">
          <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.45em] text-amber-400">
            The Collection
          </p>

          <h1 className="text-5xl font-black leading-[0.9] tracking-[-0.05em] md:text-7xl">
            DRESS YOUR
            <br />
            <span className="bg-gradient-to-r from-amber-300 via-yellow-500 to-amber-600 bg-clip-text text-transparent">
              EXPRESSION.
            </span>
          </h1>
        </header>

        {/* ERROR */}
        {error && (
          <div className="mb-8 rounded-2xl border border-red-400/20 bg-red-400/[0.05] px-5 py-4 text-sm text-red-300">
            {error}
          </div>
        )}

        {/* COLLECTIONS */}
        {collections.length > 0 && (
          <section className="mb-8">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-white/30">
                Collections
              </p>

              <span className="text-[10px] text-white/20">
                {collections.length} available
              </span>
            </div>

            <div className="flex gap-3 overflow-x-auto pb-3">
              <button
                onClick={() =>
                  setActiveCollection("all")
                }
                className={`shrink-0 rounded-full px-5 py-2.5 text-xs font-bold uppercase tracking-wider transition ${
                  activeCollection === "all"
                    ? "bg-white text-black"
                    : "border border-white/10 bg-neutral-950 text-neutral-400 hover:text-white"
                }`}
              >
                All
              </button>

              {collections.map((collection) => (
                <button
                  key={collection.id}
                  onClick={() =>
                    setActiveCollection(
                      collection.id
                    )
                  }
                  className={`group flex shrink-0 items-center gap-2 rounded-full px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition ${
                    activeCollection ===
                    collection.id
                      ? "bg-white text-black"
                      : "border border-white/10 bg-neutral-950 text-neutral-400 hover:text-white"
                  }`}
                >
                  {collection.image && (
                    <img
                      src={collection.image}
                      alt=""
                      className="h-5 w-5 rounded-full object-cover"
                    />
                  )}

                  {collection.name}
                </button>
              ))}
            </div>
          </section>
        )}

        {/* BRAND FILTER */}
        <div className="mb-6 flex gap-3 overflow-x-auto pb-1">
          {brands.map((brand) => (
            <button
              key={brand.id}
              onClick={() =>
                setActiveBrand(brand.id)
              }
              className={`shrink-0 rounded-full px-5 py-2.5 text-xs font-bold uppercase tracking-wider transition ${
                activeBrand === brand.id
                  ? "bg-amber-500 text-black"
                  : "border border-white/20 text-neutral-400 hover:border-white/40 hover:text-white"
              }`}
            >
              {brand.name}
            </button>
          ))}
        </div>

        {/* SEARCH + SORT */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row">
          <input
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
            placeholder="Search products..."
            className="w-full max-w-md rounded-full border border-white/10 bg-neutral-950 px-5 py-3 text-sm text-white outline-none placeholder:text-neutral-600 focus:border-amber-400/40"
          />

          <select
            value={sort}
            onChange={(e) =>
              setSort(e.target.value)
            }
            className="rounded-full border border-white/10 bg-neutral-950 px-5 py-3 text-sm text-white outline-none"
          >
            <option value="newest">
              Newest
            </option>
            <option value="price-low">
              Price: Low to High
            </option>
            <option value="price-high">
              Price: High to Low
            </option>
            <option value="name">
              Name
            </option>
          </select>
        </div>

        {/* CATEGORIES */}
        <div className="mb-10 flex gap-2 overflow-x-auto pb-2">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() =>
                setActiveCat(category.id)
              }
              className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold transition ${
                activeCat === category.id
                  ? "bg-amber-500 text-black"
                  : "bg-neutral-950 text-neutral-400 hover:text-white"
              }`}
            >
              {category.name}
            </button>
          ))}
        </div>

        {/* RESULT COUNT */}
        <div className="mb-6 flex items-center justify-between">
          <p className="text-xs text-white/30">
            {filtered.length}{" "}
            {filtered.length === 1
              ? "piece"
              : "pieces"}
          </p>

          {(search ||
            activeBrand !== "all" ||
            activeCat !== "all" ||
            activeCollection !== "all") && (
            <button
              onClick={() => {
                setSearch("");
                setActiveBrand("all");
                setActiveCat("all");
                setActiveCollection("all");
              }}
              className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-400 hover:text-amber-300"
            >
              Clear Filters
            </button>
          )}
        </div>

        {/* PRODUCTS */}
        {filtered.length === 0 ? (
          <div className="rounded-[28px] border border-dashed border-white/[0.08] px-6 py-24 text-center">
            <p className="text-lg font-semibold">
              No products found.
            </p>

            <p className="mt-2 text-sm text-white/30">
              Try changing your filters or search.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-x-4 gap-y-10 lg:grid-cols-4">
            {filtered.map((product) => {
              const image = getImage(
                product.images
              );

              return (
                <Link
                  key={product.id}
                  href={`/product/${product.id}`}
                  className="group block"
                >
                  <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-neutral-950">

                    {image ? (
                      <img
                        src={image}
                        alt={product.name}
                        loading="lazy"
                        className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-5xl">
                        👔
                      </div>
                    )}

                    {/* COLLECTION BADGE */}
                    {product.collection?.name && (
                      <div className="absolute left-3 top-3 rounded-full bg-black/70 px-3 py-1.5 text-[8px] font-bold uppercase tracking-wider text-white backdrop-blur-md">
                        {product.collection.name}
                      </div>
                    )}
                  </div>

                  <p className="mt-4 text-[9px] font-bold tracking-wider text-amber-400">
                    {getBrandName(product.brand)}
                  </p>

                  <div className="mt-1 flex items-start justify-between gap-3">
                    <h3 className="text-sm font-semibold">
                      {product.name}
                    </h3>

                    <span className="shrink-0 text-sm">
                      ₦
                      {Number(
                        product.price
                      ).toLocaleString()}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}