"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function OrdersPage() {
  const router = useRouter();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadOrders() {
      try {
        const response = await fetch("/api/orders", {
          cache: "no-store",
          credentials: "include",
        });

        const data = await response.json();

        if (!response.ok || data.authenticated === false) {
          router.replace("/login");
          return;
        }

        setOrders(data.orders || []);
      } catch (error) {
        console.error("Orders loading error:", error);
      } finally {
        setLoading(false);
      }
    }

    loadOrders();
  }, [router]);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#070707] text-white flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-amber-400" />
          <p className="mt-4 text-xs font-bold uppercase tracking-luxury text-amber-400">
            Fetching Order Records...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#070707] text-[#f5f5f5] pb-24">
      <div className="max-w-6xl mx-auto px-5 sm:px-8 lg:px-12 py-12 lg:py-20">
        <Link
          href="/account"
          className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-luxury text-neutral-400 hover:text-white transition mb-6"
        >
          <span>←</span> Back to Member Portal
        </Link>

        <div className="border-b border-white/[0.08] pb-8">
          <div className="flex items-center gap-3 mb-2">
            <span className="h-px w-8 bg-amber-400" />
            <p className="text-[10px] font-bold uppercase tracking-couture text-amber-400">
              VÉRANE PORTAL
            </p>
          </div>

          <h1 className="text-4xl sm:text-6xl font-editorial font-light tracking-tight text-white">
            Order History
          </h1>

          <p className="text-neutral-400 text-xs sm:text-sm font-light mt-2">
            Your historic transactions, tracking status, and receipts.
          </p>
        </div>

        {orders.length === 0 ? (
          <div className="mt-12 rounded-3xl border border-white/10 bg-neutral-950/60 p-12 lg:p-16 text-center">
            <p className="text-xl font-editorial font-light text-white">
              No Order History Found
            </p>

            <p className="text-neutral-400 text-sm font-light mt-2 max-w-md mx-auto">
              Your acquired pieces from UTHY LUXURY and ALOMZIEE FOOTIES will be logged here once placed.
            </p>

            <Link
              href="/catalog"
              className="inline-flex mt-8 bg-amber-400 text-black px-8 py-3.5 rounded-full text-xs font-bold uppercase tracking-luxury hover:bg-amber-300 transition shadow-lg shadow-amber-400/10"
            >
              Explore House Collections
            </Link>
          </div>
        ) : (
          <div className="mt-10 space-y-6">
            {orders.map((order) => (
              <article
                key={order.id}
                className="rounded-3xl border border-white/[0.08] bg-neutral-950/80 p-6 sm:p-8 backdrop-blur-md transition hover:border-white/20"
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 border-b border-white/[0.06] pb-6">
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-white uppercase tracking-luxury">
                        Order #{order.id.slice(-8).toUpperCase()}
                      </span>
                      <span className="text-[9px] font-bold uppercase tracking-luxury px-3 py-0.5 rounded-full border border-amber-400/30 bg-amber-400/10 text-amber-400">
                        {order.status || "Processing"}
                      </span>
                    </div>

                    <p className="text-xs text-neutral-400 font-light mt-2">
                      Placed on{" "}
                      {new Date(order.createdAt).toLocaleDateString("en-NG", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center gap-4 md:text-right">
                    <div>
                      <p className="text-[10px] uppercase tracking-luxury text-neutral-500 font-bold">
                        Total Amount Paid
                      </p>
                      <p className="text-xl font-bold text-white mt-0.5">
                        ₦{Number(order.total).toLocaleString("en-NG")}
                      </p>
                    </div>

                    <a
                      href={`/api/orders/${order.id}/receipt`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center rounded-full border border-white/20 bg-white/[0.04] px-5 py-2.5 text-[10px] font-bold uppercase tracking-luxury text-white hover:bg-white hover:text-black transition"
                    >
                      Download Receipt ↓
                    </a>
                  </div>
                </div>

                {/* BRAND TRACKING STATUSES */}
                {Array.isArray(order.brandTrackingsInfo) &&
                  order.brandTrackingsInfo.length > 0 && (
                    <div className="mt-6 space-y-4">
                      <p className="text-[10px] uppercase tracking-couture text-amber-400 font-bold">
                        DELIVERY TRACKING BY HOUSE
                      </p>

                      <div className="grid grid-cols-1 gap-4">
                        {order.brandTrackingsInfo.map((bt) => {
                          const steps = ["Processing", "In Transit", "Delivered"];
                          const currentIdx =
                            steps.indexOf(bt.status) !== -1 ? steps.indexOf(bt.status) : 0;

                          return (
                            <div
                              key={bt.brand}
                              className="rounded-2xl border border-white/10 bg-black/50 p-5"
                            >
                              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
                                <span className="text-xs font-bold uppercase tracking-luxury text-white">
                                  {bt.displayName}
                                </span>
                                <span className="text-[9px] font-bold uppercase tracking-luxury px-3 py-0.5 rounded-full border border-amber-400/30 bg-amber-400/10 text-amber-400 self-start sm:self-auto">
                                  {bt.status}
                                </span>
                              </div>

                              {/* TRACKING STEPPER */}
                              <div className="flex items-center justify-between relative mt-4 pt-2 px-4">
                                <div className="absolute top-1/2 left-8 right-8 h-[2px] bg-white/10 -translate-y-1/2 z-0" />

                                {steps.map((step, idx) => {
                                  const isCompleted = idx <= currentIdx;
                                  const isCurrent = idx === currentIdx;

                                  return (
                                    <div
                                      key={step}
                                      className="relative z-10 flex flex-col items-center"
                                    >
                                      <div
                                        className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black transition ${
                                          isCurrent
                                            ? "bg-amber-400 text-black shadow-[0_0_12px_rgba(245,185,66,0.5)] scale-110"
                                            : isCompleted
                                            ? "bg-white text-black"
                                            : "bg-neutral-900 border border-white/20 text-neutral-600"
                                        }`}
                                      >
                                        {isCompleted ? "✓" : "○"}
                                      </div>
                                      <span
                                        className={`text-[9px] uppercase tracking-luxury font-semibold mt-2.5 ${
                                          isCurrent
                                            ? "text-amber-400"
                                            : isCompleted
                                            ? "text-white"
                                            : "text-neutral-600"
                                        }`}
                                      >
                                        {step}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                {order.items?.length > 0 && (
                  <div className="mt-6 border-t border-white/[0.05] pt-5 space-y-2.5">
                    <p className="text-[10px] uppercase tracking-luxury text-neutral-500 font-bold mb-3">
                      PURCHASED ITEMS
                    </p>
                    {order.items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between text-xs font-light"
                      >
                        <span className="text-neutral-200">
                          {item.collaborationProduct?.name ||
                            item.product?.name ||
                            "VÉRANE Piece"}
                          <span className="text-neutral-500 ml-2 font-mono">
                            × {item.quantity}
                          </span>
                        </span>

                        <span className="text-neutral-400">
                          ₦{Number(item.price).toLocaleString("en-NG")}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
