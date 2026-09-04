"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import StorefrontProductActions from "@/components/StorefrontProductActions";
import { getProductStockStatus } from "@/lib/product-options";

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

/**
 * Render a product card with its image, stock status, details, and actions.
 * @param {Object} product - The product data displayed in the card.
 * @return {JSX.Element} The rendered product card.
 */
function ProductCard({ product }) {
  const image = getProductImage(product.images);
  const stockStatus = getProductStockStatus(product);

  return (
    <div className="group min-w-0">
      <Link href={`/product/${product.id}`} className="block">
        <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-white/[0.04]">
          {image ? (
            <img
              src={image}
              alt={product.name || "Product"}
              className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-2xl text-white/10">V</div>
          )}

          <div className="pointer-events-none absolute left-3 top-3 z-10 flex flex-col gap-1">
            <span className={`rounded-full border px-3 py-1 text-[8px] font-black uppercase tracking-[0.18em] backdrop-blur-md ${stockStatus.colorClass}`}>
              {stockStatus.label}
            </span>
          </div>
        </div>
      </Link>

      <div className="px-1 pt-3">
        <Link href={`/product/${product.id}`} className="block">
          <p className="truncate text-sm font-medium text-white">{product.name || "Unnamed Product"}</p>
          <p className="mt-1 text-xs text-white/40">{formatPrice(product.price)}</p>
        </Link>
        <StorefrontProductActions product={product} />
      </div>
    </div>
  );
}

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

        const response = await fetch(`/api/storefront/${encodeURIComponent(brand)}`, { cache: "no-store" });
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
    return <main className="flex min-h-screen items-center justify-center bg-black text-white"><div className="h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-amber-400" /></main>;
  }

  if (error || !section) {
    return (
      <main className="min-h-screen bg-black px-6 py-24 text-white">
        <div className="mx-auto max-w-xl rounded-3xl border border-white/10 bg-white/[0.03] p-10 text-center">
          <p className="text-sm text-red-400">{error || "Section not found."}</p>
          {brand && (
            <Link href={`/storefront/${encodeURIComponent(brand)}`} className="mt-6 inline-flex rounded-full bg-white px-6 py-3 text-xs font-bold uppercase tracking-[0.15em] text-black">
              Back to Store
            </Link>
          )}
        </div>
      </main>
    );
  }

  const products = Array.isArray(section.products) ? section.products : [];

  return (
    <main className="min-h-screen bg-black text-white">
      <section className="border-b border-white/10">
        <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:px-10 lg:py-24">
          <Link href={`/storefront/${encodeURIComponent(brand)}`} className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/40 hover:text-white">
            ← {brandName}
          </Link>

          {section.image && (
            <div className="mt-8 overflow-hidden rounded-[28px] border border-white/10 bg-neutral-950">
              <img src={section.image} alt={section.title || "Section"} className="max-h-[560px] w-full object-cover" />
            </div>
          )}

          <p className="mt-10 text-[9px] font-bold uppercase tracking-[0.35em] text-amber-400">{brandName}</p>
          <h1 className="mt-4 text-5xl font-semibold tracking-[-0.05em] sm:text-7xl">{section.title || "Featured"}</h1>
          {section.description && <p className="mt-5 max-w-2xl text-sm leading-7 text-white/40">{section.description}</p>}
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-5 py-14 sm:px-8 lg:px-10">
        {products.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-sm text-white/30">There are no products in this section yet.</p>
            <Link href={`/catalog?brand=${encodeURIComponent(brand)}`} className="mt-6 inline-flex rounded-full bg-white px-6 py-3 text-xs font-bold uppercase tracking-[0.15em] text-black">Browse Catalog</Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {products.map((product) => <ProductCard key={product.id} product={product} />)}
          </div>
        )}
      </div>
    </main>
  );
}
