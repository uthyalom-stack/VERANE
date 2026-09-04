"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

function parseImages(images) {
  if (Array.isArray(images)) {
    return images;
  }

  if (typeof images === "string") {
    try {
      const parsed = JSON.parse(images);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  return [];
}

/**
 * Render the administrative product management page.
 * @returns {JSX.Element} The product management interface.
 */
export default function ProductsPage() {
  const router = useRouter();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [deleteProduct, setDeleteProduct] = useState(null);
  const [deleting, setDeleting] = useState(false);

  async function loadProducts() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/admin/products", {
        cache: "no-store",
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          data?.error || "Unable to load products."
        );
      }

      setProducts(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Products loading error:", error);

      setError(
        error?.message || "Unable to load products."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProducts();
  }, []);

  async function handleConfirmDelete() {
    if (!deleteProduct?.id || deleting) return;

    try {
      setDeleting(true);
      setError("");
      setSuccess("");

      const response = await fetch(`/api/products/${deleteProduct.id}`, {
        method: "DELETE",
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.error || "Failed to delete product.");
      }

      setSuccess(data?.message || "Product removed successfully.");
      setDeleteProduct(null);
      await loadProducts();
    } catch (err) {
      console.error("Product deletion error:", err);
      setError(err?.message || "Failed to delete product.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <header className="border-b border-white/10">
        <div className="mx-auto max-w-7xl px-6 py-5">
          <button
            type="button"
            onClick={() => router.push("/admin")}
            className="mb-5 text-xs text-neutral-500 transition hover:text-white"
          >
            ← Control Center
          </button>

          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-[0.35em] text-amber-400">
                STORE ADMIN
              </p>

              <h1 className="mt-2 text-4xl font-black md:text-5xl">
                Products
              </h1>

              <p className="mt-2 text-sm text-neutral-500">
                Manage the products belonging to your store.
              </p>
            </div>

            <button
              type="button"
              onClick={() => router.push("/admin/products/add")}
              className="rounded-full bg-amber-500 px-6 py-3 text-sm font-black text-black transition hover:bg-amber-400"
            >
              + Add Product
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-10">
        {error && (
          <div className="mb-6 rounded-2xl border border-red-500/20 bg-red-500/5 px-5 py-4 text-sm text-red-300">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 px-5 py-4 text-sm text-emerald-300">
            {success}
          </div>
        )}

        {loading ? (
          <div className="py-20 text-center">
            <p className="text-[10px] uppercase tracking-[0.3em] text-amber-400">
              VÉRANE
            </p>

            <p className="mt-3 text-neutral-500">
              Loading products...
            </p>
          </div>
        ) : products.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-white/10 p-16 text-center">
            <h2 className="text-xl font-black">
              No Products
            </h2>

            <p className="mt-2 text-sm text-neutral-500">
              There are no products in your store yet.
            </p>

            <button
              type="button"
              onClick={() => router.push("/admin/products/add")}
              className="mt-6 rounded-full bg-amber-500 px-6 py-3 text-sm font-black text-black"
            >
              Add Your First Product
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => {
              const images = parseImages(product.images);
              const image = images[0] || null;

              return (
                <article
                  key={product.id}
                  className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.025]"
                >
                  <div className="aspect-square bg-neutral-950">
                    {image ? (
                      <img
                        src={image}
                        alt={product.name || "Product"}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <span className="text-xs text-neutral-700">
                          NO IMAGE
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <h2 className="truncate font-black">
                          {product.name}
                        </h2>

                        <p className="mt-1 text-[10px] uppercase tracking-wider text-neutral-600">
                          {product.brand}
                        </p>
                      </div>

                      <p className="whitespace-nowrap font-black text-amber-400">
                        ₦
                        {Number(
                          product.price || 0
                        ).toLocaleString()}
                      </p>
                    </div>

                    <div className="mt-5 flex items-center justify-between text-xs">
                      <span className="text-neutral-500">
                        Stock:{" "}
                        <span className="font-bold text-white">
                          {product.inventory ?? 0}
                        </span>
                      </span>

                      <span className="text-neutral-600">
                        {product.categoryRef?.name ||
                          product.category ||
                          "Uncategorized"}
                      </span>
                    </div>

                    <div className="mt-5 flex gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          router.push(
                            `/admin/products/${product.id}/edit`
                          )
                        }
                        className="flex-1 rounded-xl border border-white/10 py-3 text-xs font-bold transition hover:bg-white/5"
                      >
                        Edit Product
                      </button>

                      <button
                        type="button"
                        onClick={() => setDeleteProduct(product)}
                        className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-xs font-bold text-red-400 transition hover:bg-red-500 hover:text-white"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {/* DELETE CONFIRMATION MODAL */}
      {deleteProduct && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 px-5 backdrop-blur-md"
          onClick={() => !deleting && setDeleteProduct(null)}
        >
          <div
            className="w-full max-w-md rounded-3xl border border-white/10 bg-neutral-950 p-6 md:p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-red-400">
              Confirm Action
            </p>

            <h2 className="mt-2 text-2xl font-black">
              Remove Product?
            </h2>

            <div className="mt-4 rounded-2xl border border-white/5 bg-white/[0.02] p-4">
              <p className="text-sm font-bold text-white">
                {deleteProduct.name}
              </p>
              <p className="mt-1 text-xs text-neutral-500 uppercase">
                {deleteProduct.brand}
              </p>
            </div>

            <p className="mt-4 text-xs leading-relaxed text-neutral-400">
              If this product has historical customer orders, it will be safely archived (unassigned from active selling) so customer order history remains 100% intact. Otherwise, it will be permanently deleted.
            </p>

            <div className="mt-6 flex items-center gap-3">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setDeleteProduct(null)}
                className="flex-1 rounded-full border border-white/10 py-3 text-xs font-bold transition hover:bg-white/5"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={deleting}
                onClick={handleConfirmDelete}
                className="flex-1 rounded-full bg-red-500 py-3 text-xs font-bold text-white transition hover:bg-red-600 disabled:opacity-50"
              >
                {deleting ? "Processing..." : "Confirm Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}