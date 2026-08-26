"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import StorefrontHeader from "@/components/StorefrontHeader";

function formatPrice(price) {
  return `₦${Number(price || 0).toLocaleString("en-NG")}`;
}

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
    return () => { cancelled = true; };
  }, [brand]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white">
        <StorefrontHeader />
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-amber-400" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-black text-white">
        <StorefrontHeader />
        <div className="mx-auto max-w-3xl px-6 py-24 text-center">
          <p className="text-sm text-red-400">{error || "Storefront unavailable."}</p>
          <Link href="/catalog" className="mt-6 inline-block rounded-full bg-white px-6 py-3 text-xs font-bold text-black">
            Shop All
          </Link>
        </div>
      </div>
    );
  }

  const brandInfo = data.brandInfo || {};
  const sections = Array.isArray(data.sections) ? data.sections : [];

  return (
    <div className="min-h-screen bg-black text-white">
      <StorefrontHeader />

      <main>
        <section className="border-b border-white/10 px-5 py-20 sm:px-8 lg:px-10 lg:py-28">
          <div className="mx-auto max-w-[1600px]">
            <p className="text-[9px] font-bold uppercase tracking-[0.35em] text-amber-400">
              {brandInfo.name || "VÉRANE"}
            </p>
            <h1 className="mt-4 max-w-5xl text-5xl font-semibold tracking-[-0.055em] sm:text-7xl lg:text-8xl">
              {brandInfo.tagline || brandInfo.name || "Discover the collection."}
            </h1>
            {brandInfo.description && (
              <p className="mt-6 max-w-2xl text-sm leading-7 text-white/40">
                {brandInfo.description}
              </p>
            )}
          </div>
        </section>

        <div className="mx-auto max-w-[1600px] px-5 py-14 sm:px-8 lg:px-10">
          {sections.length === 0 ? (
            <section className="py-20 text-center">
              <p className="text-sm text-white/30">This store has no featured sections yet.</p>
              <Link href={`/catalog?brand=${encodeURIComponent(brand)}`} className="mt-6 inline-block rounded-full bg-white px-6 py-3 text-xs font-bold uppercase tracking-[0.12em] text-black">
                Browse Products
              </Link>
            </section>
          ) : (
            sections.map((section) => (
              <section key={section.id} className="mb-20 last:mb-0">
                <div className="mb-7 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <h2 className="text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">{section.title}</h2>
                    {section.description && <p className="mt-2 max-w-2xl text-sm text-white/35">{section.description}</p>}
                  </div>
                  <Link href={`/catalog?brand=${encodeURIComponent(brand)}`} className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/40 transition hover:text-white">
                    View all
                  </Link>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                  {(section.products || []).map((product) => {
                    const image = Array.isArray(product.images) ? product.images[0] : "";
                    return (
                      <Link key={product.id} href={`/product/${product.id}`} className="group block">
                        <div className="aspect-[4/5] overflow-hidden rounded-2xl bg-neutral-950">
                          {image ? (
                            <img src={image} alt={product.name || "Product"} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                          ) : (
                            <div className="flex h-full items-center justify-center text-2xl text-white/10">V</div>
                          )}
                        </div>
                        <div className="px-1 pt-3">
                          <p className="truncate text-sm font-medium text-white/90">{product.name || "Unnamed Product"}</p>
                          <p className="mt-1 text-xs text-white/40">{formatPrice(product.price)}</p>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </section>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
