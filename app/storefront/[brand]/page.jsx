"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

const VALID_BRANDS = ["UTHY_LUXURY", "ALOMZIEE_FOOTIES"];

function formatPrice(price) {
  return `₦${Number(price || 0).toLocaleString("en-NG")}`;
}

function getProductImage(images) {
  if (!images) return "";
  if (Array.isArray(images)) return images[0] || "";

  try {
    const parsed = JSON.parse(images);
    return Array.isArray(parsed) ? parsed[0] || "" : "";
  } catch {
    return String(images).split(",")[0]?.trim() || "";
  }
}

function ProductCard({ product }) {
  const image = getProductImage(product.images);

  return (
    <Link href={`/product/${product.id}`} className="group block">
      <div className="aspect-[4/5] overflow-hidden rounded-2xl bg-white/[0.04]">
        {image ? (
          <img src={image} alt={product.name || "Product"} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
        ) : (
          <div className="flex h-full items-center justify-center text-2xl text-white/10">V</div>
        )}
      </div>
      <div className="pt-3">
        <p className="truncate text-sm font-medium text-white">{product.name || "Unnamed Product"}</p>
        <p className="mt-1 text-xs text-white/40">{formatPrice(product.price)}</p>
      </div>
    </Link>
  );
}

export default function BrandStorefrontPage() {
  const params = useParams();
  const brand = params?.brand;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!brand) return;

    async function loadStorefront() {
      try {
        setLoading(true);
        setError("");

        if (!VALID_BRANDS.includes(brand)) throw new Error("Invalid store.");

        const response = await fetch(`/api/storefront/${encodeURIComponent(brand)}`, { cache: "no-store" });
        const result = await response.json().catch(() => null);

        if (!response.ok) throw new Error(result?.error || "Failed to load store.");
        setData(result);
      } catch (err) {
        console.error("Storefront page loading error:", err);
        setError(err.message || "Failed to load store.");
      } finally {
        setLoading(false);
      }
    }

    loadStorefront();
  }, [brand]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black text-white">
        <div className="text-center">
          <p className="text-[10px] uppercase tracking-[0.35em] text-amber-400">VÉRANE</p>
          <p className="mt-3 text-sm text-white/30">Loading store...</p>
        </div>
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="min-h-screen bg-black px-6 py-24 text-white">
        <div className="mx-auto max-w-xl rounded-3xl border border-white/10 bg-white/[0.03] p-10 text-center">
          <p className="text-sm text-red-400">{error || "Store not found."}</p>
          <Link href="/catalog" className="mt-6 inline-flex rounded-full bg-white px-6 py-3 text-xs font-bold uppercase tracking-[0.15em] text-black">Browse Catalog</Link>
        </div>
      </main>
    );
  }

  const brandInfo = data.brandInfo || {};
  const products = Array.isArray(data.products) ? data.products : [];
  const sections = Array.isArray(data.sections) ? data.sections : [];
  const brandUrl = `/storefront/${encodeURIComponent(brand)}`;

  return (
    <main className="min-h-screen bg-black text-white">
      <section className="border-b border-white/10">
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:px-10 lg:py-28">
          {brandInfo.image && (
            <div className="mb-10 overflow-hidden rounded-[28px] border border-white/10 bg-neutral-950">
              <img src={brandInfo.image} alt={brandInfo.name || "Brand"} className="max-h-[620px] w-full object-cover" />
            </div>
          )}

          <div className="max-w-3xl">
            <p className="mb-5 text-[9px] font-bold uppercase tracking-[0.35em] text-amber-400">{brandInfo.name || brand}</p>
            <h1 className="text-5xl font-semibold tracking-[-0.05em] sm:text-7xl">{brandInfo.name || brand}</h1>
            {brandInfo.tagline && <p className="mt-5 text-lg text-white/60 sm:text-xl">{brandInfo.tagline}</p>}
            {brandInfo.description && <p className="mt-4 max-w-2xl text-sm leading-7 text-white/35">{brandInfo.description}</p>}
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-5 py-14 sm:px-8 lg:px-10">
        {sections.length > 0 ? (
          <div className="space-y-20">
            {sections.map((section) => {
              const sectionUrl = `${brandUrl}/section/${encodeURIComponent(section.id)}`;

              return (
                <section key={section.id}>
                  <Link href={sectionUrl} className="group block">
                    {section.image && (
                      <div className="mb-7 overflow-hidden rounded-[28px] border border-white/10 bg-neutral-950">
                        <img src={section.image} alt={section.title || "Section"} className="max-h-[560px] w-full object-cover transition duration-500 group-hover:scale-[1.01]" />
                      </div>
                    )}

                    <div className="mb-7 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                      <div>
                        <h2 className="text-2xl font-semibold tracking-[-0.03em] transition group-hover:text-amber-400 sm:text-3xl">{section.title || "Featured"}</h2>
                        {section.description && <p className="mt-2 text-sm text-white/35">{section.description}</p>}
                      </div>
                      <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/40 transition group-hover:text-white">View Section →</span>
                    </div>
                  </Link>

                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                    {Array.isArray(section.products) && section.products.map((product) => <ProductCard key={product.id} product={product} />)}
                  </div>
                </section>
              );
            })}
          </div>
        ) : (
          <section>
            <div className="mb-7">
              <h2 className="text-2xl font-semibold">Shop {brandInfo.name || brand}</h2>
              <p className="mt-2 text-sm text-white/35">Explore everything currently available from this store.</p>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {products.map((product) => <ProductCard key={product.id} product={product} />)}
            </div>
          </section>
        )}

        <div className="mt-20 border-t border-white/10 pt-8">
          <Link href={`/catalog?brand=${encodeURIComponent(brand)}`} className="inline-flex rounded-full border border-white/15 px-6 py-3 text-[10px] font-bold uppercase tracking-[0.15em] text-white transition hover:bg-white hover:text-black">View Full Catalog</Link>
        </div>
      </div>
    </main>
  );
}
