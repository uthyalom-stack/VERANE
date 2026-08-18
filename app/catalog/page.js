"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
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

  return brand || "VÉRANE";
}

function CatalogContent() {
  const searchParams = useSearchParams();

  const [products, setProducts] = useState([]);
  const [collections, setCollections] = useState([]);

  const [loading, setLoading] = useState(true);

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

        const [prodRes, colRes] = await Promise.all([
          fetch("/api/products", {
            cache: "no-store",
          }),
          fetch("/api/admin/collections", {
            cache: "no-store",
          }),
        ]);

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
      } catch (error) {
        console.error(
          "Failed to load catalog:",
          error
        );

        setProducts([]);
        setCollections([]);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const filtered = useMemo(() => {
    const searchTerm = search
      .toLowerCase()
      .trim();

    const result = products.filter((product) => {
      const matchBrand =
        activeBrand === "all" ||
        product.brand === activeBrand;

      const matchCat =
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
        matchCat &&
        matchCollection &&
        matchSearch
      );
    });

    return [...result].sort((a, b) => {
      if (sort === "price-low") {
        return (
          Number(a.price || 0) -
          Number(b.price || 0)
        );
      }

      if (sort === "price-high") {
        return (
          Number(b.price || 0) -
          Number(a.price || 0)
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
            <div className="mt-5 h-20 w-full max-w-3xl rounded-2xl bg-neutral-900 animate-pulse" />
          </div>

          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {Array.from({ length: 8 }).map(
              (_, i) => (
                <div
                  key={i}
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
        <div className="mb-10">
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
        </div>

        {/* COLLECTION FILTER */}
        {collections.length > 0 && (
          <div className="mb-8 overflow-x-auto pb-2">
            <div className="flex w-max gap-2">
              <button
                onClick={() =>
                  setActiveCollection("all")
                }
                className={`rounded-full px-5 py-2.5 text-xs font-bold uppercase tracking-wider transition ${
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
                  className={`whitespace-nowrap rounded-full px-5 py-2.5 text-xs font-bold uppercase tracking-wider transition ${
                    activeCollection ===
                    collection.id
                      ? "bg-white text-black"
                      : "border border-white/10 bg-neutral-950 text-neutral-400 hover:text-white"
                  }`}
                >
                  {collection.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* BRAND FILTER */}
        <div className="mb-6 overflow-x-auto pb-2">
          <div className="flex w-max gap-3">
            {brands.map((brand) => (
              <button
                key={brand.id}
                onClick={() =>
                  setActiveBrand(brand.id)
                }
                className={`whitespace-nowrap rounded-full px-5 py-2.5 text-xs font-bold uppercase tracking-wider transition ${
                  activeBrand === brand.id
                    ? "bg-amber-500 text-black"
                    : "border border-white/20 text-neutral-400 hover:border-white/40 hover:text-white"
                }`}
              >
                {brand.name}
              </button>
            ))}
          </div>
        </div>

        {/* SEARCH + SORT */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row">
          <input
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
            placeholder="Search products..."
            className="w-full max-w-md rounded-full border border-white/10 bg-neutral-950 px-5 py-3 text-sm text-white outline-none transition placeholder:text-neutral-600 focus:border-amber-400/40"
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
          </select>
        </div>

        {/* CATEGORY FILTER */}
        <div className="mb-10 overflow-x-auto pb-2">
          <div className="flex w-max gap-2">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() =>
                  setActiveCat(category.id)
                }
                className={`whitespace-nowrap rounded-full px-4 py-2 text-xs font-bold transition ${
                  activeCat === category.id
                    ? "bg-amber-500 text-black"
                    : "bg-neutral-950 text-neutral-400 hover:text-white"
                }`}
              >
                {category.name}
              </button>
            ))}
          </div>
        </div>

        {/* RESULT COUNT */}
        <div className="mb-6 flex items-center justify-between">
          <p className="text-xs text-neutral-500">
            {filtered.length}{" "}
            {filtered.length === 1
              ? "piece"
              : "pieces"}
          </p>
        </div>

        {/* PRODUCTS */}
        {filtered.length === 0 ? (
          <div className="py-24 text-center">
            <p className="text-lg font-semibold">
              No products found.
            </p>

            <p className="mt-2 text-sm text-neutral-500">
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
                  href={
                    "/product/" +
                    product.id
                  }
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
                      <div className="flex h-full w-full items-center justify-center text-6xl">
                        👔
                      </div>
                    )}

                    {product.stock === 0 && (
                      <span className="absolute left-3 top-3 rounded-full bg-black/80 px-3 py-1 text-[9px] font-bold uppercase tracking-wider text-white backdrop-blur">
                        Sold Out
                      </span>
                    )}
                  </div>

                  <p className="mt-4 text-[9px] font-bold uppercase tracking-[0.18em] text-amber-400">
                    {getBrandName(
                      product.brand
                    )}
                  </p>

                  <div className="mt-1 flex items-start justify-between gap-3">
                    <h3 className="text-sm font-semibold md:text-base">
                      {product.name}
                    </h3>

                    <span className="shrink-0 text-sm text-white">
                      ₦
                      {Number(
                        product.price || 0
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

function CatalogFallback() {
  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {Array.from({ length: 8 }).map(
            (_, i) => (
              <div
                key={i}
                className="aspect-[4/5] rounded-2xl bg-neutral-900 animate-pulse"
              />
            )
          )}
        </div>
      </div>
    </main>
  );
}

export default function CatalogPage() {
  return (
    <Suspense fallback={<CatalogFallback />}>
      <CatalogContent />
    </Suspense>
  );
}