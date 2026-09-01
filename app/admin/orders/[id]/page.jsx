"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";

export default function AdminOrderDetailsPage({ params }) {
  const resolvedParams = use(params);
  const id = resolvedParams.id;

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setSaving] = useState(false);
  const [status, setStatus] = useState("pending");

  useEffect(() => {
    fetchOrder();
  }, [id]);

  async function fetchOrder() {
    try {
      const res = await fetch(`/api/admin/orders/${id}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setOrder(data.order);
        setStatus(data.order.status || "pending");
      }
    } catch (err) {
      console.error("Order detail error:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleStatusUpdate(newStatus) {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/orders/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setStatus(newStatus);
        fetchOrder();
      }
    } catch (err) {
      console.error("Update status error:", err);
    } finally {
      setSaving(false);
    }
  }

  function formatMoney(amount) {
    return "₦" + Number(amount || 0).toLocaleString("en-NG");
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-black text-white p-8 flex items-center justify-center">
        <p className="text-xs text-neutral-500 uppercase tracking-widest animate-pulse">Loading order details...</p>
      </main>
    );
  }

  if (!order) {
    return (
      <main className="min-h-screen bg-black text-white p-8">
        <div className="max-w-4xl mx-auto text-center py-20">
          <p className="text-neutral-500 text-xs uppercase tracking-widest">Order not found or unauthorized.</p>
          <Link href="/admin/orders" className="mt-4 inline-block text-amber-400 text-xs uppercase font-bold">
            ← Back to orders
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white p-6 md:p-12">
      <div className="max-w-5xl mx-auto">
        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-white/10 pb-6 gap-4">
          <div>
            <Link href="/admin/orders" className="text-xs uppercase tracking-widest text-neutral-500 hover:text-white">
              ← Back to Orders
            </Link>
            <h1 className="text-3xl font-black mt-2">Order #{order.orderNumber}</h1>
            <p className="text-xs text-neutral-400 mt-1">
              Placed on {new Date(order.createdAt).toLocaleDateString("en-NG", { dateStyle: "full" })}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-neutral-400">Status:</span>
            <select
              value={status}
              onChange={(e) => handleStatusUpdate(e.target.value)}
              disabled={updating}
              className="rounded-xl border border-white/20 bg-neutral-900 px-4 py-2 text-xs font-bold text-amber-400 outline-none focus:border-amber-400"
            >
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="shipped">Shipped</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mt-8">
          {/* LEFT 2 COLS: ITEMS */}
          <div className="md:col-span-2 space-y-6">
            <div className="rounded-2xl border border-white/10 bg-neutral-950 p-6">
              <h2 className="text-sm font-bold uppercase tracking-wider text-amber-400 mb-4">
                Purchased Items ({order.items?.length || 0})
              </h2>

              <div className="space-y-4">
                {order.items?.map((item) => (
                  <div key={item.id} className="flex gap-4 border-b border-white/5 pb-4 last:border-0 last:pb-0">
                    <div className="w-16 h-20 bg-neutral-900 rounded-lg overflow-hidden shrink-0 border border-white/5">
                      {item.product?.images ? (
                        <img
                          src={typeof item.product.images === "string" ? JSON.parse(item.product.images)[0] : item.product.images[0]}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : null}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold truncate">{item.product?.name || "Product Item"}</p>
                      <p className="text-[10px] text-amber-400 font-bold uppercase mt-0.5">{item.product?.brand}</p>

                      <div className="flex flex-wrap gap-2 text-[10px] text-neutral-400 mt-2">
                        {item.selectedColor && (
                          <span className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5">
                            Color: {item.selectedColor}
                          </span>
                        )}
                        {item.selectedSize && (
                          <span className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5">
                            Size: {item.selectedSize}
                          </span>
                        )}
                      </div>

                      {item.customMeasurements && (
                        <p className="mt-2 text-[10px] text-neutral-300 bg-white/[0.02] border border-white/5 p-2 rounded-lg">
                          <span className="font-bold text-amber-400">Measurements:</span> {item.customMeasurements}
                        </p>
                      )}

                      <div className="mt-2 flex justify-between text-xs font-semibold">
                        <span>Qty: {item.quantity} × {formatMoney(item.price)}</span>
                        <span className="text-white font-bold">{formatMoney(item.quantity * item.price)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT COL: CUSTOMER & DELIVERY */}
          <div className="space-y-6">

            {/* CUSTOMER INFO */}
            <div className="rounded-2xl border border-white/10 bg-neutral-950 p-6">
              <h2 className="text-xs font-bold uppercase tracking-wider text-amber-400 mb-3">Customer Information</h2>
              <p className="text-sm font-bold">{order.firstName} {order.lastName}</p>
              <p className="text-xs text-neutral-400 mt-1">{order.email}</p>
              <p className="text-xs text-neutral-400 mt-1">{order.phone || "No phone provided"}</p>
            </div>

            {/* DELIVERY ADDRESS */}
            <div className="rounded-2xl border border-white/10 bg-neutral-950 p-6">
              <h2 className="text-xs font-bold uppercase tracking-wider text-amber-400 mb-3">Delivery Location & Address</h2>
              <p className="text-xs text-neutral-300 font-bold">{order.country || "Nigeria"}</p>
              <p className="text-xs text-neutral-400 mt-1">{order.city}, {order.state}</p>
              {order.zone && <p className="text-xs text-neutral-400 mt-0.5">Zone: {order.zone}</p>}
              <p className="text-xs text-neutral-300 mt-3 p-3 rounded-xl border border-white/5 bg-white/[0.02] leading-relaxed">
                {order.address || "No street address entered"}
              </p>
            </div>

            {/* PAYMENT SUMMARY */}
            <div className="rounded-2xl border border-white/10 bg-neutral-950 p-6">
              <h2 className="text-xs font-bold uppercase tracking-wider text-amber-400 mb-3">Payment Summary</h2>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between text-neutral-400">
                  <span>Shipping Fee</span>
                  <span>{formatMoney(order.shippingFee)}</span>
                </div>
                <div className="flex justify-between text-white font-bold pt-2 border-t border-white/10 text-sm">
                  <span>Total Amount</span>
                  <span className="text-amber-400 font-black">{formatMoney(order.total)}</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </main>
  );
}
