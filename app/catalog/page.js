"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { productRequiresOptions, getProductStockStatus } from "@/lib/product-options";

const categories = [
  { id: "all", name: "All" },
  { id: "shirts", name: "Shirts" },
  { id: "trousers", name: "Trousers" },
  { id: "hoodies", name: "Hoodies" },
  { id: "traditional", name: "Traditional" },
  { id: "shoes", name: "Shoes" },
  { id: "sandals", name: "Sandals" },
  { id: "slides", name: "Slides" },
  { id: "boots", name: "Boots" },
  { id: "belts", name: "Belts" },
  { id: "bags", name: "Bags" },
];

const brands = [
  { id: "all", name: "All Collections" },
  { id: "UTHY_LUXURY", name: "UTHY LUXURY" },
  { id: "ALOMZIEE_FOOTIES", name: "ALOMZIEE FOOTIES" },
];

function getImage(images) {
  if (!images) return null;

  try {
    const parsed =
      typeof images === "string"
        ? JSON.parse(images)
        : images;

    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed[0];
    }
  } catch {
    return null;
  }

  return null;
}

function getBrandName(brand) {
  if (brand === "UTHY_LUXURY") {
    return "UTHY LUXURY";
  }

  if (brand === "ALOMZIEE_FOOTIES") {
    return "ALOMZIEE FOOTIES";
  }

  return brand || "VÉRANE";
}

function getInventory(product) {
  return Number(product?.inventory ?? product?.stock ?? 0);
}

function HeartIcon({ filled }) {
  return (
    <svg
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={filled ? 1.5 : 1.8}
        d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78Z"
      />
    </svg>
  );
}

function CartIcon() {
  return (
    <svg
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
        d="M6 6h15l-1.5 8.5H8L6 3H3"
      />

      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
        d="M9 19.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3ZM18 19.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Z"
      />
    </svg>
  );
}

function Spinner() {
  return (
    <svg
      className="h-5 w-5 animate-spin"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeWidth="2"
        strokeDasharray="20 40"
      />
    </svg>
  );
}

function CatalogContent({
  defaultBrand = "all",
}) {
  const [products, setProducts] = useState([]);
  const [collections, setCollections] = useState([]);

  const [loading, setLoading] = useState(true);

  const [activeBrand, setActiveBrand] = useState(defaultBrand);
  const [activeCat, setActiveCat] = useState("all");
  const [activeCollection, setActiveCollection] =
    useState("all");

  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("newest");

  const [wishlist, setWishlist] = useState({});
  const [wishlistLoading, setWishlistLoading] =
    useState({});

  const [cartLoading, setCartLoading] = useState({});

  /*
   * Read brand from URL.
   */
  useEffect(() => {
    try {
      const params = new URLSearchParams(
        window.location.search
      );

      const brand = params.get("brand");

      if (
        brand === "UTHY_LUXURY" ||
        brand === "ALOMZIEE_FOOTIES"
      ) {
        setActiveBrand(brand);
      }
    } catch (error) {
      console.error(
        "Failed to read catalog URL:",
        error
      );
    }
  }, []);

  /*
   * Load products, collections and wishlist.
   */
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);

        const [prodRes, colRes] =
          await Promise.all([
            fetch("/api/products", {
              cache: "no-store",
            }),

            fetch("/api/collections", {
  cache: "no-store",
}),
          ]);

        if (!prodRes.ok) {
          throw new Error(
            `Products request failed: ${prodRes.status}`
          );
        }

        if (!colRes.ok) {
  console.error(
    `Collections request failed: ${colRes.status}`
  );
}

        const productsData =
          await prodRes.json();

