"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import Link from "next/link";

/**
 * Displays product details, manages product options and wishlist state, and adds selected items to the cart.
 */
export default function ProductDetail() {
  const { id } = useParams();
  const router = useRouter();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);

  const [qty, setQty] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);

  const [wishlist, setWishlist] = useState(false);
  const [wishlistLoading, setWishlistLoading] = useState(false);

  const [selectedColor, setSelectedColor] = useState(null);
  const [selectedSize, setSelectedSize] = useState(null);

  const [selectedVariants, setSelectedVariants] = useState([]);

  const [customSizing, setCustomSizing] = useState("");

  const [sizeGuideOpen, setSizeGuideOpen] = useState(false);

  useEffect(() => {
    async function loadProduct() {
      try {
        const response = await fetch("/api/products", {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Failed to fetch products");
        }

        const products = await response.json();
        const found = products.find((p) => p.id === id);

        setProduct(found || null);
      } catch (error) {
        console.error("Failed to load product:", error);
        setProduct(null);
      } finally {
        setLoading(false);
      }
    }

    async function loadWishlistStatus() {
      try {
        const response = await fetch("/api/wishlist", {
          cache: "no-store",
        });

        if (response.status === 401 || !response.ok) {
          return;
        }

        const data = await response.json();

        const isSaved = Array.isArray(data.wishlist)
          ? data.wishlist.some(
              (item) => item.productId === id
            )
          : false;

        setWishlist(isSaved);
      } catch (error) {
        console.error(
          "Failed to load wishlist status:",
          error
        );
      }
    }

    if (id) {
      loadProduct();
      loadWishlistStatus();
    }
  }, [id]);

  const parseArray = (value) => {
    if (!value) return [];

    try {
      const parsed =
        typeof value === "string"
          ? JSON.parse(value)
          : value;

      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  const getImages = (images) => {
    return parseArray(images);
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

  const images = product
    ? getImages(product.images)
    : [];

  const productColors = Array.isArray(
    product?.productColors
  )
    ? product.productColors
    : [];

  const variants = Array.isArray(product?.variants)
    ? product.variants
    : [];

  const inventory = Math.max(
    0,
    Number(product?.inventory ?? 0)
  );

  const initialInventory = Math.max(
    0,
    Number(
      product?.initialInventory ?? inventory
    )
  );

  const stockPercentage =
    initialInventory > 0
      ? (inventory / initialInventory) * 100
      : inventory > 0
      ? 100
      : 0;

  const isPreOrder = Boolean(
    product?.preOrderEnabled ||
      product?.isPreOrder
  );

  const customSizingEnabled = Boolean(
    product?.customSizingEnabled
  );

  const fulfillmentTime =
    product?.fulfillmentTime ||
    product?.preOrderFulfillmentTime ||
    "";

  const isFootwear =
    product?.brand === "ALOMZIEE_FOOTIES" ||
    ["shoes", "sandals", "slides", "boots"].includes(
      String(product?.category || "").toLowerCase()
    );

  const hasSizes = variants.some(
    (v) => Boolean(v.size || v.name || v.value || v.label)
  );

  const needsSizeSelection =
    hasSizes && !isPreOrder;

  const selectedColorObject =
    selectedColor && productColors.length > 0
      ? productColors.find(
          (color) =>
            String(color.id) ===
            String(selectedColor)
        )
      : null;

  const currentExactVariant = variants.find((variant) => {
    const variantSize =
      variant.size ||
      variant.name ||
      variant.value ||
      variant.label ||
      null;

    const sizeMatches = selectedSize
      ? Boolean(variantSize) && String(variantSize) === String(selectedSize)
      : (!hasSizes ? true : false);

    const colorMatches = selectedColor
      ? Boolean(variant.colorId) && String(variant.colorId) === String(selectedColor)
      : (productColors.length > 0 ? false : true);

    return sizeMatches && colorMatches;
  }) || null;

  const currentAvailableStock = currentExactVariant
    ? (currentExactVariant.stock ?? currentExactVariant.inventory ?? 0)
    : inventory;

  const isOutOfStock = inventory <= 0 && variants.every((v) => (v.stock ?? v.inventory ?? 0) <= 0);

  const stockStatus = isOutOfStock
    ? "Sold Out"
    : stockPercentage <= 25
    ? "Few Left"
    : stockPercentage <= 50
    ? "Almost Sold Out"
    : "Available";

  const stockStatusClass =
    stockStatus === "Sold Out"
      ? "text-red-400"
      : stockStatus === "Few Left"
      ? "text-orange-400"
      : stockStatus === "Almost Sold Out"
      ? "text-amber-400"
      : "text-emerald-400";

  const addOrUpdateSelectedVariant = (colorId, sizeLabel) => {
    if (!product) return;

    const chosenColorObj = colorId && productColors.length > 0
      ? productColors.find((c) => String(c.id) === String(colorId))
      : null;

    const chosenColorName = chosenColorObj?.name || chosenColorObj?.label || chosenColorObj?.value || null;

    const exactVar = variants.find((variant) => {
      const vSize = variant.size || variant.name || variant.value || variant.label || null;

      const sizeMatches = sizeLabel
        ? Boolean(vSize) && String(vSize) === String(sizeLabel)
        : (!hasSizes ? true : !vSize);

      const colorMatches = colorId
        ? Boolean(variant.colorId) && String(variant.colorId) === String(colorId)
        : (!chosenColorObj ? true : !variant.colorId);

      return sizeMatches && colorMatches;
    }) || null;

    const maxStock = exactVar
      ? (exactVar.stock ?? exactVar.inventory ?? 0)
      : inventory;

    if (maxStock <= 0) {
      alert("This item is currently out of stock.");
      return;
    }

    const varKey = exactVar?.id ? String(exactVar.id) : "";
    const key = [
      product.id,
      varKey,
      chosenColorObj?.id || chosenColorName || "",
      sizeLabel || "",
    ].join("|");

    setSelectedVariants((prev) => {
      const existingIndex = prev.findIndex((item) => item.key === key);

      if (existingIndex >= 0) {
        const existingItem = prev[existingIndex];
        const nextQty = existingItem.qty + 1;

        if (maxStock > 0 && nextQty > maxStock) {
          alert(`Cannot select more than available stock (${maxStock}).`);
          return prev;
        }

        const updated = [...prev];
        updated[existingIndex] = {
          ...existingItem,
          qty: nextQty,
        };
        return updated;
      } else {
        return [
          ...prev,
          {
            key,
            exactVariant: exactVar,
            variantId: exactVar?.id || null,
            colorId: chosenColorObj?.id || exactVar?.colorId || null,
            colorName: chosenColorName,
            colorHex: chosenColorObj ? getColorValue(chosenColorObj) : null,
            size: sizeLabel || null,
            qty: 1,
            maxStock,
          },
        ];
      }
    });
  };

  const updateVariantQty = (key, delta) => {
    setSelectedVariants((prev) =>
      prev
        .map((item) => {
          if (item.key !== key) return item;
          const newQty = item.qty + delta;
          if (newQty <= 0) return null;
          if (item.maxStock > 0 && newQty > item.maxStock) {
            alert(`Cannot select more than available stock (${item.maxStock}).`);
            return item;
          }
          return { ...item, qty: newQty };
        })
        .filter(Boolean)
    );
  };

  const removeSelectedVariant = (key) => {
    setSelectedVariants((prev) => prev.filter((item) => item.key !== key));
  };

  const getColorValue = (color) => {
    if (!color) return "#ffffff";

    return (
      color.hex ||
      color.value ||
      color.color ||
      color.code ||
      "#ffffff"
    );
  };

  const toggleWishlist = async () => {
    if (!product || wishlistLoading) {
      return;
    }

    setWishlistLoading(true);

    try {
      const response = await fetch(
        "/api/wishlist",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            productId: product.id,
          }),
        }
      );

      const data = await response.json();

      if (response.status === 401) {
        router.push("/login");
        return;
      }

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Failed to update wishlist"
        );
      }

      setWishlist(Boolean(data.wishlisted));
    } catch (error) {
      console.error(
        "Wishlist update failed:",
        error
      );
    } finally {
      setWishlistLoading(false);
    }
  };

  const addToCart = () => {
    if (!product || isOutOfStock) {
      return;
    }

    if (
      isPreOrder &&
      customSizingEnabled &&
      !customSizing.trim()
    ) {
      alert(
        "Please enter your sizing or measurements before adding this pre-order to your cart."
      );
      return;
    }

    let itemsToAdd = [...selectedVariants];

    if (itemsToAdd.length === 0) {
      if (needsSizeSelection && !selectedSize) {
        alert(
          isFootwear
            ? "Please select your footwear size."
            : "Please select your size."
        );
        return;
      }

      if (productColors.length > 0 && !selectedColor) {
        alert("Please select a color.");
        return;
      }

      const chosenColorObj = selectedColor && productColors.length > 0
        ? productColors.find((c) => String(c.id) === String(selectedColor))
        : null;

      const chosenColorName = chosenColorObj?.name || chosenColorObj?.label || chosenColorObj?.value || null;

      const exactVar = variants.find((variant) => {
        const vSize = variant.size || variant.name || variant.value || variant.label || null;

        const sizeMatches = selectedSize
          ? Boolean(vSize) && String(vSize) === String(selectedSize)
          : (!hasSizes ? true : !vSize);

        const colorMatches = selectedColor
          ? Boolean(variant.colorId) && String(variant.colorId) === String(selectedColor)
          : (!chosenColorObj ? true : !variant.colorId);

        return sizeMatches && colorMatches;
      }) || null;

      const varKey = exactVar?.id ? String(exactVar.id) : "";
      const key = [
        product.id,
        varKey,
        chosenColorObj?.id || chosenColorName || "",
        selectedSize || "",
      ].join("|");

      itemsToAdd = [{
        key,
        exactVariant: exactVar,
        variantId: exactVar?.id || null,
        colorId: chosenColorObj?.id || exactVar?.colorId || null,
        colorName: chosenColorName,
        colorHex: chosenColorObj ? getColorValue(chosenColorObj) : null,
        size: selectedSize || null,
        qty: qty || 1,
        maxStock: exactVar ? (exactVar.stock ?? exactVar.inventory ?? 0) : inventory,
      }];
    }

    const cart = JSON.parse(
      localStorage.getItem("cart") ||
        '{"items":[],"total":0,"event":"Verane"}'
    );

    if (!Array.isArray(cart.items)) {
      cart.items = [];
    }

    for (const item of itemsToAdd) {
      const variantKey = item.variantId ? String(item.variantId) : "";

      const cartItemKey = [
        product.id,
        variantKey,
        item.colorId || item.colorName || "",
        item.size || "",
        customSizing.trim() || "",
      ].join("|");

      const existing = cart.items.find(
        (cItem) => cItem.cartItemKey === cartItemKey
      );

      if (existing) {
        existing.qty = Number(existing.qty || 0) + Number(item.qty || 1);
      } else {
        cart.items.push({
          ...product,
          variantId: item.variantId || null,
          variant: item.exactVariant || null,
          variantInventory: item.maxStock ?? null,
          qty: item.qty,
          cartItemKey,
          selectedColor: item.colorName || null,
          selectedColorId: item.colorId || null,
          selectedSize: item.size || null,
          customSizing: customSizing.trim() || null,
          isPreOrder,
          fulfillmentTime: fulfillmentTime || null,
        });
      }
    }

    cart.total = cart.items.reduce(
      (sum, item) =>
        sum + Number(item.price || 0) * Number(item.qty || 0),
      0
    );

    localStorage.setItem("cart", JSON.stringify(cart));
    router.push("/cart");
  };

  const getVariantLabel = (variant) => {
    return (
      variant.size ||
      variant.name ||
      variant.value ||
      variant.label ||
      "Option"
    );
  };

  const isVariantAvailable = (variant) => {
    if (
      variant.inventory === undefined ||
      variant.inventory === null
    ) {
      return true;
    }

    return (
      Number(variant.inventory) > 0
    );
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-black text-white">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 py-16 md:py-24">
          <div className="h-3 w-20 bg-neutral-900 rounded-full animate-pulse mb-8" />

          <div className="grid md:grid-cols-2 gap-10 lg:gap-16">
            <div className="aspect-[4/5] bg-neutral-900 rounded-[2rem] animate-pulse" />

            <div className="space-y-5 pt-4 md:pt-10">
              <div className="h-3 w-32 bg-neutral-900 rounded animate-pulse" />

              <div className="h-14 md:h-20 w-4/5 bg-neutral-900 rounded-2xl animate-pulse" />

              <div className="h-8 w-40 bg-neutral-900 rounded animate-pulse" />

              <div className="h-24 w-full bg-neutral-900 rounded-2xl animate-pulse mt-8" />

              <div className="h-14 w-full bg-neutral-900 rounded-full animate-pulse mt-8" />
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (!product) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center px-5">
        <div className="text-center">
          <p className="text-neutral-500 text-sm uppercase tracking-[0.2em]">
            Product not found
          </p>

          <Link
            href="/catalog"
            className="text-amber-400 text-sm mt-5 inline-block hover:text-amber-300 transition"
          >
            ← Back to catalog
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white">

      {/* BACK */}
      <div className="max-w-7xl mx-auto px-5 sm:px-8 pt-8 md:pt-12">
        <Link
          href="/catalog"
          className="inline-flex items-center gap-2 text-neutral-500 text-xs uppercase tracking-[0.15em] hover:text-white transition"
        >
          <span>←</span>
          Back to collection
        </Link>
      </div>

      {/* PRODUCT */}
      <section className="max-w-7xl mx-auto px-5 sm:px-8 py-8 md:py-12 lg:py-16">
        <div className="grid md:grid-cols-2 gap-10 lg:gap-16">

          {/* IMAGES */}
          <div>
            <div className="relative aspect-[4/5] bg-neutral-950 rounded-[2rem] overflow-hidden border border-white/5">

              {images.length > 0 ? (
                <img
                  src={images[selectedImage]}
                  alt={
                    product.name ||
                    "Product"
                  }
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-neutral-900 to-black">
                  <span className="text-neutral-700 text-xs uppercase tracking-[0.3em]">
                    No Image
                  </span>
                </div>
              )}

              {images.length > 1 && (
                <div className="absolute bottom-4 right-4 bg-black/60 backdrop-blur-md border border-white/10 rounded-full px-3 py-1.5 text-[9px] text-neutral-300">
                  {selectedImage + 1} /{" "}
                  {images.length}
                </div>
              )}

              {isOutOfStock && (
                <span className="absolute top-5 left-5 bg-black/80 backdrop-blur-md border border-white/10 text-neutral-300 px-4 py-2 rounded-full text-[9px] font-bold uppercase tracking-[0.15em]">
                  Sold Out
                </span>
              )}

              {isPreOrder && (
                <span className="absolute top-5 right-5 bg-amber-400 text-black px-4 py-2 rounded-full text-[9px] font-black uppercase tracking-[0.15em]">
                  Pre-Order
                </span>
              )}
            </div>

            {/* THUMBNAILS */}
            {images.length > 1 && (
              <div className="flex gap-3 mt-4 overflow-x-auto pb-1">
                {images.map(
                  (img, index) => (
                    <button
                      key={index}
                      onClick={() =>
                        setSelectedImage(
                          index
                        )
                      }
                      className={`shrink-0 w-20 h-24 md:w-24 md:h-28 rounded-xl overflow-hidden border-2 transition-all ${
                        index ===
                        selectedImage
                          ? "border-amber-500"
                          : "border-white/5 hover:border-white/20"
                      }`}
                      aria-label={`View image ${
                        index + 1
                      }`}
                    >
                      <img
                        src={img}
                        alt={`${product.name} ${
                          index + 1
                        }`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  )
                )}
              </div>
            )}
          </div>

          {/* DETAILS */}
          <div className="flex flex-col">

            {/* BRAND */}
            <p className="text-amber-400 text-[10px] md:text-xs font-bold tracking-[0.35em] uppercase mb-4">
              {getBrandName(
                product.brand
              )}
            </p>

            {/* NAME + WISHLIST */}
            <div className="flex items-start justify-between gap-5">

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-[-0.04em] leading-[0.95]">
                {product.name}
              </h1>

              <button
                type="button"
                onClick={
                  toggleWishlist
                }
                disabled={
                  wishlistLoading
                }
                aria-label={
                  wishlist
                    ? "Remove from wishlist"
                    : "Add to wishlist"
                }
                aria-pressed={wishlist}
                className={`shrink-0 w-11 h-11 rounded-full border flex items-center justify-center transition-all duration-300 ${
                  wishlist
                    ? "bg-white text-black border-white"
                    : "border-white/10 text-neutral-400 hover:text-white hover:border-white/30"
                } ${
                  wishlistLoading
                    ? "opacity-50 cursor-wait"
                    : ""
                }`}
              >
                <svg
                  className="w-5 h-5"
                  fill={
                    wishlist
                      ? "currentColor"
                      : "none"
                  }
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={
                      wishlist
                        ? 1
                        : 1.7
                    }
                    d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78Z"
                  />
                </svg>
              </button>
            </div>

            {/* CATEGORY */}
            {product.category && (
              <p className="text-[10px] text-neutral-600 uppercase tracking-[0.2em] mt-4">
                {product.category}
              </p>
            )}

            {/* PRICE */}
            <div className="mt-7">
              <p className="text-3xl md:text-4xl font-bold">
                ₦
                {Number(
                  product.price || 0
                ).toLocaleString()}
              </p>

              <p
                className={`text-xs mt-2 font-medium ${stockStatusClass}`}
              >
                {stockStatus}
              </p>
            </div>

            {/* DESCRIPTION */}
            {product.description && (
              <div className="mt-8 pt-8 border-t border-white/5">
                <p className="text-neutral-400 text-sm md:text-base leading-relaxed">
                  {
                    product.description
                  }
                </p>
              </div>
            )}

            {/* COLORS */}
            {productColors.length >
              0 && (
              <div className="mt-8">
                <p className="text-[10px] text-neutral-500 uppercase tracking-[0.2em] font-bold mb-4">
                  Available Colors
                </p>

                <div className="flex flex-wrap gap-3">
                  {productColors.map(
                    (color) => {
                      const colorId =
                        color.id ??
                        color.name ??
                        color.value;

                      const colorName =
                        color.name ||
                        color.label ||
                        color.value ||
                        "Color";

                      const colorValue =
                        getColorValue(
                          color
                        );

                      const isSelectedInCollection = selectedVariants.some(
                        (v) => String(v.colorId) === String(colorId)
                      );

                      const active =
                        String(selectedColor) === String(colorId) ||
                        (!hasSizes && isSelectedInCollection);

                      return (
                        <button
                          type="button"
                          key={String(
                            colorId
                          )}
                          onClick={() => {
                            setSelectedColor(colorId);
                            if (!hasSizes) {
                              addOrUpdateSelectedVariant(colorId, null);
                            } else if (selectedSize) {
                              addOrUpdateSelectedVariant(colorId, selectedSize);
                            }
                          }}
                          className={`flex items-center gap-3 rounded-full border px-4 py-2.5 transition-all ${
                            active
                              ? "border-white bg-white/10"
                              : "border-white/10 hover:border-white/30"
                          }`}
                        >
                          <span
                            className="w-5 h-5 rounded-full border border-white/20 shrink-0"
                            style={{
                              backgroundColor:
                                colorValue,
                            }}
                          />

                          <span className="text-xs text-neutral-200">
                            {
                              colorName
                            }
                          </span>
                        </button>
                      );
                    }
                  )}
                </div>
              </div>
            )}

            {/* SIZE SELECTOR */}
            {hasSizes && (
              <div className="mt-8">

                <div className="flex items-center justify-between gap-4 mb-4">
                  <p className="text-[10px] text-neutral-500 uppercase tracking-[0.2em] font-bold">
                    Select Size
                  </p>

                  {isFootwear && (
                    <button
                      type="button"
                      onClick={() =>
                        setSizeGuideOpen(
                          true
                        )
                      }
                      className="text-[10px] text-amber-400 uppercase tracking-[0.15em] font-bold hover:text-amber-300 transition"
                    >
                      Sizing Guide →
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  {Array.from(
                    new Set(
                      variants.map(
                        (v) =>
                          v.size ||
                          v.name ||
                          v.value ||
                          v.label
                      ).filter(Boolean)
                    )
                  ).map((sizeLabel) => {
                    const matchingVariant = variants.find((v) => {
                      const vSize =
                        v.size ||
                        v.name ||
                        v.value ||
                        v.label ||
                        null;

                      const sizeMatches =
                        Boolean(vSize) && String(vSize) === String(sizeLabel);

                      const colorMatches = selectedColor
                        ? Boolean(v.colorId) && String(v.colorId) === String(selectedColor)
                        : true;

                      return sizeMatches && colorMatches;
                    });

                    const available =
                      matchingVariant &&
                      (matchingVariant.stock === undefined ||
                        matchingVariant.stock === null ||
                        Number(matchingVariant.stock) > 0);

                    const active =
                      String(selectedSize) === String(sizeLabel);

                    return (
                      <button
                        key={sizeLabel}
                        type="button"
                        disabled={!available}
                        onClick={() => {
                          setSelectedSize(sizeLabel);
                          addOrUpdateSelectedVariant(selectedColor, sizeLabel);
                        }}
                        className={`min-w-[52px] px-4 py-3 rounded-xl border text-xs font-bold transition-all ${
                          !available
                            ? "border-white/5 text-neutral-700 line-through cursor-not-allowed"
                            : active
                            ? "border-amber-400 bg-amber-400 text-black"
                            : "border-white/10 text-neutral-300 hover:border-white/30"
                        }`}
                      >
                        {sizeLabel}
                      </button>
                    );
                  })}
                </div>

                {isFootwear && (
                  <p className="text-[10px] text-neutral-600 mt-3">
                    Select your usual
                    footwear size. See
                    the sizing guide if
                    you are unsure.
                  </p>
                )}
              </div>
            )}

            {/* PRE-ORDER */}
            {isPreOrder && (
              <div className="mt-8 rounded-2xl border border-amber-500/20 bg-amber-500/[0.04] p-5">

                <div className="flex items-center justify-between gap-4">
                  <p className="text-amber-400 text-[10px] font-black uppercase tracking-[0.25em]">
                    Pre-Order
                  </p>

                  <span className="text-[9px] text-amber-300/70 uppercase tracking-wider">
                    Made to order
                  </span>
                </div>

                <p className="text-neutral-300 text-sm mt-3 leading-relaxed">
                  This piece is
                  available for
                  pre-order and will
                  be prepared specially
                  for you.
                </p>

                {fulfillmentTime && (
                  <div className="mt-4 pt-4 border-t border-amber-400/10">
                    <p className="text-[9px] text-neutral-500 uppercase tracking-[0.18em]">
                      Expected Fulfillment
                    </p>

                    <p className="text-sm text-neutral-200 font-semibold mt-1">
                      {fulfillmentTime}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* CUSTOM SIZING */}
            {isPreOrder &&
              customSizingEnabled && (
                <div className="mt-8">

                  <div className="flex items-center justify-between gap-4 mb-3">
                    <div>
                      <p className="text-[10px] text-amber-400 uppercase tracking-[0.2em] font-bold">
                        Custom Sizing
                      </p>

                      <p className="text-xs text-neutral-500 mt-1">
                        Enter your measurements
                        or sizing details.
                      </p>
                    </div>

                    <span className="text-[9px] text-neutral-600 uppercase tracking-wider">
                      Required
                    </span>
                  </div>

                  <textarea
                    value={customSizing}
                    onChange={(e) =>
                      setCustomSizing(
                        e.target.value
                      )
                    }
                    rows={5}
                    placeholder={
                      isFootwear
                        ? "Enter your shoe size and any sizing details..."
                        : "Example: Height 6ft 1in, Chest 42in, Waist 36in, Hip 40in, Sleeve 25in..."
                    }
                    className="w-full resize-none rounded-2xl border border-white/10 bg-neutral-950 px-4 py-4 text-sm text-white placeholder:text-neutral-700 outline-none transition focus:border-amber-400/50"
                  />

                  <p className="text-[10px] text-neutral-600 mt-2">
                    Your sizing details will
                    be attached to your order
                    for fulfillment.
                  </p>
                </div>
              )}

            {/* QUANTITY */}
            {!isOutOfStock && (
              <div className="mt-8">
                <p className="text-[10px] text-neutral-500 uppercase tracking-[0.2em] font-bold mb-3">
                  Quantity
                </p>

                <div className="inline-flex items-center gap-5 border border-white/10 rounded-full px-2 py-2">

                  <button
                    type="button"
                    onClick={() =>
                      setQty(
                        Math.max(
                          1,
                          qty - 1
                        )
                      )
                    }
                    className="w-9 h-9 rounded-full bg-neutral-900 border border-white/5 text-lg hover:bg-neutral-800 transition"
                    aria-label="Decrease quantity"
                  >
                    −
                  </button>

                  <span className="text-sm font-bold w-5 text-center">
                    {qty}
                  </span>

                  <button
                    type="button"
                    onClick={() =>
                      setQty(
                        Math.min(
                          inventory ||
                            qty + 1,
                          qty + 1
                        )
                      )
                    }
                    className="w-9 h-9 rounded-full bg-neutral-900 border border-white/5 text-lg hover:bg-neutral-800 transition"
                    aria-label="Increase quantity"
                  >
                    +
                  </button>

                </div>
              </div>
            )}

            {/* SELECTED VARIANTS COLLECTION LIST */}
            {selectedVariants.length > 0 && (
              <div className="mt-8 rounded-2xl border border-white/10 bg-neutral-950 p-5">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-[10px] text-amber-400 font-bold uppercase tracking-[0.2em]">
                    Selected Variants ({selectedVariants.reduce((sum, item) => sum + item.qty, 0)})
                  </p>
                  <button
                    type="button"
                    onClick={() => setSelectedVariants([])}
                    className="text-[10px] text-neutral-500 hover:text-white uppercase tracking-wider"
                  >
                    Clear All
                  </button>
                </div>

                <div className="space-y-3">
                  {selectedVariants.map((item) => (
                    <div
                      key={item.key}
                      className="flex items-center justify-between gap-4 rounded-xl border border-white/5 bg-white/[0.03] p-3 text-xs"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {item.colorHex && (
                          <span
                            className="w-4 h-4 rounded-full border border-white/20 shrink-0"
                            style={{ backgroundColor: item.colorHex }}
                          />
                        )}
                        <div className="truncate">
                          <span className="font-bold text-white">
                            {item.colorName || "Standard"}
                          </span>
                          {item.size && (
                            <span className="text-neutral-400 font-semibold ml-2">
                              / {item.size}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <div className="inline-flex items-center gap-2 border border-white/10 rounded-full px-2 py-1 bg-black">
                          <button
                            type="button"
                            onClick={() => updateVariantQty(item.key, -1)}
                            className="w-5 h-5 rounded-full hover:bg-neutral-800 text-neutral-300 font-bold flex items-center justify-center"
                            aria-label="Decrease quantity"
                          >
                            −
                          </button>
                          <span className="font-bold text-xs w-4 text-center text-white">
                            {item.qty}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateVariantQty(item.key, 1)}
                            className="w-5 h-5 rounded-full hover:bg-neutral-800 text-neutral-300 font-bold flex items-center justify-center"
                            aria-label="Increase quantity"
                          >
                            +
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => removeSelectedVariant(item.key)}
                          className="text-neutral-500 hover:text-red-400 text-[10px] uppercase font-bold tracking-wider"
                          aria-label="Remove item"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ADD TO CART */}
            <button
              type="button"
              onClick={addToCart}
              disabled={isOutOfStock}
              className={`mt-8 w-full px-8 py-4 rounded-full font-bold text-sm uppercase tracking-[0.12em] transition-all ${
                isOutOfStock
                  ? "bg-neutral-800 text-neutral-500 cursor-not-allowed"
                  : "bg-amber-500 text-black hover:bg-amber-400 hover:scale-[1.01]"
              }`}
            >
              {isOutOfStock
                ? "Sold Out"
                : `Add to Cart — ₦${(
                    Number(product.price || 0) *
                    (selectedVariants.length > 0
                      ? selectedVariants.reduce((sum, item) => sum + item.qty, 0)
                      : qty)
                  ).toLocaleString()}`}
            </button>

            {/* BENEFITS */}
            <div className="mt-8 grid grid-cols-3 gap-2 md:gap-3">

              <div className="border border-white/5 rounded-2xl p-4 text-center">
                <div className="text-lg mb-2">
                  🚚
                </div>

                <p className="text-[9px] md:text-[10px] text-neutral-500 uppercase tracking-wider">
                  Worldwide shipping
                </p>
              </div>

              <div className="border border-white/5 rounded-2xl p-4 text-center">
                <div className="text-lg mb-2">
                  🔒
                </div>

                <p className="text-[9px] md:text-[10px] text-neutral-500 uppercase tracking-wider">
                  Secure checkout
                </p>
              </div>

              <div className="border border-white/5 rounded-2xl p-4 text-center">
                <div className="text-lg mb-2">
                  ✋
                </div>

                <p className="text-[9px] md:text-[10px] text-neutral-500 uppercase tracking-wider">
                  Crafted with care
                </p>
              </div>

            </div>

            {/* PRODUCT INFO */}
            <div className="mt-10 border-t border-white/5">

              {product.style && (
                <div className="flex justify-between gap-5 py-4 border-b border-white/5 text-sm">
                  <span className="text-neutral-500">
                    Style
                  </span>

                  <span className="text-neutral-300 text-right">
                    {product.style}
                  </span>
                </div>
              )}

              {product.occasion && (
                <div className="flex justify-between gap-5 py-4 border-b border-white/5 text-sm">
                  <span className="text-neutral-500">
                    Occasion
                  </span>

                  <span className="text-neutral-300 text-right">
                    {product.occasion}
                  </span>
                </div>
              )}

              {product.outfitLayer && (
                <div className="flex justify-between gap-5 py-4 border-b border-white/5 text-sm">
                  <span className="text-neutral-500">
                    Outfit layer
                  </span>

                  <span className="text-neutral-300 text-right">
                    {product.outfitLayer}
                  </span>
                </div>
              )}

            </div>
          </div>
        </div>
      </section>

      {/* SIZING GUIDE MODAL */}
      {sizeGuideOpen && (
        <div
          className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center px-5"
          onClick={() =>
            setSizeGuideOpen(false)
          }
        >
          <div
            className="w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-3xl border border-white/10 bg-neutral-950 p-6 md:p-8"
            onClick={(e) =>
              e.stopPropagation()
            }
          >

            <div className="flex items-start justify-between gap-5">
              <div>
                <p className="text-amber-400 text-[10px] font-bold uppercase tracking-[0.25em]">
                  Size Guide
                </p>

                <h2 className="text-2xl md:text-3xl font-black mt-2">
                  Find your size.
                </h2>
              </div>

              <button
                type="button"
                onClick={() =>
                  setSizeGuideOpen(false)
                }
                className="w-10 h-10 rounded-full border border-white/10 text-neutral-400 hover:text-white hover:border-white/30 transition"
                aria-label="Close sizing guide"
              >
                ×
              </button>
            </div>

            <div className="mt-8 rounded-2xl border border-white/5 overflow-hidden">
              <div className="grid grid-cols-3 bg-white/[0.04] px-4 py-3 text-[10px] uppercase tracking-[0.15em] text-neutral-500 font-bold">
                <span>EU</span>
                <span>UK</span>
                <span>US</span>
              </div>

              {[
                ["38", "5", "6"],
                ["39", "6", "7"],
                ["40", "7", "8"],
                ["41", "8", "9"],
                ["42", "9", "10"],
                ["43", "10", "11"],
                ["44", "11", "12"],
                ["45", "12", "13"],
              ].map(
                ([eu, uk, us]) => (
                  <div
                    key={eu}
                    className="grid grid-cols-3 px-4 py-3 border-t border-white/5 text-sm"
                  >
                    <span className="text-white font-semibold">
                      {eu}
                    </span>

                    <span className="text-neutral-400">
                      {uk}
                    </span>

                    <span className="text-neutral-400">
                      {us}
                    </span>
                  </div>
                )
              )}
            </div>

            <p className="text-[11px] leading-relaxed text-neutral-600 mt-5">
              If you are between sizes or
              unsure of your size, use your
              usual footwear size and consider
              the fit of the style before
              ordering.
            </p>

          </div>
        </div>
      )}

      {/* OUTFIT BUILDER CTA */}
      <section className="border-t border-white/5 bg-neutral-950">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 py-20 md:py-28">

          <div className="relative overflow-hidden rounded-[2rem] border border-white/10">

            <div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 via-transparent to-transparent" />

            <div className="relative px-7 py-14 md:px-14 md:py-16">

              <p className="text-amber-400 text-[10px] font-bold tracking-[0.35em] uppercase mb-4">
                VÉRANE STUDIO
              </p>

              <h2 className="text-3xl md:text-5xl font-black leading-[0.95]">
                BUILD THE
                <br />
                <span className="text-neutral-500">
                  COMPLETE LOOK.
                </span>
              </h2>

              <p className="text-neutral-400 text-sm max-w-xl mt-5 leading-relaxed">
                Pair this piece with
                clothing, footwear and
                accessories from both
                VÉRANE collections.
              </p>

              <Link
                href="/outfit-builder"
                className="inline-block mt-7 bg-white text-black px-7 py-4 rounded-full text-xs font-black uppercase tracking-wider hover:bg-neutral-200 transition"
              >
                Open Outfit Builder →
              </Link>

            </div>
          </div>
        </div>
      </section>

    </main>
  );
}