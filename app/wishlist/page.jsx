"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getProductStockStatus } from "@/lib/product-options";

export default function WishlistPage() {
const router = useRouter();

const [wishlist, setWishlist] = useState([]);
const [loading, setLoading] = useState(true);
const [removingId, setRemovingId] = useState(null);

useEffect(() => {
async function loadWishlist() {
try {
const response = await fetch("/api/wishlist", {
cache: "no-store",
});


    if (response.status === 401) {
      router.replace("/login");
      return;
    }

    if (!response.ok) {
      throw new Error("Failed to load wishlist");
    }

    const data = await response.json();

    setWishlist(
      Array.isArray(data.wishlist)
        ? data.wishlist
        : []
    );
  } catch (error) {
    console.error("Failed to load wishlist:", error);
    setWishlist([]);
  } finally {
    setLoading(false);
  }
}

loadWishlist();


}, [router]);

const getImages = (images) => {
if (!images) return [];


try {
  const parsed =
    typeof images === "string"
      ? JSON.parse(images)
      : images;

  return Array.isArray(parsed) ? parsed : [];
} catch {
  return [];
}


};

const getBrandName = (brand) => {
if (brand === "UTHY_LUXURY") {
return "UTHY LUXURY";
}


if (brand === "ALOMZIEE_FOOTIES") {
  return "ALOMZIEE FOOTIES";
}

return brand || "VÉRANE";


};

const removeFromWishlist = async (productId) => {
if (removingId) {
return;
}


setRemovingId(productId);

try {
  const response = await fetch("/api/wishlist", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      productId,
    }),
  });

  if (response.status === 401) {
    router.replace("/login");
    return;
  }

  if (!response.ok) {
    throw new Error("Failed to remove wishlist item");
  }

  setWishlist((current) =>
    current.filter(
      (item) => item.productId !== productId
    )
  );
} catch (error) {
  console.error(
    "Failed to remove wishlist item:",
    error
  );
} finally {
  setRemovingId(null);
}


};