console.log("CATALOG PRODUCTS:", productsData);

       const collectionsData = colRes.ok
  ? await colRes.json()
  : [];

        const loadedProducts =
          Array.isArray(productsData)
            ? productsData
            : [];

        const loadedCollections =
          Array.isArray(collectionsData)
            ? collectionsData.filter(
                (collection) =>
                  collection.enabled !== false
              )
            : [];

        setProducts(loadedProducts);
        setCollections(loadedCollections);

        /*
         * Load wishlist separately.
         *
         * This does NOT block the catalog from appearing.
         */
        fetch("/api/wishlist", {
          cache: "no-store",
        })
          .then(async (response) => {
            if (!response.ok) {
              return null;
            }

            return response.json();
          })
          .then((wishlistData) => {
            if (
              !wishlistData ||
              !Array.isArray(
                wishlistData.wishlist
              )
            ) {
              return;
            }

            const wishlistMap = {};

            wishlistData.wishlist.forEach(
              (item) => {
                if (item?.productId) {
                  wishlistMap[item.productId] =
                    true;
                }
              }
            );

            setWishlist(wishlistMap);
          })
          .catch((error) => {
            console.error(
              "Failed to load wishlist:",
              error
            );
          });
      } catch (error) {
        console.error(
          "Failed to load catalog:",
          error
        );

        setProducts([]);
        setCollections([]);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  /*
   * Filter and sort products.
   */
  const filtered = useMemo(() => {
    const searchTerm =
      search.toLowerCase().trim();

    const result = products.filter(
      (product) => {
        const matchBrand =
          activeBrand === "all" ||
          product.brand === activeBrand;

        const matchCat =
          activeCat === "all" ||
          product.category === activeCat;

        const matchCollection =
          activeCollection === "all" ||
          product.collectionId ===
            activeCollection;

        const productName =
          product.name?.toLowerCase() || "";

        const productDescription =
          product.description?.toLowerCase() ||
          "";

        const matchSearch =
          !searchTerm ||
          productName.includes(searchTerm) ||
          productDescription.includes(
            searchTerm
          );

        return (
          matchBrand &&
          matchCat &&
          matchCollection &&
          matchSearch
        );
      }
    );

    return [...result].sort((a, b) => {
      if (sort === "price-low") {
        return (
          Number(a.price || 0) -
          Number(b.price || 0)
        );
      }

      if (sort === "price-high") {
        return (
          Number(b.price || 0) -
          Number(a.price || 0)
        );
      }

      return (
        new Date(
          b.createdAt || 0
        ).getTime() -
        new Date(
          a.createdAt || 0
        ).getTime()
      );
    });
  }, [
    products,
    activeBrand,
    activeCat,
    activeCollection,
    search,
    sort,
  ]);

  /*
   * =====================================================
   * INSTANT WISHLIST
   * =====================================================
   *
   * The heart changes IMMEDIATELY.
   *
   * We do NOT wait for the database.
   *
   * The database request happens in the background.
   *
   * If the request fails, we restore the old state.
   */
  const toggleWishlist = async (
    event,
    product
  ) => {
    event.preventDefault();
    event.stopPropagation();

    if (
      !product?.id ||
      wishlistLoading[product.id]
    ) {
      return;
    }

    const productId = product.id;

    const oldState =
      Boolean(wishlist[productId]);

    const newState = !oldState;

    /*
     * CHANGE HEART IMMEDIATELY.
     */
    setWishlist((previous) => ({
      ...previous,
      [productId]: newState,
    }));

    /*
     * Mark request as running.
     */
    setWishlistLoading((previous) => ({
      ...previous,
      [productId]: true,
    }));

    try {
      const response = await fetch(
        "/api/wishlist",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            productId,
          }),
          keepalive: true,
        }
      );

      const data =
        await response
          .json()
          .catch(() => ({}));

      /*
       * Customer isn't logged in.
       */
      if (response.status === 401) {
        /*
         * Restore the old heart state.
         */
        setWishlist((previous) => ({
          ...previous,
          [productId]: oldState,
        }));

        window.location.href = "/login";
        return;
      }

      /*
       * Something failed.
       */
      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Failed to update wishlist"
        );
      }

      /*
       * Server confirms final state.
       */
      setWishlist((previous) => ({
        ...previous,
        [productId]: Boolean(
          data.wishlisted
        ),
      }));
    } catch (error) {
      console.error(
        "Wishlist update failed:",
        error
      );

      /*
       * ROLLBACK if database request fails.
       */
      setWishlist((previous) => ({
        ...previous,
        [productId]: oldState,
      }));
    } finally {
      setWishlistLoading((previous) => ({
        ...previous,
        [productId]: false,
      }));
    }
  };

  const router = useRouter();

  /*
   * =====================================================
   * PRODUCT CARD ACTION (CHECK OPTIONS vs ADD TO CART)
   * =====================================================
   */
  const handleProductCardAction = (
    event,
    product
  ) => {
    event.preventDefault();
    event.stopPropagation();

    if (!product?.id) {
      return;
    }

    const inventory = getInventory(product);
    if (inventory <= 0) {
      return;
    }

    const requiresOptions = productRequiresOptions(product);

    if (requiresOptions) {
      router.push(`/product/${product.id}`);
      return;
    }

    setCartLoading((previous) => ({
      ...previous,
      [product.id]: true,
    }));

    try {
      let cart;

      try {
        cart = JSON.parse(
          localStorage.getItem("cart") ||
            '{"items":[],"total":0,"event":"Verane"}'
        );
      } catch {
        cart = {
          items: [],
          total: 0,
          event: "Verane",
        };
      }

      if (!Array.isArray(cart.items)) {
        cart.items = [];
      }

      const existing = cart.items.find(
        (item) => item.id === product.id
      );

      if (existing) {
        const currentQty = Number(existing.qty || 0);
        existing.qty = Math.min(currentQty + 1, inventory);
      } else {
        cart.items.push({
          ...product,
          qty: 1,
        });
      }

      cart.total = cart.items.reduce(
        (sum, item) =>
          sum +
          Number(item.price || 0) * Number(item.qty || 0),
        0
      );

      localStorage.setItem("cart", JSON.stringify(cart));
      window.dispatchEvent(new CustomEvent("cart-updated"));
    } catch (error) {
      console.error("Failed to add product to cart:", error);
    } finally {
      setTimeout(() => {
        setCartLoading((previous) => ({
          ...previous,
          [product.id]: false,
        }));
      }, 350);
    }
  };

  /*
   * =====================================================
   * LOADING SCREEN
   * =====================================================
   */
  if (loading) {
    return (
      <main className="min-h-screen bg-black text-white">
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
          <div className="mb-10">
            <div className="h-3 w-32 animate-pulse rounded-full bg-neutral-900" />

            <div className="mt-5 h-20 w-full max-w-3xl animate-pulse rounded-2xl bg-neutral-900" />
          </div>

          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {Array.from({
              length: 8,
            }).map((_, i) => (
              <div
                key={i}
                className="aspect-[4/5] animate-pulse rounded-2xl bg-neutral-900"
              />
            ))}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-7xl px-5 py-12 sm:px-8">

        {/* HEADER */}
        <div className="mb-10">
          <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.45em] text-amber-400">
            The Collection
          </p>

          <h1 className="text-5xl font-black leading-[0.9] tracking-[-0.05em] md:text-7xl">
            DRESS YOUR
            <br />

            <span className="bg-gradient-to-r from-amber-300 via-yellow-500 to-amber-600 bg-clip-text text-transparent">
              EXPRESSION.
            </span>
          </h1>
        </div>

        {/* COLLECTION FILTER */}
        {collections.length > 0 && (
          <div className="mb-8 overflow-x-auto pb-2">
            <div className="flex w-max gap-2">
              <button
                type="button"
                onClick={() =>
                  setActiveCollection(
                    "all"
                  )
                }
                className={`rounded-full px-5 py-2.5 text-xs font-bold uppercase tracking-wider transition ${
                  activeCollection === "all"
                    ? "bg-white text-black"
                    : "border border-white/10 bg-neutral-950 text-neutral-400 hover:text-white"
                }`}
              >
                All
              </button>

              {collections.map(
                (collection) => (
                  <button
                    type="button"
                    key={collection.id}
                    onClick={() =>
                      setActiveCollection(
                        collection.id
                      )
                    }
                    className={`whitespace-nowrap rounded-full px-5 py-2.5 text-xs font-bold uppercase tracking-wider transition ${
                      activeCollection ===
                      collection.id
                        ? "bg-white text-black"
                        : "border border-white/10 bg-neutral-950 text-neutral-400 hover:text-white"
                    }`}
                  >
                    {collection.name}
                  </button>
                )
              )}
            </div>
          </div>
        )}

        {/* BRAND FILTER */}
        <div className="mb-6 overflow-x-auto pb-2">
          <div className="flex w-max gap-3">
            {brands.map((brand) => (
              <button
                type="button"
                key={brand.id}
                onClick={() =>
                  setActiveBrand(
                    brand.id
                  )
                }
                className={`whitespace-nowrap rounded-full px-5 py-2.5 text-xs font-bold uppercase tracking-wider transition ${
                  activeBrand ===
                  brand.id
                    ? "bg-amber-500 text-black"
                    : "border border-white/20 text-neutral-400 hover:border-white/40 hover:text-white"
                }`}
              >
                {brand.name}
              </button>
            ))}
          </div>
        </div>

        {/* SEARCH + SORT */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row">
          <input
            value={search}
            onChange={(event) =>
              setSearch(
                event.target.value
              )
            }
            placeholder="Search products..."
            className="w-full max-w-md rounded-full border border-white/10 bg-neutral-950 px-5 py-3 text-sm text-white outline-none transition placeholder:text-neutral-600 focus:border-amber-400/40"
          />

          <select
            value={sort}
            onChange={(event) =>
              setSort(
                event.target.value
              )
            }
            className="rounded-full border border-white/10 bg-neutral-950 px-5 py-3 text-sm text-white outline-none"
          >
            <option value="newest">
              Newest
            </option>

            <option value="price-low">
              Price: Low to High
            </option>

            <option value="price-high">
              Price: High to Low
            </option>
          </select>
        </div>

        {/* CATEGORY FILTER */}
        <div className="mb-10 overflow-x-auto pb-2">
          <div className="flex w-max gap-2">
            {categories.map(
              (category) => (
                <button
                  type="button"
                  key={category.id}
                  onClick={() =>
                    setActiveCat(
                      category.id
                    )
                  }
                  className={`whitespace-nowrap rounded-full px-4 py-2 text-xs font-bold transition ${
                    activeCat ===
                    category.id
                      ? "bg-amber-500 text-black"
                      : "bg-neutral-950 text-neutral-400 hover:text-white"
                  }`}
                >
                  {category.name}
                </button>
              )
            )}
          </div>
        </div>

        {/* RESULT COUNT */}
        <div className="mb-6 flex items-center justify-between">
          <p className="text-xs text-neutral-500">
            {filtered.length}{" "}
            {filtered.length === 1
              ? "piece"
              : "pieces"}
          </p>
        </div>

        {/* PRODUCTS */}
        {filtered.length === 0 ? (
          <div className="py-24 text-center">
            <p className="text-lg font-semibold">
              No products found.
            </p>

            <p className="mt-2 text-sm text-neutral-500">
              Try changing your
              filters or search.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-x-4 gap-y-10 lg:grid-cols-4">
            {filtered.map(
              (product) => {
                const image =
                  getImage(
                    product.images
                  );

                const inventory =
                  getInventory(
                    product
                  );

                const isOutOfStock =
                  inventory <= 0;

                const isWishlisted =
                  Boolean(
                    wishlist[
                      product.id
                    ]
                  );

                const isWishlistBusy =
                  Boolean(
                    wishlistLoading[
                      product.id
                    ]
                  );

                const isCartBusy =
                  Boolean(
                    cartLoading[
                      product.id
                    ]
                  );

                return (
                  <div
                    key={product.id}
                    className="group block"
                  >
                    {/* PRODUCT IMAGE */}
                    <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-neutral-950">

                      {/* IMAGE LINK */}
                      <Link
                        href={`/product/${product.id}`}
                        className="absolute inset-0 z-0"
                      >
                        {image ? (
                          <img
                            src={image}
                            alt={
                              product.name ||
                              "Product"
                            }
                            loading="lazy"
                            className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-6xl">
                            👔
                          </div>
                        )}
                      </Link>

                      {/* PRE-ORDER / STOCK BADGES */}
                      <div className="pointer-events-none absolute left-3 top-3 z-10 flex flex-col gap-1">
                        {(() => {
                          const stockStatus = getProductStockStatus(product);
                          return (
                            <span className={`rounded-full px-3 py-1 text-[9px] font-black uppercase tracking-wider backdrop-blur border ${stockStatus.colorClass}`}>
                              {stockStatus.label}
                            </span>
                          );
                        })()}
                      </div>

                      {/* TOP ACTIONS */}
                      <div className="absolute right-3 top-3 z-20 flex flex-col gap-2">

                        {/* WISHLIST */}
                        <button
                          type="button"
                          onClick={(
                            event
                          ) =>
                            toggleWishlist(
                              event,
                              product
                            )
                          }
                          disabled={
                            isWishlistBusy
                          }
                          aria-label={
                            isWishlisted
                              ? "Remove from wishlist"
                              : "Add to wishlist"
                          }
                          className={`flex h-10 w-10 items-center justify-center rounded-full border backdrop-blur-xl transition-all ${
                            isWishlisted
                              ? "border-white bg-white text-black scale-105"
                              : "border-white/20 bg-black/60 text-white hover:border-white/50 hover:bg-black/80"
                          } ${
                            isWishlistBusy
                              ? "cursor-wait opacity-70"
                              : ""
                          }`}
                        >
                          {isWishlistBusy ? (
                            <Spinner />
                          ) : (
                            <HeartIcon
                              filled={
                                isWishlisted
                              }
                            />
                          )}
                        </button>

                        {/* QUICK ADD / CHECK OPTIONS */}
                        {!isOutOfStock && (
                          <button
                            type="button"
                            onClick={(
                              event
                            ) =>
                              handleProductCardAction(
                                event,
                                product
                              )
                            }
                            disabled={
                              isCartBusy
                            }
                            aria-label={productRequiresOptions(product) ? "Check options" : "Add to cart"}
                            className={`flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-black/60 text-white backdrop-blur-xl transition-all hover:border-amber-400/70 hover:bg-amber-500 hover:text-black ${
                              isCartBusy
                                ? "cursor-wait opacity-70"
                                : ""
                            }`}
                          >
                            {isCartBusy ? (
                              <Spinner />
                            ) : (
                              <CartIcon />
                            )}
                          </button>
                        )}
                      </div>

                      {/* DESKTOP QUICK ADD / CHECK OPTIONS */}
                      {!isOutOfStock && (
                        <button
                          type="button"
                          onClick={(
                            event
                          ) =>
                            handleProductCardAction(
                              event,
                              product
                            )
                          }
                          disabled={
                            isCartBusy
                          }
                          className="absolute bottom-3 left-3 right-3 z-20 hidden translate-y-2 rounded-full bg-white px-4 py-3 text-[10px] font-black uppercase tracking-[0.15em] text-black opacity-0 shadow-xl transition-all duration-300 hover:bg-amber-400 group-hover:translate-y-0 group-hover:opacity-100 sm:block"
                        >
                          {isCartBusy
                            ? "Adding..."
                            : productRequiresOptions(product)
                            ? "CHECK OPTIONS"
                            : "Quick Add to Cart"}
                        </button>
                      )}
                    </div>

                    {/* PRODUCT INFORMATION */}
                    <Link
                      href={`/product/${product.id}`}
                      className="block"
                    >
                      <p className="mt-4 text-[9px] font-bold uppercase tracking-[0.18em] text-amber-400">
                        {getBrandName(
                          product.brand
                        )}
                      </p>

                      <div className="mt-1 flex items-start justify-between gap-3">
                        <h3 className="text-sm font-semibold md:text-base">
                          {product.name}
                        </h3>

                        <span className="shrink-0 text-sm text-white">
                          ₦
                          {Number(
                            product.price ||
                              0
                          ).toLocaleString()}
                        </span>
                      </div>

                      {product.category && (
                        <p className="mt-2 text-[9px] uppercase tracking-[0.15em] text-neutral-600">
                          {
                            product.category
                          }
                        </p>
                      )}
                    </Link>
                  </div>
                );
              }
            )}
          </div>
        )}
      </div>
    </main>
  );
}

export default function CatalogPage({
  brand = "all",
}) {
  return (
    <CatalogContent defaultBrand={brand} />
  );
}