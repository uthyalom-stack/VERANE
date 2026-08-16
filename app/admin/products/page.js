```jsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

const BRAND_NAMES = {
  UTHY_LUXURY: "UTHY LUXURY",
  ALOMZIEE_FOOTIES: "ALOMZIEE FOOTIES",
};

export default function AdminProducts() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [brandFilter, setBrandFilter] = useState("all");
  const [stockFilter, setStockFilter] = useState("all");
  const [deletingId, setDeletingId] = useState(null);

  const loadProducts = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/products", {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Failed to load products");
      }

      const data = await response.json();

      setProducts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setError("Unable to load products. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const deleteProduct = async (id, name) => {
    const confirmed = window.confirm(
      `Delete "${name}"?\n\nThis action cannot be undone.`
    );

    if (!confirmed) return;

    try {
      setDeletingId(id);

      const response = await fetch(`/api/products/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Delete failed");
      }

      setProducts((current) =>
        current.filter((product) => product.id !== id)
      );
    } catch (err) {
      console.error(err);
      alert("Failed to delete product. Please try again.");
    } finally {
      setDeletingId(null);
    }
  };

  const filteredProducts = useMemo(() => {
    const term = search.trim().toLowerCase();

    return products.filter((product) => {
      const matchesSearch =
        !term ||
        product.name?.toLowerCase().includes(term) ||
        product.category?.toLowerCase().includes(term) ||
        product.brand?.toLowerCase().includes(term);

      const matchesBrand =
        brandFilter === "all" || product.brand === brandFilter;

      const inventory = Number(product.inventory || 0);

      const matchesStock =
        stockFilter === "all" ||
        (stockFilter === "in-stock" && inventory > 0) ||
        (stockFilter === "low-stock" && inventory > 0 && inventory <= 5) ||
        (stockFilter === "out-of-stock" && inventory <= 0);

      return matchesSearch && matchesBrand && matchesStock;
    });
  }, [products, search, brandFilter, stockFilter]);

  const stats = useMemo(() => {
    const total = products.length;

    const inStock = products.filter(
      (product) => Number(product.inventory || 0) > 0
    ).length;

    const lowStock = products.filter((product) => {
      const inventory = Number(product.inventory || 0);
      return inventory > 0 && inventory <= 5;
    }).length;

    const outOfStock = products.filter(
      (product) => Number(product.inventory || 0) <= 0
    ).length;

    return {
      total,
      inStock,
      lowStock,
      outOfStock,
    };
  }, [products]);

  const getBrandName = (brand) => {
    return BRAND_NAMES[brand] || brand || "Unknown";
  };

  const getStockStatus = (inventory) => {
    const stock = Number(inventory || 0);

    if (stock <= 0) {
      return {
        label: "Out of stock",
        className: "bg-red-500/10 text-red-400 border-red-500/20",
      };
    }

    if (stock <= 5) {
      return {
        label: "Low stock",
        className: "bg-amber-500/10 text-amber-400 border-amber-500/20",
      };
    }

    return {
      label: "In stock",
      className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    };
  };

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="max-w-7xl mx-auto px-5 sm:px-8 py-10 md:py-14">

        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-10">
          <div>
            <Link
              href="/admin"
              className="inline-flex items-center gap-2 text-xs text-neutral-500 hover:text-white transition mb-5"
            >
              ← Admin Dashboard
            </Link>

            <p className="text-amber-400 text-[10px] font-bold uppercase tracking-[0.3em] mb-3">
              VÉRANE ADMIN
            </p>

            <h1 className="text-4xl md:text-6xl font-black tracking-tight">
              Products
            </h1>

            <p className="text-neutral-500 mt-3">
              Manage the VÉRANE product catalog.
            </p>
          </div>

          <Link
            href="/admin/products/add"
            className="inline-flex items-center justify-center gap-2 bg-amber-500 text-black px-6 py-3.5 rounded-full font-black text-sm hover:bg-amber-400 transition"
          >
            <span className="text-lg leading-none">+</span>
            Add Product
          </Link>
        </div>

        {/* STATS */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-8">
          <div className="bg-neutral-950 border border-white/10 rounded-2xl p-5">
            <p className="text-[10px] uppercase tracking-[0.2em] text-neutral-600">
              Total Products
            </p>
            <p className="text-3xl font-black mt-2">
              {stats.total}
            </p>
          </div>

          <div className="bg-neutral-950 border border-white/10 rounded-2xl p-5">
            <p className="text-[10px] uppercase tracking-[0.2em] text-neutral-600">
              In Stock
            </p>
            <p className="text-3xl font-black mt-2 text-emerald-400">
              {stats.inStock}
            </p>
          </div>

          <div className="bg-neutral-950 border border-white/10 rounded-2xl p-5">
            <p className="text-[10px] uppercase tracking-[0.2em] text-neutral-600">
              Low Stock
            </p>
            <p className="text-3xl font-black mt-2 text-amber-400">
              {stats.lowStock}
            </p>
          </div>

          <div className="bg-neutral-950 border border-white/10 rounded-2xl p-5">
            <p className="text-[10px] uppercase tracking-[0.2em] text-neutral-600">
              Sold Out
            </p>
            <p className="text-3xl font-black mt-2 text-red-400">
              {stats.outOfStock}
            </p>
          </div>
        </div>

        {/* FILTER BAR */}
        <div className="bg-neutral-950 border border-white/10 rounded-2xl p-4 mb-6">
          <div className="flex flex-col lg:flex-row gap-3">

            {/* SEARCH */}
            <div className="relative flex-1">
              <svg
                className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-600"
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
                placeholder="Search products..."
                className="w-full bg-black border border-white/10 rounded-xl pl-11 pr-4 py-3 text-sm outline-none focus:border-amber-500/60 transition placeholder:text-neutral-700"
              />
            </div>

            {/* BRAND */}
            <select
              value={brandFilter}
              onChange={(e) => setBrandFilter(e.target.value)}
              className="bg-black border border-white/10 rounded-xl px-4 py-3 text-sm text-neutral-300 outline-none cursor-pointer"
            >
              <option value="all">All Brands</option>
              <option value="UTHY_LUXURY">UTHY LUXURY</option>
              <option value="ALOMZIEE_FOOTIES">
                ALOMZIEE FOOTIES
              </option>
            </select>

            {/* STOCK */}
            <select
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value)}
              className="bg-black border border-white/10 rounded-xl px-4 py-3 text-sm text-neutral-300 outline-none cursor-pointer"
            >
              <option value="all">All Stock</option>
              <option value="in-stock">In Stock</option>
              <option value="low-stock">Low Stock</option>
              <option value="out-of-stock">Out of Stock</option>
            </select>
          </div>
        </div>

        {/* ERROR */}
        {error && (
          <div className="border border-red-500/20 bg-red-500/5 rounded-2xl p-5 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <p className="text-sm text-red-400">
              {error}
            </p>

            <button
              onClick={loadProducts}
              className="text-xs font-bold uppercase tracking-wider text-white border border-white/10 rounded-full px-4 py-2 hover:bg-white/5 transition"
            >
              Try Again
            </button>
          </div>
        )}

        {/* RESULTS */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs text-neutral-600">
            Showing{" "}
            <span className="text-neutral-300 font-bold">
              {filteredProducts.length}
            </span>{" "}
            of {products.length} products
          </p>

          {(search || brandFilter !== "all" || stockFilter !== "all") && (
            <button
              onClick={() => {
                setSearch("");
                setBrandFilter("all");
                setStockFilter("all");
              }}
              className="text-xs text-amber-400 hover:text-amber-300 transition"
            >
              Clear filters
            </button>
          )}
        </div>

        {/* LOADING */}
        {loading ? (
          <div className="border border-white/10 rounded-2xl overflow-hidden">
            <div className="p-6 space-y-5">
              {Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={index}
                  className="h-14 bg-neutral-900 rounded-xl animate-pulse"
                />
              ))}
            </div>
          </div>
        ) : filteredProducts.length === 0 ? (
          /* EMPTY STATE */
          <div className="border border-white/10 rounded-3xl bg-neutral-950 py-24 px-6 text-center">
            <div className="w-16 h-16 rounded-full border border-white/10 mx-auto flex items-center justify-center text-2xl mb-5">
              📦
            </div>

            <h2 className="text-xl font-bold">
              {products.length === 0
                ? "No products yet"
                : "No products found"}
            </h2>

            <p className="text-sm text-neutral-500 mt-2 max-w-sm mx-auto">
              {products.length === 0
                ? "Your catalog is empty. Add your first product to get started."
                : "Try changing your search or filters."}
            </p>

            {products.length === 0 ? (
              <Link
                href="/admin/products/add"
                className="inline-flex mt-6 bg-amber-500 text-black px-6 py-3 rounded-full text-sm font-bold hover:bg-amber-400 transition"
              >
                + Add First Product
              </Link>
            ) : (
              <button
                onClick={() => {
                  setSearch("");
                  setBrandFilter("all");
                  setStockFilter("all");
                }}
                className="mt-6 text-amber-400 text-sm font-bold hover:text-amber-300"
              >
                Clear filters →
              </button>
            )}
          </div>
        ) : (
          <>
            {/* DESKTOP TABLE */}
            <div className="hidden md:block border border-white/10 rounded-2xl overflow-hidden bg-neutral-950">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10 bg-white/[0.02]">
                      <th className="p-5 text-left text-[10px] uppercase tracking-[0.15em] text-neutral-600">
                        Product
                      </th>
                      <th className="p-5 text-left text-[10px] uppercase tracking-[0.15em] text-neutral-600">
                        Brand
                      </th>
                      <th className="p-5 text-left text-[10px] uppercase tracking-[0.15em] text-neutral-600">
                        Category
                      </th>
                      <th className="p-5 text-left text-[10px] uppercase tracking-[0.15em] text-neutral-600">
                        Price
                      </th>
                      <th className="p-5 text-left text-[10px] uppercase tracking-[0.15em] text-neutral-600">
                        Stock
                      </th>
                      <th className="p-5 text-right text-[10px] uppercase tracking-[0.15em] text-neutral-600">
                        Actions
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredProducts.map((product) => {
                      const stock = Number(product.inventory || 0);
                      const stockStatus = getStockStatus(stock);

                      return (
                        <tr
                          key={product.id}
                          className="border-b border-white/5 last:border-b-0 hover:bg-white/[0.02] transition"
                        >
                          <td className="p-5">
                            <div>
                              <p className="font-bold text-white">
                                {product.name}
                              </p>

                              <p className="text-[10px] text-neutral-700 mt-1 font-mono">
                                {product.id}
                              </p>
                            </div>
                          </td>

                          <td className="p-5 text-neutral-400">
                            {getBrandName(product.brand)}
                          </td>

                          <td className="p-5">
                            <span className="text-neutral-500 uppercase text-xs">
                              {product.category || "—"}
                            </span>
                          </td>

                          <td className="p-5 font-semibold">
                            ₦{Number(product.price || 0).toLocaleString()}
                          </td>

                          <td className="p-5">
                            <div className="flex flex-col gap-1">
                              <span className="font-semibold">
                                {stock}
                              </span>

                              <span
                                className={`inline-flex w-fit px-2 py-1 rounded-full border text-[9px] font-bold uppercase tracking-wider ${stockStatus.className}`}
                              >
                                {stockStatus.label}
                              </span>
                            </div>
                          </td>

                          <td className="p-5">
                            <div className="flex justify-end items-center gap-3">
                              <Link
                                href={`/admin/products/${product.id}`}
                                className="text-xs text-neutral-400 hover:text-white transition"
                              >
                                Edit
                              </Link>

                              <button
                                onClick={() =>
                                  deleteProduct(
                                    product.id,
                                    product.name
                                  )
                                }
                                disabled={deletingId === product.id}
                                className="text-xs text-red-400 hover:text-red-300 disabled:opacity-40 transition"
                              >
                                {deletingId === product.id
                                  ? "Deleting..."
                                  : "Delete"}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* MOBILE CARDS */}
            <div className="md:hidden space-y-3">
              {filteredProducts.map((product) => {
                const stock = Number(product.inventory || 0);
                const stockStatus = getStockStatus(stock);

                return (
                  <div
                    key={product.id}
                    className="bg-neutral-950 border border-white/10 rounded-2xl p-5"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="font-bold truncate">
                          {product.name}
                        </p>

                        <p className="text-[10px] text-amber-400 uppercase tracking-wider mt-1">
                          {getBrandName(product.brand)}
                        </p>
                      </div>

                      <span className="font-bold whitespace-nowrap">
                        ₦{Number(product.price || 0).toLocaleString()}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 mt-5">
                      <span className="px-3 py-1.5 rounded-full bg-white/5 text-[10px] text-neutral-500 uppercase">
                        {product.category || "Uncategorized"}
                      </span>

                      <span
                        className={`px-3 py-1.5 rounded-full border text-[9px] font-bold uppercase tracking-wider ${stockStatus.className}`}
                      >
                        {stockStatus.label}
                      </span>

                      <span className="text-xs text-neutral-600">
                        {stock} units
                      </span>
                    </div>

                    <div className="flex gap-3 mt-5 pt-4 border-t border-white/5">
                      <Link
                        href={`/admin/products/${product.id}`}
                        className="flex-1 text-center bg-white text-black rounded-full py-2.5 text-xs font-bold hover:bg-neutral-200 transition"
                      >
                        Edit Product
                      </Link>

                      <button
                        onClick={() =>
                          deleteProduct(product.id, product.name)
                        }
                        disabled={deletingId === product.id}
                        className="px-5 rounded-full border border-red-500/20 text-red-400 text-xs font-bold hover:bg-red-500/10 disabled:opacity-40 transition"
                      >
                        {deletingId === product.id
                          ? "..."
                          : "Delete"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
```
