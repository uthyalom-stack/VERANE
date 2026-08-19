"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function ProductsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const brandFilter = searchParams.get("brand") || "ALL";

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(null);

  const loadProducts = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/products", {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Unable to load products.");
      }

      const data = await response.json();

      setProducts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Products loading error:", err);

      setError(
        err.message || "Unable to load products."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const filteredProducts = useMemo(() => {
    if (brandFilter === "ALL") {
      return products;
    }

    return products.filter(
      (product) => product.brand === brandFilter
    );
  }, [products, brandFilter]);

  const deleteProduct = async (id) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this product?"
    );

    if (!confirmed) return;

    try {
      setDeleting(id);

      const response = await fetch(`/api/products/${id}`, {
        method: "DELETE",
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          data?.error ||
            data?.message ||
            "Failed to delete product."
        );
      }

      setProducts((current) =>
        current.filter(
          (product) => String(product.id) !== String(id)
        )
      );
    } catch (err) {
      console.error("Delete product error:", err);

      alert(
        err.message ||
          "Something went wrong deleting the product."
      );
    } finally {
      setDeleting(null);
    }
  };

  const title =
    brandFilter === "UTHY_LUXURY"
      ? "UTHY LUXURY"
      : brandFilter === "ALOMZIEE_FOOTIES"
      ? "ALOMZIEE FOOTIES"
      : "All Products";

  return (
    <main className="min-h-screen bg-black text-white">

      <header className="border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-5">

          <button
            onClick={() => router.push("/admin")}
            className="text-xs text-neutral-500 hover:text-white transition mb-5"
          >
            ← Control Center
          </button>

          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-5">

            <div>
              <p className="text-[10px] uppercase tracking-[0.35em] text-amber-400">
                VÉRANE ADMIN
              </p>

              <h1 className="text-4xl md:text-5xl font-black mt-2">
                Products
              </h1>

              <p className="text-sm text-neutral-500 mt-2">
                {title}
              </p>
            </div>

            <button
              onClick={() =>
                router.push("/admin/products/add")
              }
              className="rounded-full bg-amber-500 text-black px-6 py-3 text-sm font-black hover:bg-amber-400 transition"
            >
              + Add Product
            </button>

          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-10">

        <div className="flex flex-wrap gap-2 mb-8">

          <FilterButton
            active={brandFilter === "ALL"}
            onClick={() =>
              router.push("/admin/products")
            }
          >
            All Products
          </FilterButton>

          <FilterButton
            active={brandFilter === "UTHY_LUXURY"}
            onClick={() =>
              router.push(
                "/admin/products?brand=UTHY_LUXURY"
              )
            }
          >
            UTHY LUXURY
          </FilterButton>

          <FilterButton
            active={brandFilter === "ALOMZIEE_FOOTIES"}
            onClick={() =>
              router.push(
                "/admin/products?brand=ALOMZIEE_FOOTIES"
              )
            }
          >
            ALOMZIEE FOOTIES
          </FilterButton>

        </div>

        {error && (
          <div className="mb-6 rounded-2xl border border-red-500/20 bg-red-500/5 px-5 py-4 text-sm text-red-300">
            {error}
          </div>
        )}

        {loading ? (
          <div className="py-20 text-center">

            <p className="text-amber-400 text-[10px] uppercase tracking-[0.3em]">
              VÉRANE
            </p>

            <p className="text-neutral-500 mt-3">
              Loading products...
            </p>

          </div>
        ) : filteredProducts.length === 0 ? (

          <div className="rounded-3xl border border-dashed border-white/10 p-16 text-center">

            <h2 className="text-xl font-black">
              No Products
            </h2>

            <p className="text-sm text-neutral-500 mt-2">
              There are no products in this section yet.
            </p>

            <button
              onClick={() =>
                router.push("/admin/products/add")
              }
              className="mt-6 rounded-full bg-amber-500 text-black px-6 py-3 text-sm font-black"
            >
              Add Your First Product
            </button>

          </div>

        ) : (

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">

            {filteredProducts.map((product) => {

              const image =
                Array.isArray(product.images) &&
                product.images.length > 0
                  ? product.images[0]
                  : null;

              return (
                <article
                  key={product.id}
                  className="rounded-3xl border border-white/10 bg-white/[0.025] overflow-hidden"
                >

                  <div className="aspect-square bg-neutral-950">

                    {image ? (
                      <img
                        src={image}
                        alt={product.name || "Product"}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-xs text-neutral-700">
                          NO IMAGE
                        </span>
                      </div>
                    )}

                  </div>

                  <div className="p-5">

                    <div className="flex items-start justify-between gap-4">

                      <div>
                        <h2 className="font-black">
                          {product.name}
                        </h2>

                        <p className="text-[10px] uppercase tracking-wider text-neutral-600 mt-1">
                          {product.brand}
                        </p>
                      </div>

                      <p className="font-black text-amber-400 whitespace-nowrap">
                        ₦
                        {Number(
                          product.price || 0
                        ).toLocaleString()}
                      </p>

                    </div>

                    <div className="flex items-center justify-between mt-5 text-xs">

                      <span className="text-neutral-500">
                        Stock:{" "}
                        <span className="text-white font-bold">
                          {product.inventory ?? 0}
                        </span>
                      </span>

                      <span className="text-neutral-600">
                        {product.category}
                      </span>

                    </div>

                    <div className="grid grid-cols-2 gap-2 mt-5">

                      <button
                        onClick={() =>
                          router.push(
                            `/admin/products/${product.id}/edit`
                          )
                        }
                        className="rounded-xl border border-white/10 py-3 text-xs font-bold hover:bg-white/5 transition"
                      >
                        Edit
                      </button>

                      <button
                        disabled={deleting === product.id}
                        onClick={() =>
                          deleteProduct(product.id)
                        }
                        className="rounded-xl border border-red-500/20 text-red-400 py-3 text-xs font-bold hover:bg-red-500/5 transition disabled:opacity-50"
                      >
                        {deleting === product.id
                          ? "Deleting..."
                          : "Delete"}
                      </button>

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

function ProductsLoading() {
  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="text-center">
        <p className="text-amber-400 text-[10px] uppercase tracking-[0.3em]">
          VÉRANE
        </p>

        <p className="text-neutral-500 mt-3">
          Loading products...
        </p>
      </div>
    </main>
  );
}

export default function ProductsPage() {
  return (
    <Suspense fallback={<ProductsLoading />}>
      <ProductsPageContent />
    </Suspense>
  );
}

function FilterButton({
  active,
  onClick,
  children,
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-5 py-2.5 text-xs font-bold transition ${
        active
          ? "bg-amber-500 text-black"
          : "border border-white/10 text-neutral-500 hover:text-white hover:border-white/20"
      }`}
    >
      {children}
    </button>
  );
}