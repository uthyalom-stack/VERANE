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

        const items = Array.isArray(parsed.items)
          ? parsed.items
          : [];

        const total = items.reduce(
          (sum, item) =>
            sum +
            Number(item.price || 0) *
              Number(item.qty || 0),
          0
        );

        setCart({
          items,
          total,
        });
      }
    } catch (error) {
      console.error("Failed to load cart:", error);
    } finally {
      setLoaded(true);
    }
  }, []);

  const updateCart = (items) => {
    const total = items.reduce(
      (sum, item) =>
        sum +
        Number(item.price || 0) *
          Number(item.qty || 0),
      0
    );

    const updatedCart = {
      items,
      total,
      event: "Verane",
    };

    localStorage.setItem(
      "cart",
      JSON.stringify(updatedCart)
    );

    setCart(updatedCart);
  };

  const increaseQuantity = (item) => {
    const inventory = Number(item.inventory || 0);

    const items = cart.items.map((current) => {
      if (current.id !== item.id) {
        return current;
      }

      const nextQty = current.qty + 1;

      if (inventory > 0 && nextQty > inventory) {
        return current;
      }

      return {
        ...current,
        qty: nextQty,
      };
    });

    updateCart(items);
  };

  const decreaseQuantity = (item) => {
    const items = cart.items
      .map((current) => {
        if (current.id !== item.id) {
          return current;
        }

        return {
          ...current,
          qty: current.qty - 1,
        };
      })
      .filter((current) => current.qty > 0);

    updateCart(items);
  };

  const removeItem = (item) => {
    const items = cart.items.filter(
      (current) => current.id !== item.id
    );

    updateCart(items);
  };

  const clearCart = () => {
    const emptyCart = {
      items: [],
      total: 0,
      event: "Verane",
    };

    localStorage.setItem(
      "cart",
      JSON.stringify(emptyCart)
    );

    setCart(emptyCart);
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

  const getImages = (images) => {
    if (!images) {
      return [];
    }

    try {
      const parsed =
        typeof images === "string"
          ? JSON.parse(images)
          : images;

      return Array.isArray(parsed)
        ? parsed
        : [];
    } catch {
      return [];
    }
  };

  if (!loaded) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-neutral-500 text-xs uppercase tracking-[0.3em]">
          Loading cart...
        </div>
      </main>
    );
  }

  if (cart.items.length === 0) {
    return (
      <main className="min-h-screen bg-black text-white">
        <div className="max-w-5xl mx-auto px-5 sm:px-8 py-20 md:py-32">
          <p className="text-amber-400 text-[10px] font-bold tracking-[0.35em] uppercase">
            VÉRANE
          </p>

          <h1 className="text-5xl md:text-7xl font-black tracking-[-0.05em] mt-4">
            YOUR CART
          </h1>

          <div className="mt-16 border border-white/10 rounded-[2rem] bg-neutral-950 p-10 md:p-16 text-center">
            <div className="w-16 h-16 mx-auto rounded-full border border-white/10 flex items-center justify-center text-neutral-500 text-2xl">
              0
            </div>

            <h2 className="text-2xl md:text-3xl font-bold mt-6">
              Your cart is empty.
            </h2>

            <p className="text-neutral-500 text-sm mt-3 max-w-md mx-auto">
              Discover pieces from UTHY LUXURY
              and ALOMZIEE FOOTIES and add
              something to your collection.
            </p>

            <Link
              href="/catalog"
              className="inline-flex mt-8 bg-white text-black px-8 py-4 rounded-full text-xs font-black uppercase tracking-[0.15em] hover:bg-neutral-200 transition"
            >
              Explore Collection
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="max-w-7xl mx-auto px-5 sm:px-8 py-12 md:py-20">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-5">
          <div>
            <p className="text-amber-400 text-[10px] font-bold tracking-[0.35em] uppercase">
              VÉRANE
            </p>

            <h1 className="text-5xl md:text-7xl font-black tracking-[-0.05em] mt-3">
              YOUR CART
            </h1>

            <p className="text-neutral-500 text-sm mt-3">
              {cart.items.length}{" "}
              {cart.items.length === 1
                ? "item"
                : "items"}{" "}
              in your bag
            </p>
          </div>

          <button
            onClick={clearCart}
            className="text-xs uppercase tracking-[0.15em] text-neutral-500 hover:text-white transition self-start md:self-auto"
          >
            Clear cart
          </button>
        </div>

        <div className="grid lg:grid-cols-[1fr_380px] gap-8 lg:gap-12 mt-12">
          {/* ITEMS */}
          <div className="space-y-4">
            {cart.items.map((item) => {
              const images = getImages(
                item.images
              );

              const image =
                images.length > 0
                  ? images[0]
                  : null;

              const quantity =
                Number(item.qty || 0);

              const price =
                Number(item.price || 0);

              const subtotal =
                price * quantity;

              return (
                <div
                  key={item.id}
                  className="border border-white/10 bg-neutral-950 rounded-[1.5rem] p-4 md:p-5"
                >
                  <div className="flex gap-5">
                    {/* IMAGE */}
                    <div className="w-28 h-36 md:w-36 md:h-44 shrink-0 rounded-xl overflow-hidden bg-neutral-900">
                      {image ? (
                        <img
                          src={image}
                          alt={
                            item.name ||
                            "Product"
                          }
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[9px] text-neutral-600 uppercase tracking-widest">
                          No Image
                        </div>
                      )}
                    </div>

                    {/* DETAILS */}
                    <div className="flex-1 min-w-0 flex flex-col">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-[9px] text-amber-400 uppercase tracking-[0.25em] font-bold">
                            {getBrandName(
                              item.brand
                            )}
                          </p>

                          <h2 className="text-xl md:text-2xl font-bold mt-2 leading-tight">
                            {item.name}
                          </h2>

                          {item.category && (
                            <p className="text-[10px] text-neutral-600 uppercase tracking-[0.15em] mt-2">
                              {item.category}
                            </p>
                          )}
                        </div>

                        <button
                          onClick={() =>
                            removeItem(item)
                          }
                          className="text-neutral-600 hover:text-white text-xs uppercase tracking-wider"
                        >
                          Remove
                        </button>
                      </div>

                      <div className="mt-auto pt-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-5">
                        {/* QUANTITY */}
                        <div>
                          <p className="text-[9px] text-neutral-600 uppercase tracking-[0.2em] mb-2">
                            Quantity
                          </p>

                          <div className="inline-flex items-center gap-4 border border-white/10 rounded-full px-2 py-1.5">
                            <button
                              onClick={() =>
                                decreaseQuantity(
                                  item
                                )
                              }
                              className="w-8 h-8 rounded-full bg-neutral-900 hover:bg-neutral-800"
                            >
                              −
                            </button>

                            <span className="text-sm font-bold w-5 text-center">
                              {quantity}
                            </span>

                            <button
                              onClick={() =>
                                increaseQuantity(
                                  item
                                )
                              }
                              className="w-8 h-8 rounded-full bg-neutral-900 hover:bg-neutral-800"
                            >
                              +
                            </button>
                          </div>
                        </div>

                        {/* PRICE */}
                        <div className="sm:text-right">
                          <p className="text-xs text-neutral-600">
                            ₦
                            {price.toLocaleString()}{" "}
                            each
                          </p>

                          <p className="text-xl font-bold mt-1">
                            ₦
                            {subtotal.toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* SUMMARY */}
          <aside className="lg:sticky lg:top-8 h-fit">
            <div className="border border-white/10 bg-neutral-950 rounded-[2rem] p-6 md:p-8">
              <p className="text-[10px] text-neutral-500 uppercase tracking-[0.25em] font-bold">
                Order Summary
              </p>

              <div className="mt-8 space-y-4">
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-500">
                    Subtotal
                  </span>

                  <span>
                    ₦
                    {cart.total.toLocaleString()}
                  </span>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-neutral-500">
                    Shipping
                  </span>

                  <span className="text-neutral-400">
                    Calculated at checkout
                  </span>
                </div>

                <div className="border-t border-white/10 pt-5 flex justify-between">
                  <span className="font-bold">
                    Total
                  </span>

                  <span className="text-2xl font-black">
                    ₦
                    {cart.total.toLocaleString()}
                  </span>
                </div>
              </div>

              <Link
                href="/checkout"
                className="mt-8 block w-full bg-amber-500 text-black text-center px-6 py-4 rounded-full text-xs font-black uppercase tracking-[0.15em] hover:bg-amber-400 transition"
              >
                Proceed to Checkout
              </Link>

              <Link
                href="/catalog"
                className="mt-4 block text-center text-xs text-neutral-500 hover:text-white transition"
              >
                Continue Shopping
              </Link>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="border border-white/5 rounded-2xl p-4 text-center">
                <p className="text-[9px] text-neutral-500 uppercase tracking-wider">
                  Secure
                </p>
                <p className="text-[10px] text-neutral-300 mt-1">
                  Checkout
                </p>
              </div>

              <div className="border border-white/5 rounded-2xl p-4 text-center">
                <p className="text-[9px] text-neutral-500 uppercase tracking-wider">
                  Premium
                </p>
                <p className="text-[10px] text-neutral-300 mt-1">
                  Experience
                </p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}