"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import ProductCard from "@/components/storefront/ProductCard";

const VALID_BRANDS = ["UTHY_LUXURY", "ALOMZIEE_FOOTIES"];

export default function StorefrontSectionPage() {
  const params = useParams();
  const brand = params?.brand;
  const sectionId = params?.sectionId;
  const [section, setSection] = useState(null);
  const [brandName, setBrandName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!brand || !sectionId) return;

    async function loadSection() {
      try {
        setLoading(true);
        setError("");

        if (!VALID_BRANDS.includes(brand)) throw new Error("Invalid store.");

        const response = await fetch(`/api/storefront/${encodeURIComponent(brand)}`, {
          cache: "no-store",
        });
        const data = await response.json().catch(() => null);

        if (!response.ok) throw new Error(data?.error || "Failed to load section.");

        const found = Array.isArray(data?.sections)
          ? data.sections.find((item) => String(item.id) === String(sectionId))
          : null;

        if (!found) throw new Error("Section not found.");

        setBrandName(data?.brandInfo?.name || brand);
        setSection(found);
      } catch (err) {
        console.error("Storefront section loading error:", err);
        setError(err.message || "Failed to load section.");
      } finally {
        setLoading(false);
      }
    }

    loadSection();
  }, [brand, sectionId]);

  if (loading) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-[#070707] text-white">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/10 border-t-amber-400" />
        <p className="mt-4 text-xs font-bold uppercase tracking-luxury text-amber-400">
          Loading Section...
        </p>
      </main>
    );
  }

  if (error || !section) {
    return (
      <main className="min-h-screen bg-[#070707] px-6 py-28 text-white">
        <div className="mx-auto max-w-xl rounded-3xl border border-white/10 bg-neutral-950 p-10 text-center">
          <p className="text-sm text-red-400 mb-6">{error || "Section not found."}</p>
          {brand && (
            <Link
              href={`/storefront/${encodeURIComponent(brand)}`}
              className="inline-flex rounded-full bg-white px-8 py-3 text-xs font-bold uppercase tracking-luxury text-black hover:bg-amber-400 transition"
            >
              Back to Store
            </Link>
          )}
        </div>
      </main>
    );
  }

  const products = Array.isArray(section.products) ? section.products : [];
  const cardVariant =
    brand === "UTHY_LUXURY" ? "uthy" : brand === "ALOMZIEE_FOOTIES" ? "alomziee" : "standard";

  return (
    <main className="min-h-screen bg-[#070707] text-[#f5f5f5] pb-24">
      {/* SECTION HERO HEADER */}
      <section className="relative border-b border-white/[0.08] bg-gradient-to-b from-neutral-950 via-black to-[#070707] px-5 py-16 sm:px-8 lg:px-12 lg:py-20 overflow-hidden">
        <div className="pointer-events-none absolute left-1/2 top-0 h-[300px] w-[600px] -translate-x-1/2 rounded-full bg-amber-500/10 blur-[120px]" />

        <div className="mx-auto max-w-7xl">
          <Link
            href={`/storefront/${encodeURIComponent(brand)}`}
            className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-luxury text-neutral-400 hover:text-white transition mb-6"
          >
            <span>←</span> Back to {brandName || "Store"}
          </Link>

          {section.image && (
            <div className="mb-10 overflow-hidden rounded-3xl border border-white/10 bg-neutral-950 max-h-[480px]">
              <img
                src={section.image}
                alt={section.title || "Section"}
                className="h-full w-full object-cover"
              />
            </div>
          )}

          <div className="max-w-3xl">
            <p className="text-[10px] font-bold uppercase tracking-couture text-amber-400 mb-3">
              {brandName || "ATELIER SECTION"}
            </p>
            <h1 className="text-4xl sm:text-6xl font-editorial font-light tracking-tight text-white">
              {section.title || "Featured Edition"}
            </h1>
            {section.description && (
              <p className="mt-4 text-sm sm:text-base font-light text-neutral-400 leading-relaxed">
                {section.description}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* SECTION PRODUCTS GRID */}
      <div className="mx-auto max-w-7xl px-5 py-14 sm:px-8 lg:px-12">
        {products.length === 0 ? (
          <div className="py-20 text-center rounded-2xl border border-dashed border-white/10 bg-neutral-950/40 p-8">
            <p className="text-sm text-neutral-400 font-light">
              There are no pieces in this section yet.
            </p>
            <Link
              href={`/catalog?brand=${encodeURIComponent(brand)}`}
              className="mt-6 inline-flex rounded-full bg-white px-8 py-3 text-xs font-bold uppercase tracking-luxury text-black hover:bg-amber-400 transition"
            >
              Browse Full Catalog
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6 lg:gap-8">
            {products.map((product, idx) => (
              <ProductCard
                key={product.id}
                product={product}
                variant={cardVariant}
                priority={idx < 4}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
