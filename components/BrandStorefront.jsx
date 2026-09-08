"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ProductCard from "@/components/storefront/ProductCard";

export default function BrandStorefront({ brand }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          `/api/storefront/${encodeURIComponent(brand)}`,
          { cache: "no-store" }
        );

        const result = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(result?.error || "Failed to load storefront.");
        }

        if (!cancelled) setData(result);
      } catch (err) {
        if (!cancelled) setError(err.message || "Failed to load storefront.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [brand]);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#070707] text-white">
        <div className="flex min-h-[60vh] flex-col items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/10 border-t-amber-400" />
          <p className="mt-4 text-xs font-bold uppercase tracking-luxury text-amber-400">Loading Atelier Store...</p>
        </div>
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="min-h-screen bg-[#070707] text-white">
        <div className="mx-auto max-w-3xl px-6 py-28 text-center">
          <p className="text-sm text-red-400 mb-6">{error || "Storefront unavailable."}</p>
          <Link
            href={`/catalog?brand=${encodeURIComponent(brand)}`}
            className="inline-block rounded-full bg-white px-8 py-3 text-xs font-bold uppercase tracking-luxury text-black hover:bg-amber-400 transition"
          >
            Explore Brand Catalog
          </Link>
        </div>
      </main>
    );
  }

  const brandInfo = data.brandInfo || {};
  const sections = Array.isArray(data.sections) ? data.sections : [];
  const cardVariant = brand === "UTHY_LUXURY" ? "uthy" : brand === "ALOMZIEE_FOOTIES" ? "alomziee" : "standard";

  return (
    <main className="min-h-screen bg-[#070707] text-[#f5f5f5] pb-24">
      {/* BRAND HERO SECTION */}
      <section className="relative border-b border-white/[0.08] bg-gradient-to-b from-neutral-950 via-black to-[#070707] px-5 py-16 sm:px-8 lg:px-12 lg:py-24 overflow-hidden">
        <div className="pointer-events-none absolute left-1/2 top-0 h-[350px] w-[700px] -translate-x-1/2 rounded-full bg-amber-500/10 blur-[130px]" />

        <div className="mx-auto max-w-7xl">
          {brandInfo.image && (
            <div className="mb-12 overflow-hidden rounded-3xl border border-white/10 bg-neutral-950 shadow-2xl aspect-[21/9] max-h-[500px]">
              <img
                src={brandInfo.image}
                alt={brandInfo.name || "Brand Image"}
                className="h-full w-full object-cover"
              />
            </div>
          )}

          <div className="max-w-4xl">
            <div className="flex items-center gap-3 mb-4">
              <span className="h-px w-8 bg-amber-400" />
              <p className="text-[10px] font-bold uppercase tracking-couture text-amber-400">
                {brandInfo.name || "VÉRANE HOUSE"}
              </p>
            </div>

            <h1 className="text-4xl sm:text-6xl lg:text-8xl font-editorial font-light tracking-tight text-white leading-none">
              {brandInfo.tagline || brandInfo.name || "Discover the collection."}
            </h1>

            {brandInfo.description && (
              <p className="mt-6 max-w-2xl text-sm sm:text-base font-light text-neutral-400 leading-relaxed">
                {brandInfo.description}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* FEATURED SECTIONS & PRODUCTS */}
      <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:px-12">
        {sections.length === 0 ? (
          <section className="py-20 text-center rounded-2xl border border-dashed border-white/10 bg-neutral-950/40 p-8">
            <p className="text-sm text-neutral-400 font-light">
              This store currently has no featured sections available.
            </p>
            <Link
              href={`/catalog?brand=${encodeURIComponent(brand)}`}
              className="mt-6 inline-block rounded-full bg-white px-8 py-3 text-xs font-bold uppercase tracking-luxury text-black hover:bg-amber-400 transition"
            >
              Browse Full Brand Catalog
            </Link>
          </section>
        ) : (
          sections.map((section) => (
            <section key={section.id} className="mb-20 last:mb-0">
              {section.image && (
                <div className="mb-8 overflow-hidden rounded-3xl border border-white/10 bg-neutral-950 max-h-[480px]">
                  <img
                    src={section.image}
                    alt={section.title || "Section Banner"}
                    className="h-full w-full object-cover"
                  />
                </div>
              )}

              <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between border-b border-white/[0.06] pb-5">
                <div>
                  <h2 className="text-3xl sm:text-4xl font-editorial font-light tracking-tight text-white">
                    {section.title}
                  </h2>
                  {section.description && (
                    <p className="mt-2 max-w-2xl text-xs sm:text-sm text-neutral-400 font-light">
                      {section.description}
                    </p>
                  )}
                </div>

                <Link
                  href={`/catalog?brand=${encodeURIComponent(brand)}`}
                  className="text-[10px] font-bold uppercase tracking-luxury text-amber-400/90 transition hover:text-amber-300"
                >
                  View Collection →
                </Link>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6 lg:gap-8">
                {(section.products || []).map((product, idx) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    variant={cardVariant}
                    priority={idx < 2}
                  />
                ))}
              </div>
            </section>
          ))
        )}

        <div className="mt-20 border-t border-white/[0.08] pt-10 text-center">
          <Link
            href={`/catalog?brand=${encodeURIComponent(brand)}`}
            className="inline-flex rounded-full border border-white/20 bg-neutral-900/80 px-8 py-3.5 text-xs font-bold uppercase tracking-luxury text-white transition hover:bg-white hover:text-black"
          >
            Explore Entire {brandInfo.name || "Brand"} Catalog
          </Link>
        </div>
      </div>
    </main>
  );
}
