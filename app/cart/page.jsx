"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function CartPage() {
  const [cart, setCart] = useState({
    items: [],
    total: 0,
  });

  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("cart");

      if (saved) {
        const parsed = JSON.parse(saved);
        const items = Array.isArray(parsed.items) ? parsed.items : [];
        const total = items.reduce(
          (sum, item) => sum + Number(item.price || 0) * Number(item.qty || 0),
          0
        );

        setCart({ items, total });
      }
    } catch (error) {
      console.error("Failed to load cart:", error);
    } finally {
      setLoaded(true);
    }
  }, []);

  const updateCart = (items) => {
    const total = items.reduce(
      (sum, item) => sum + Number(item.price || 0) * Number(item.qty || 0),
      0
    );

    const updatedCart = {
      items,
      total,
      event: "Verane",
    };

    localStorage.setItem("cart", JSON.stringify(updatedCart));
    setCart(updatedCart);
    window.dispatchEvent(new CustomEvent("cart-updated"));
  };

  const getItemKey = (item) => {
    if (item?.cartItemKey) return item.cartItemKey;

    return [
      item?.id || "",
      item?.variantId || "",
      item?.selectedColor || item?.selectedColorId || "",
      item?.selectedSize || "",
      item?.customSizing || "",
    ].join("|");
  };

  const increaseQuantity = (item) => {
    const targetKey = getItemKey(item);
    const maxStock = Number(item.variantInventory ?? item.inventory ?? 0);

    const items = cart.items.map((current) => {
      if (getItemKey(current) !== targetKey) return current;

      const nextQty = Number(current.qty || 0) + 1;
      if (maxStock > 0 && nextQty > maxStock) return current;

      return {
        ...current,
        qty: nextQty,
      };
    });

    updateCart(items);
  };

  const decreaseQuantity = (item) => {
    const targetKey = getItemKey(item);

    const items = cart.items
      .map((current) => {
        if (getItemKey(current) !== targetKey) return current;
        return {
          ...current,
          qty: Number(current.qty || 0) - 1,
        };
      })
      .filter((current) => Number(current.qty || 0) > 0);

    updateCart(items);
  };

  const removeItem = (item) => {
    const targetKey = getItemKey(item);
    const items = cart.items.filter((current) => getItemKey(current) !== targetKey);
    updateCart(items);
  };

  const clearCart = () => {
    const emptyCart = {
      items: [],
      total: 0,
      event: "Verane",
    };

    localStorage.setItem("cart", JSON.stringify(emptyCart));
    setCart(emptyCart);
    window.dispatchEvent(new CustomEvent("cart-updated"));
  };

  const getBrandName = (brand) => {
    if (brand === "UTHY_LUXURY") return "UTHY LUXURY";
    if (brand === "ALOMZIEE_FOOTIES") return "ALOMZIEE FOOTIES";
    return brand || "VÉRANE";
  };

  const getImages = (images) => {
    if (!images) return [];

    try {
      const parsed = typeof images === "string" ? JSON.parse(images) : images;
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      if (typeof images === "string") {
        return images.split(",").map((s) => s.trim()).filter(Boolean);
      }
      return [];
    }
  };

  if (!loaded) {
    return (
      <main className="min-h-screen bg-[#070707] text-white flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-amber-400" />
          <p className="mt-4 text-xs font-bold uppercase tracking-luxury text-amber-400">
            Accessing Shopping Bag...
          </p>
        </div>
      </main>
    );
  }

  if (cart.items.length === 0) {
    return (
      <main className="min-h-screen bg-[#070707] text-[#f5f5f5]">
        <div className="max-w-4xl mx-auto px-5 sm:px-8 py-24 lg:py-32 text-center">
          <p className="text-[10px] font-bold uppercase tracking-couture text-amber-400 mb-3">
            VÉRANE ATELIER
          </p>

          <h1 className="text-4xl sm:text-6xl font-editorial font-light tracking-tight text-white">
            Your Shopping Bag
          </h1>

          <div className="mt-12 rounded-3xl border border-white/10 bg-neutral-950/60 p-12 lg:p-16 text-center">
            <div className="w-20 h-20 mx-auto rounded-full border border-white/10 flex items-center justify-center text-neutral-600 font-editorial text-3xl">
              0
            </div>

            <h2 className="text-2xl font-editorial font-light text-white mt-6">
              Your bag is currently empty
            </h2>

            <p className="text-neutral-400 text-sm font-light mt-3 max-w-md mx-auto leading-relaxed">
              Explore bespoke garments from UTHY LUXURY and handcrafted footwear from ALOMZIEE FOOTIES.
            </p>

            <Link
              href="/catalog"
              className="inline-flex mt-8 bg-amber-400 text-black px-8 py-3.5 rounded-full text-xs font-bold uppercase tracking-luxury hover:bg-amber-300 transition shadow-lg shadow-amber-400/10"
            >
              Explore Atelier Collections
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#070707] text-[#f5f5f5] pb-24">
      <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-12 py-12 lg:py-20">
        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-5 border-b border-white/[0.08] pb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="h-px w-8 bg-amber-400" />
              <p className="text-[10px] font-bold uppercase tracking-couture text-amber-400">
                VÉRANE BAG
              </p>
            </div>

            <h1 className="text-4xl sm:text-6xl font-editorial font-light tracking-tight text-white">
              Shopping Bag
            </h1>

            <p className="text-neutral-400 text-xs sm:text-sm font-light mt-2">
              {cart.items.reduce((sum, item) => sum + Number(item.qty || 0), 0)} Selected{" "}
              {cart.items.length === 1 ? "Piece" : "Pieces"}
            </p>
          </div>

          <button
            type="button"
            onClick={clearCart}
            className="text-xs font-bold uppercase tracking-luxury text-neutral-500 hover:text-red-400 transition"
          >
            Clear Entire Bag
          </button>
        </div>

        <div className="grid lg:grid-cols-[1fr_400px] gap-8 lg:gap-12 mt-10">
          {/* BAG ITEMS LIST */}
          <div className="space-y-4">
            {cart.items.map((item) => {
              const images = getImages(item.images);
              const image = images.length > 0 ? images[0] : null;
              const quantity = Number(item.qty || 0);
              const price = Number(item.price || 0);
              const subtotal = price * quantity;
              const lineKey = getItemKey(item);

              return (
                <div
                  key={lineKey}
                  className="rounded-2xl border border-white/[0.08] bg-neutral-950/70 p-4 sm:p-6 transition hover:border-white/20"
                >
                  <div className="flex gap-4 sm:gap-6">
                    {/* THUMBNAIL */}
                    <div className="w-24 h-32 sm:w-32 sm:h-40 shrink-0 rounded-xl overflow-hidden bg-neutral-900 border border-white/5">
                      {image ? (
                        <img
                          src={image}
                          alt={item.name || "Product"}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[9px] text-neutral-600 font-editorial">
                          VÉRANE
                        </div>
                      )}
                    </div>

                    {/* ITEM DETAILS */}
                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div>
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-[9px] font-bold uppercase tracking-couture text-amber-400/90">
                              {getBrandName(item.brand)}
                            </p>

                            <h2 className="text-base sm:text-xl font-editorial font-medium text-white mt-1 leading-snug truncate">
                              {item.name}
                            </h2>

                            {item.category && (
                              <p className="text-[10px] text-neutral-500 uppercase tracking-luxury mt-1">
                                {item.category}
                              </p>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() => removeItem(item)}
                            className="text-neutral-500 hover:text-white text-[10px] uppercase font-bold tracking-luxury transition"
                          >
                            Remove
                          </button>
                        </div>

                        {/* SPECIFICATIONS BADGES */}
                        {(item.selectedColor || item.selectedSize || item.isPreOrder) && (
                          <div className="flex flex-wrap items-center gap-2 mt-3">
                            {item.selectedColor && (
                              <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[10px] font-semibold text-neutral-300">
                                Color: {item.selectedColor}
                              </span>
                            )}
                            {item.selectedSize && (
                              <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[10px] font-semibold text-neutral-300">
                                Size: {item.selectedSize}
                              </span>
                            )}
                            {item.isPreOrder && (
                              <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-[9px] font-bold text-amber-400 uppercase tracking-luxury">
                                Pre-Order
                              </span>
                            )}
                          </div>
                        )}

                        {item.customSizing && (
                          <p className="mt-3 rounded-xl border border-white/5 bg-black/40 p-2.5 text-[10px] text-neutral-300 leading-relaxed">
                            <span className="font-bold text-amber-400 uppercase tracking-luxury">
                              Custom Sizing:
                            </span>{" "}
                            {item.customSizing}
                          </p>
                        )}
                      </div>

                      {/* QUANTITY CONTROLS & LINE TOTAL */}
                      <div className="mt-6 pt-4 border-t border-white/[0.05] flex items-center justify-between gap-4">
                        <div className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-black/60 px-2 py-1">
                          <button
                            type="button"
                            onClick={() => decreaseQuantity(item)}
                            className="w-7 h-7 rounded-full hover:bg-white/10 text-neutral-300 flex items-center justify-center font-bold text-sm"
                            aria-label="Decrease quantity"
                          >
                            −
                          </button>

                          <span className="text-xs font-bold w-4 text-center text-white">
                            {quantity}
                          </span>

                          <button
                            type="button"
                            onClick={() => increaseQuantity(item)}
                            className="w-7 h-7 rounded-full hover:bg-white/10 text-neutral-300 flex items-center justify-center font-bold text-sm"
                            aria-label="Increase quantity"
                          >
                            +
                          </button>
                        </div>

                        <div className="text-right">
                          <p className="text-xs text-neutral-500 font-light">
                            ₦{price.toLocaleString()} each
                          </p>
                          <p className="text-lg font-bold text-white">
                            ₦{subtotal.toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ORDER SUMMARY SIDEBAR */}
          <aside className="lg:sticky lg:top-8 h-fit">
            <div className="rounded-3xl border border-white/10 bg-neutral-950/80 p-6 sm:p-8 backdrop-blur-md">
              <p className="text-[10px] font-bold uppercase tracking-couture text-amber-400 mb-6">
                ORDER SUMMARY
              </p>

              <div className="space-y-4 text-sm font-light">
                <div className="flex justify-between text-neutral-300">
                  <span>Bag Subtotal</span>
                  <span className="font-semibold text-white">
                    ₦{cart.total.toLocaleString()}
                  </span>
                </div>

                <div className="flex justify-between text-neutral-400 text-xs">
                  <span>Logistics & Taxes</span>
                  <span>Calculated at Checkout</span>
                </div>

                <div className="border-t border-white/10 pt-5 flex justify-between items-baseline">
                  <span className="font-editorial text-lg text-white">Total</span>
                  <span className="text-2xl font-bold text-amber-400">
                    ₦{cart.total.toLocaleString()}
                  </span>
                </div>
              </div>

              <Link
                href="/checkout"
                className="mt-8 block w-full bg-amber-400 text-black text-center py-4 rounded-full text-xs font-bold uppercase tracking-luxury hover:bg-amber-300 transition shadow-xl shadow-amber-400/10"
              >
                Proceed to Checkout →
              </Link>

              <Link
                href="/catalog"
                className="mt-4 block text-center text-xs text-neutral-500 hover:text-white transition uppercase tracking-luxury"
              >
                Continue Browsing
              </Link>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
