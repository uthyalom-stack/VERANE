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
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        <p className="text-neutral-500 text-xs uppercase tracking-[0.3em]">
          Loading orders...
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="max-w-6xl mx-auto px-5 sm:px-8 py-12 md:py-20">
        <Link
          href="/account"
          className="text-[10px] uppercase tracking-[0.25em] text-neutral-500 hover:text-white transition"
        >
          ← Back to account
        </Link>

        <div className="mt-10">
          <p className="text-amber-400 text-[10px] font-bold tracking-[0.35em] uppercase">
            VÉRANE MEMBER
          </p>

          <h1 className="text-5xl md:text-7xl font-black tracking-[-0.05em] mt-3">
            MY ORDERS
          </h1>

          <p className="text-neutral-500 mt-4">
            Your VÉRANE purchase history.
          </p>
        </div>

        {orders.length === 0 ? (
          <div className="mt-12 border border-white/10 bg-neutral-950 rounded-[2rem] p-10 md:p-14 text-center">
            <p className="text-lg font-medium">
              No orders yet.
            </p>

            <p className="text-sm text-neutral-500 mt-3">
              Your purchases will appear here once you place an order.
            </p>

            <Link
              href="/catalog"
              className="inline-flex mt-8 px-6 py-3 rounded-full bg-amber-400 text-black text-xs font-bold uppercase tracking-[0.15em] hover:bg-amber-300 transition"
            >
              Shop the house
            </Link>
          </div>
        ) : (
          <div className="mt-12 space-y-4">
            {orders.map((order) => (
              <article
                key={order.id}
                className="border border-white/10 bg-neutral-950 rounded-[2rem] p-6 md:p-8"
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5">
                  <div>
                    <p className="text-[9px] uppercase tracking-[0.25em] text-neutral-600">
                      Order
                    </p>

                    <p className="text-sm font-bold mt-2">
                      #{order.id.slice(-8).toUpperCase()}
                    </p>

                    <p className="text-xs text-neutral-500 mt-2">
                      {new Date(order.createdAt).toLocaleDateString(
                        "en-NG",
                        {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        }
                      )}
                    </p>
                  </div>

                  <div className="md:text-right flex flex-col md:items-end gap-2">
                    <div>
                      <p className="text-[9px] uppercase tracking-[0.25em] text-neutral-600">
                        Status
                      </p>

                      <p className="text-xs font-bold uppercase mt-1">
                        {order.status}
                      </p>

                      <p className="text-lg font-bold mt-1">
                        ₦{Number(order.total).toLocaleString("en-NG")}
                      </p>
                    </div>

                    <a
                      href={`/api/orders/${order.id}/receipt`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block mt-2 rounded-full border border-amber-400/30 bg-amber-400/10 px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-amber-400 hover:bg-amber-400/20 transition"
                    >
                      Download Receipt (PDF) ↓
                    </a>
                  </div>
                </div>

                {order.items?.length > 0 && (
                  <div className="mt-7 border-t border-white/5 pt-6 space-y-3">
                    {order.items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between gap-4 text-sm"
                      >
                        <span className="text-neutral-300">
                          {item.product?.name || "Product"}
                          <span className="text-neutral-600 ml-2">
                            × {item.quantity}
                          </span>
                        </span>

                        <span className="text-neutral-500">
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