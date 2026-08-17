"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function CollectionsPage() {
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadCollections();
  }, []);

  async function loadCollections() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/admin/collections", {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Failed to load collections");
      }

      const data = await response.json();

      const items = Array.isArray(data)
        ? data
        : Array.isArray(data.collections)
          ? data.collections
          : [];

      setCollections(items);
    } catch (error) {
      console.error("Collections loading error:", error);
      setError("Unable to load collections.");
    } finally {
      setLoading(false);
    }
  }

  async function toggleCollection(collection) {
    try {
      const response = await fetch(
        `/api/admin/collections/${collection.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            enabled: !collection.enabled,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to update collection");
      }

      setCollections((current) =>
        current.map((item) =>
          item.id === collection.id
            ? {
                ...item,
                enabled: !item.enabled,
              }
            : item
        )
      );
    } catch (error) {
      console.error("Collection update error:", error);
      setError("Unable to update this collection.");
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-black px-5 py-10 text-white sm:px-8">
        <div className="mx-auto max-w-6xl animate-pulse">
          <div className="mb-10">
            <div className="h-3 w-28 rounded-full bg-white/10" />
            <div className="mt-4 h-12 w-72 rounded-xl bg-white/10" />
            <div className="mt-3 h-4 w-96 max-w-full rounded-full bg-white/5" />
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <div className="h-80 rounded-[28px] bg-white/[0.04]" />
            <div className="h-80 rounded-[28px] bg-white/[0.04]" />
            <div className="h-80 rounded-[28px] bg-white/[0.04]" />
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black px-5 pb-24 pt-10 text-white sm:px-8 lg:px-10">
      <div className="mx-auto max-w-6xl">

        {/* HEADER */}
        <header className="mb-10">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="mb-4 flex items-center gap-3">
                <span className="h-px w-9 bg-amber-400" />

                <span className="text-[10px] font-bold uppercase tracking-[0.32em] text-amber-400">
                  Commerce / Collections
                </span>
              </div>

              <h1 className="text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">
                Collections
              </h1>

              <p className="mt-3 max-w-xl text-sm leading-6 text-white/40 sm:text-base">
                Curate the way your products are presented and
                organised across the VÉRANE storefront.
              </p>
            </div>

            <Link
              href="/admin/collections/add"
              className="inline-flex w-fit items-center gap-3 rounded-full bg-amber-400 px-6 py-3.5 text-xs font-bold text-black transition hover:bg-amber-300 hover:shadow-[0_0_30px_rgba(245,185,66,0.15)]"
            >
              <span className="text-base leading-none">+</span>
              New Collection
            </Link>
          </div>
        </header>

        {/* ERROR */}
        {error && (
          <div className="mb-6 flex items-center justify-between gap-4 rounded-2xl border border-red-400/20 bg-red-400/[0.06] px-5 py-4">
            <p className="text-sm text-red-300">{error}</p>

            <button
              onClick={() => setError("")}
              className="text-xs font-semibold text-white/40 hover:text-white"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* OVERVIEW */}
        <section className="mb-10 grid overflow-hidden rounded-[28px] border border-white/[0.08] bg-white/[0.025] sm:grid-cols-3">

          <div className="border-b border-white/[0.07] p-6 sm:border-b-0 sm:border-r">
            <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-white/30">
              Total
            </p>

            <p className="mt-3 text-3xl font-semibold">
              {collections.length}
            </p>

            <p className="mt-1 text-xs text-white/30">
              Collections
            </p>
          </div>

          <div className="border-b border-white/[0.07] p-6 sm:border-b-0 sm:border-r">
            <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-white/30">
              Published
            </p>

            <p className="mt-3 text-3xl font-semibold">
              {
                collections.filter(
                  (collection) => collection.enabled
                ).length
              }
            </p>

            <p className="mt-1 text-xs text-white/30">
              Visible on storefront
            </p>
          </div>

          <div className="p-6">
            <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-white/30">
              Hidden
            </p>

            <p className="mt-3 text-3xl font-semibold">
              {
                collections.filter(
                  (collection) => !collection.enabled
                ).length
              }
            </p>

            <p className="mt-1 text-xs text-white/30">
              Not currently visible
            </p>
          </div>

        </section>

        {/* EMPTY STATE */}
        {collections.length === 0 ? (
          <section className="rounded-[30px] border border-dashed border-white/[0.12] bg-white/[0.02] px-6 py-20 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.03] text-2xl text-white/40">
              ◇
            </div>

            <h2 className="mt-6 text-2xl font-semibold">
              No collections yet
            </h2>

            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-white/35">
              Create your first collection to start organising
              products into curated storefront experiences.
            </p>

            <Link
              href="/admin/collections/add"
              className="mt-7 inline-flex items-center gap-3 rounded-full bg-amber-400 px-6 py-3.5 text-xs font-bold text-black transition hover:bg-amber-300"
            >
              Create First Collection
              <span>→</span>
            </Link>
          </section>
        ) : (
          /* COLLECTION GRID */
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {collections.map((collection) => {
              const productCount = Array.isArray(collection.products)
                ? collection.products.length
                : collection._count?.products ?? 0;

              return (
                <article
                  key={collection.id}
                  className="group overflow-hidden rounded-[28px] border border-white/[0.08] bg-white/[0.025] transition duration-300 hover:-translate-y-1 hover:border-white/[0.14] hover:bg-white/[0.04]"
                >

                  {/* IMAGE */}
                  <div className="relative aspect-[4/3] overflow-hidden bg-neutral-950">

                    {collection.image ? (
                      <img
                        src={collection.image}
                        alt={collection.name || "Collection"}
                        className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-neutral-950 via-neutral-900 to-black">
                        <span className="text-4xl text-white/10">
                          ◇
                        </span>
                      </div>
                    )}

                    {/* IMAGE OVERLAY */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/10" />

                    {/* STATUS */}
                    <div className="absolute left-4 top-4">
                      <span
                        className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.18em] backdrop-blur-md ${
                          collection.enabled
                            ? "border-emerald-400/20 bg-black/50 text-emerald-300"
                            : "border-white/10 bg-black/50 text-white/40"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            collection.enabled
                              ? "bg-emerald-400"
                              : "bg-white/30"
                          }`}
                        />

                        {collection.enabled
                          ? "Published"
                          : "Hidden"}
                      </span>
                    </div>

                    {/* PRODUCT COUNT */}
                    <div className="absolute bottom-4 right-4">
                      <span className="rounded-full border border-white/10 bg-black/50 px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[0.15em] text-white/60 backdrop-blur-md">
                        {productCount}{" "}
                        {productCount === 1
                          ? "Product"
                          : "Products"}
                      </span>
                    </div>
                  </div>

                  {/* CONTENT */}
                  <div className="p-5">

                    <h2 className="text-xl font-semibold tracking-tight">
                      {collection.name}
                    </h2>

                    <p className="mt-2 min-h-[48px] text-sm leading-6 text-white/35">
                      {collection.description ||
                        "No collection description added yet."}
                    </p>

                    {/* ACTIONS */}
                    <div className="mt-5 flex items-center gap-2 border-t border-white/[0.06] pt-4">

                      <Link
                        href={`/admin/collections/${collection.id}`}
                        className="flex-1 rounded-xl border border-white/[0.08] bg-white/[0.025] px-4 py-3 text-center text-[10px] font-bold uppercase tracking-[0.16em] text-white/60 transition hover:border-white/20 hover:text-white"
                      >
                        Edit
                      </Link>

                      <button
                        onClick={() =>
                          toggleCollection(collection)
                        }
                        className={`rounded-xl px-4 py-3 text-[10px] font-bold uppercase tracking-[0.16em] transition ${
                          collection.enabled
                            ? "border border-white/[0.08] bg-white/[0.025] text-white/40 hover:border-red-400/20 hover:bg-red-400/[0.05] hover:text-red-300"
                            : "border border-emerald-400/20 bg-emerald-400/[0.06] text-emerald-300 hover:bg-emerald-400/[0.1]"
                        }`}
                      >
                        {collection.enabled
                          ? "Hide"
                          : "Publish"}
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