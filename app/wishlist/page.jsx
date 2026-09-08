"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ProductCard from "@/components/storefront/ProductCard";

export default function WishlistPage() {
  const router = useRouter();
  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadWishlist() {
      try {
        const response = await fetch("/api/wishlist", { cache: "no-store" });

        if (response.status === 401) {
          router.replace("/login");
          return;
        }

        if (!response.ok) {
          throw new Error("Failed to load wishlist");
        }

        const data = await response.json();
        setWishlist(Array.isArray(data.wishlist) ? data.wishlist : []);
      } catch (error) {
        console.error("Failed to load wishlist:", error);
        setWishlist([]);
      } finally {
        setLoading(false);
      }
    }

    loadWishlist();
  }, [router]);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#070707] text-white flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-amber-400" />
          <p className="mt-4 text-xs font-bold uppercase tracking-luxury text-amber-400">
            Fetching Saved Favorites...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#070707] text-[#f5f5f5] pb-24">
      <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-12 py-12 lg:py-20">
        <Link
          href="/account"
          className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-luxury text-neutral-400 hover:text-white transition mb-6"
        >
          <span>←</span> Back to Member Portal
        </Link>

        <div className="border-b border-white/[0.08] pb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="h-px w-8 bg-amber-400" />
              <p className="text-[10px] font-bold uppercase tracking-couture text-amber-400">
                VÉRANE SAVED
              </p>
            </div>

            <h1 className="text-4xl sm:text-6xl font-editorial font-light tracking-tight text-white">
              Wishlist Collection
            </h1>

            <p className="text-neutral-400 text-xs sm:text-sm font-light mt-2">
              Your personal gallery of bookmarked garments and footwear.
            </p>
          </div>

          {wishlist.length > 0 && (
            <span className="text-xs uppercase tracking-luxury text-neutral-500 font-bold">
              {wishlist.length} {wishlist.length === 1 ? "Piece" : "Pieces"} Saved
            </span>
          )}
        </div>

        {wishlist.length === 0 ? (
          <div className="mt-12 rounded-3xl border border-white/10 bg-neutral-950/60 p-12 lg:p-16 text-center">
            <div className="mx-auto w-16 h-16 rounded-full border border-white/10 flex items-center justify-center font-editorial text-neutral-500 text-2xl">
              ♡
            </div>

            <h2 className="text-2xl font-editorial font-light text-white mt-6">
              Your Wishlist is Empty
            </h2>

            <p className="text-neutral-400 text-sm font-light mt-2 max-w-md mx-auto">
              Save your favorite pieces while exploring the catalog to revisit them anytime.
            </p>

            <Link
              href="/catalog"
              className="inline-flex mt-8 bg-amber-400 text-black px-8 py-3.5 rounded-full text-xs font-bold uppercase tracking-luxury hover:bg-amber-300 transition shadow-lg shadow-amber-400/10"
            >
              Explore House Catalog →
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6 lg:gap-8 mt-10">
            {wishlist.map((item, idx) => {
              const product = item.product || item;
              const variantMode =
                product?.brand === "UTHY_LUXURY"
                  ? "uthy"
                  : product?.brand === "ALOMZIEE_FOOTIES"
                  ? "alomziee"
                  : "standard";

              return (
                <ProductCard
                  key={item.id || product.id}
                  product={product}
                  variant={variantMode}
                  priority={idx < 4}
                />
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