if (loading) {
return ( <main className="min-h-screen bg-black text-white"> <div className="max-w-7xl mx-auto px-5 sm:px-8 py-16 md:py-24"> <div className="h-3 w-24 bg-neutral-900 rounded-full animate-pulse" />


      <div className="h-14 md:h-20 w-72 bg-neutral-900 rounded-2xl animate-pulse mt-5" />

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6 mt-12">
        {[1, 2, 3, 4].map((item) => (
          <div key={item}>
            <div className="aspect-[4/5] bg-neutral-900 rounded-[1.5rem] animate-pulse" />
            <div className="h-3 w-24 bg-neutral-900 rounded mt-4 animate-pulse" />
            <div className="h-5 w-36 bg-neutral-900 rounded mt-2 animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  </main>
);


}

return ( <main className="min-h-screen bg-black text-white"> <div className="max-w-7xl mx-auto px-5 sm:px-8 py-12 md:py-20"> <div> <Link
         href="/account"
         className="inline-flex items-center gap-2 text-neutral-600 text-[10px] uppercase tracking-[0.2em] hover:text-white transition"
       > <span>←</span>
My Account </Link>


      <p className="text-amber-400 text-[10px] font-bold tracking-[0.35em] uppercase mt-10">
        VÉRANE MEMBER
      </p>

      <div className="flex items-end justify-between gap-5 mt-3">
        <h1 className="text-5xl md:text-7xl font-black tracking-[-0.05em]">
          WISHLIST
        </h1>

        {wishlist.length > 0 && (
          <span className="text-neutral-600 text-xs uppercase tracking-[0.2em] pb-2">
            {wishlist.length}{" "}
            {wishlist.length === 1 ? "piece" : "pieces"}
          </span>
        )}
      </div>

      <p className="text-neutral-500 mt-4 max-w-xl">
        The pieces you've saved for later.
        Keep your favourites close.
      </p>
    </div>

    {wishlist.length === 0 && (
      <div className="mt-16 md:mt-20 border border-white/10 bg-neutral-950 rounded-[2rem] p-10 md:p-16 text-center">
        <div className="mx-auto w-16 h-16 rounded-full border border-white/10 flex items-center justify-center">
          <svg
            className="w-7 h-7 text-neutral-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.5"
              d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78Z"
            />
          </svg>
        </div>

        <p className="text-xl md:text-2xl font-black mt-7">
          Nothing saved yet.
        </p>

        <p className="text-sm text-neutral-500 max-w-md mx-auto mt-3 leading-relaxed">
          Explore the collections and tap the
          heart on anything you want to keep
          close.
        </p>

        <Link
          href="/catalog"
          className="inline-flex items-center justify-center mt-8 bg-white text-black px-7 py-4 rounded-full text-xs font-black uppercase tracking-wider hover:bg-neutral-200 transition"
        >
          Explore Collection →
        </Link>
      </div>
    )}

    {wishlist.length > 0 && (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-10 md:gap-x-6 md:gap-y-14 mt-12 md:mt-16">
        {wishlist.map((item) => {
          const product = item.product || item;
          const productId =
            item.productId || product.id;

          const images = getImages(product.images);

          const image =
            images.length > 0
              ? images[0]
              : null;

          const isRemoving =
            removingId === productId;

          return (
            <article
              key={productId}
              className={`group transition-all duration-300 ${
                isRemoving
                  ? "opacity-40 scale-[0.98]"
                  : ""
              }`}
            >
              <div className="relative aspect-[4/5] bg-neutral-950 rounded-[1.5rem] overflow-hidden border border-white/5">
                <Link
                  href={`/product/${productId}`}
                  className="block w-full h-full"
                >
                  {image ? (
                    <img
                      src={image}
                      alt={
                        product.name ||
                        "Saved product"
                      }
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-neutral-900 to-black">
                      <span className="text-neutral-700 text-[9px] uppercase tracking-[0.3em]">
                        No Image
                      </span>
                    </div>
                  )}
                </Link>

                <button
                  type="button"
                  onClick={() =>
                    removeFromWishlist(productId)
                  }
                  disabled={isRemoving}
                  aria-label="Remove from wishlist"
                  className="absolute top-3 right-3 w-10 h-10 rounded-full bg-black/70 backdrop-blur-md border border-white/10 text-white flex items-center justify-center hover:bg-white hover:text-black transition-all duration-300 disabled:cursor-wait"
                >
                  <svg
                    className="w-5 h-5"
                    fill="currentColor"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="1.5"
                      d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78Z"
                    />
                  </svg>
                </button>

                {(() => {
                  const stockStatus = getProductStockStatus(product);
                  return (
                    <span className={`absolute top-3 left-3 px-3 py-1.5 rounded-full text-[8px] font-bold uppercase tracking-[0.15em] border backdrop-blur-md ${stockStatus.colorClass}`}>
                      {stockStatus.label}
                    </span>
                  );
                })()}
              </div>

              <Link
                href={`/product/${productId}`}
                className="block mt-4"
              >
                <p className="text-amber-400 text-[8px] md:text-[9px] font-bold tracking-[0.25em] uppercase">
                  {getBrandName(product.brand)}
                </p>

                <h2 className="text-sm md:text-base font-bold mt-1 leading-tight group-hover:text-neutral-300 transition">
                  {product.name ||
                    "Untitled Product"}
                </h2>

                <p className="text-sm md:text-base font-semibold text-neutral-400 mt-2">
                  ₦
                  {Number(
                    product.price || 0
                  ).toLocaleString()}
                </p>
              </Link>
            </article>
          );
        })}
      </div>
    )}

    <div className="mt-16 md:mt-24 pt-8 border-t border-white/5 flex flex-col sm:flex-row gap-3 sm:justify-between">
      <Link
        href="/account"
        className="text-neutral-500 text-xs uppercase tracking-[0.15em] hover:text-white transition"
      >
        ← Back to account
      </Link>

      <Link
        href="/catalog"
        className="text-white text-xs font-bold uppercase tracking-[0.15em] hover:text-amber-400 transition"
      >
        Continue shopping →
      </Link>
    </div>
  </div>
</main>


);
}
