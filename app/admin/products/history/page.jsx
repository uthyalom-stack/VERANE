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
 * Render the administrative Product History page for archived products.
 * @returns {JSX.Element} The archived products history interface.
 */
export default function ProductHistoryPage() {
  const router = useRouter();

  const [archivedProducts, setArchivedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadHistory() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/admin/products/history", {
        cache: "no-store",
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          data?.error || "Unable to load archived product history."
        );
      }

      setArchivedProducts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Product history loading error:", err);
      setError(err?.message || "Unable to load product history.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadHistory();
  }, []);

  return (
    <main className="min-h-screen bg-black text-white">
      <header className="border-b border-white/10">
        <div className="mx-auto max-w-7xl px-6 py-5">
          <button
            type="button"
            onClick={() => router.push("/admin/products")}
            className="mb-5 text-xs text-neutral-500 transition hover:text-white"
          >
            ← Active Products
          </button>

          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-[0.35em] text-amber-400">
                STORE ARCHIVE
              </p>

              <h1 className="mt-2 text-4xl font-black md:text-5xl">
                Product History
              </h1>

              <p className="mt-2 text-sm text-neutral-500">
                Archived products preserved for customer order history integrity.
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-10">
        {error && (
          <div className="mb-6 rounded-2xl border border-red-500/20 bg-red-500/5 px-5 py-4 text-sm text-red-300">
            {error}
          </div>
        )}

        {loading ? (
          <div className="py-20 text-center">
            <p className="text-[10px] uppercase tracking-[0.3em] text-amber-400">
              VÉRANE
            </p>

            <p className="mt-3 text-neutral-500">
              Loading product history...
            </p>
          </div>
        ) : archivedProducts.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-white/10 p-16 text-center">
            <h2 className="text-xl font-black">
              No Archived Products
            </h2>

            <p className="mt-2 text-sm text-neutral-500">
              There are no archived products in your store history.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {archivedProducts.map((product) => {
              const images = parseImages(product.images);
              const image = images[0] || null;
              const archivedDate = product.archivedAt
                ? new Date(product.archivedAt).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })
                : "Unknown";

              return (
                <article
                  key={product.id}
                  className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.025]"
                >
                  <div className="relative aspect-square bg-neutral-950">
                    {image ? (
                      <img
                        src={image}
                        alt={product.name || "Archived Product"}
                        className="h-full w-full object-cover grayscale opacity-80"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <span className="text-xs text-neutral-700">
                          NO IMAGE
                        </span>
                      </div>
                    )}

                    <span className="absolute top-4 left-4 rounded-full border border-amber-500/30 bg-black/80 px-3 py-1 text-[9px] font-black uppercase tracking-widest text-amber-400 backdrop-blur-md">
                      Archived
                    </span>
                  </div>

                  <div className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <h2 className="truncate font-black text-neutral-200">
                          {product.name}
                        </h2>

                        <p className="mt-1 text-[10px] uppercase tracking-wider text-neutral-500">
                          {product.brand}
                        </p>
                      </div>

                      <p className="whitespace-nowrap font-black text-neutral-400">
                        ₦
                        {Number(
                          product.price || 0
                        ).toLocaleString()}
                      </p>
                    </div>

                    <div className="mt-5 space-y-2 text-xs border-t border-white/5 pt-4">
                      <div className="flex items-center justify-between text-neutral-400">
                        <span>Archived On:</span>
                        <span className="font-semibold text-white">{archivedDate}</span>
                      </div>

                      <div className="flex items-center justify-between text-neutral-400">
                        <span>Historical Orders:</span>
                        <span className="font-semibold text-amber-400">
                          {product._count?.orderItems ?? 0} {product._count?.orderItems === 1 ? "Order Item" : "Order Items"}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-neutral-500">
                        <span>Category:</span>
                        <span>
                          {product.categoryRef?.name ||
                            product.category ||
                            "Uncategorized"}
                        </span>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
