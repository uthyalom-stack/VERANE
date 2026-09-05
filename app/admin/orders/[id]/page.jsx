"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";

/**
 * Display and manage the details of an administrator-selected order.
 * @param {Object} params - Route parameters containing the order identifier.
 */
export default function AdminOrderDetailsPage({ params }) {
  const resolvedParams = use(params);
  const id = resolvedParams.id;

  const [order, setOrder] = useState(null);
  const [adminSession, setAdminSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setSaving] = useState(false);
  const [trackingUpdating, setTrackingUpdating] = useState(false);
  const [status, setStatus] = useState("pending");

  useEffect(() => {
    fetchSessionAndOrder();
  }, [id]);

  async function fetchSessionAndOrder() {
    try {
      const [sessionRes, orderRes] = await Promise.all([
        fetch("/api/admin/session", { cache: "no-store" }),
        fetch(`/api/admin/orders/${id}`, { cache: "no-store" }),
      ]);

      const sessionData = await sessionRes.json();
      if (sessionRes.ok && sessionData.authenticated) {
        setAdminSession(sessionData.admin);
      }

      const orderData = await orderRes.json();
      if (orderRes.ok && orderData.success) {
        setOrder(orderData.order);
        setStatus(orderData.order.status || "pending");
      }
    } catch (err) {
      console.error("Order detail load error:", err);
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
        fetchSessionAndOrder();
      }
    } catch (err) {
      console.error("Update status error:", err);
    } finally {
      setSaving(false);
    }
  }

  async function handleTrackingUpdate(newTrackingStatus) {
    setTrackingUpdating(true);
    try {
      const res = await fetch(`/api/admin/orders/${id}/tracking`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newTrackingStatus }),
      });
      if (res.ok) {
        fetchSessionAndOrder();
      }
    } catch (err) {
      console.error("Update tracking error:", err);
    } finally {
      setTrackingUpdating(false);
    }
  }

  function formatMoney(amount) {
    return "₦" + Number(amount || 0).toLocaleString("en-NG");
  }

  function getBrandName(brand) {
    if (brand === "UTHY_LUXURY" || brand === "UTHY") return "UTHY LUXURY";
    if (brand === "ALOMZIEE_FOOTIES" || brand === "ALOMZIEE") return "ALOMZIEE FOOTIES";
    return brand || "VÉRANE";
  }

  function parseImages(images) {
    if (!images) return [];
    try {
      const parsed = typeof images === "string" ? JSON.parse(images) : images;
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      return typeof images === "string" ? images.split(",").map((s) => s.trim()).filter(Boolean) : [];
    }
  }

  function getItemImage(item) {
    const itemImages = parseImages(item.product?.images);
    if (itemImages.length > 0 && itemImages[0]) return itemImages[0];

    if (item.collaborationProduct) {
      const collabImages = parseImages(item.collaborationProduct.images);
      if (collabImages.length > 0 && collabImages[0]) return collabImages[0];

      const prodAImages = parseImages(item.collaborationProduct.productA?.images);
      if (prodAImages.length > 0 && prodAImages[0]) return prodAImages[0];

      const prodBImages = parseImages(item.collaborationProduct.productB?.images);
      if (prodBImages.length > 0 && prodBImages[0]) return prodBImages[0];
    }

    return null;
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
                {order.items?.map((item) => {
                  const image = getItemImage(item);
                  const isCollab = Boolean(item.collaborationProduct || item.collaborationProductId);

                  const itemName = item.collaborationProduct?.name || item.product?.name || "Purchased Product";
                  const itemBrand = isCollab
                    ? "UTHY × ALOMZIEE COLLABORATION"
                    : getBrandName(item.product?.brand);

                  const colorName = item.selectedColor || item.variant?.color?.name || item.variant?.color?.label || null;
                  const colorHex = item.selectedColorHex || item.variant?.color?.hex || item.variant?.color?.value || null;

                  const sizeName = item.selectedSize || item.variant?.size || item.variant?.name || item.variant?.value || item.collaborationVariant?.size || null;

                  const variantName = item.variant?.name || item.collaborationVariant?.name || null;

                  const isPreOrder = Boolean(item.isPreOrder || item.product?.preOrderEnabled || item.product?.isPreOrder);

                  return (
                    <div key={item.id} className="flex gap-4 border-b border-white/5 pb-4 last:border-0 last:pb-0">
                      <div className="w-16 h-20 bg-neutral-900 rounded-lg overflow-hidden shrink-0 border border-white/5 relative">
                        {image ? (
                          <img
                            src={image}
                            alt={itemName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs text-neutral-600 font-bold">
                            VÉRANE
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-bold truncate">{itemName}</p>

                          {isCollab && (
                            <span className="rounded-full bg-amber-400/10 border border-amber-400/30 text-amber-400 px-2 py-0.5 text-[8px] font-black uppercase tracking-wider">
                              Collaboration
                            </span>
                          )}

                          {isPreOrder && (
                            <span className="rounded-full bg-amber-400 text-black px-2 py-0.5 text-[8px] font-black uppercase tracking-wider">
                              Pre-Order
                            </span>
                          )}
                        </div>

                        <p className="text-[10px] text-amber-400 font-bold uppercase mt-0.5">{itemBrand}</p>

                        <div className="flex flex-wrap items-center gap-2 text-[10px] text-neutral-400 mt-2">
                          {colorName && (
                            <span className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-2 py-0.5 font-medium">
                              {colorHex && (
                                <span
                                  className="w-2.5 h-2.5 rounded-full border border-white/20 shrink-0"
                                  style={{ backgroundColor: colorHex }}
                                />
                              )}
                              Color: <strong className="text-white">{colorName}</strong>
                            </span>
                          )}

                          {sizeName && (
                            <span className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5 font-medium">
                              Size: <strong className="text-white">{sizeName}</strong>
                            </span>
                          )}

                          {variantName && variantName !== sizeName && variantName !== colorName && (
                            <span className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5 font-medium">
                              Variant: <strong className="text-white">{variantName}</strong>
                            </span>
                          )}
                        </div>

                        {item.customMeasurements && (
                          <p className="mt-2 text-[10px] text-neutral-300 bg-white/[0.02] border border-white/5 p-2 rounded-lg">
                            <span className="font-bold text-amber-400">Custom Sizing / Measurements:</span> {item.customMeasurements}
                          </p>
                        )}

                        <div className="mt-2.5 flex justify-between items-center text-xs font-semibold">
                          <span className="text-neutral-400">
                            Qty: <strong className="text-white">{item.quantity}</strong> × {formatMoney(item.price)}
                          </span>
                          <span className="text-amber-400 font-bold">{formatMoney(item.quantity * item.price)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
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

            {/* BRAND DELIVERY TRACKING CONTROLS (EXCLUSIVELY FOR BRAND ADMINS) */}
            {adminSession && !adminSession.isSuperAdmin && (
              <div className="rounded-2xl border border-white/10 bg-neutral-950 p-6">
                <h2 className="text-xs font-bold uppercase tracking-wider text-amber-400 mb-2">
                  Brand Delivery Tracking
                </h2>
                <p className="text-[10px] text-neutral-400 mb-4">
                  Manage independent delivery status for your brand portion:
                </p>

                {Array.isArray(order.brandTrackingsInfo) && order.brandTrackingsInfo.length > 0 ? (
                  <div className="space-y-4">
                    {order.brandTrackingsInfo.map((bt) => {
                      const adminBrandKey =
                        adminSession.role === "UTHY"
                          ? "UTHY_LUXURY"
                          : adminSession.role === "ALOMZIEE"
                          ? "ALOMZIEE_FOOTIES"
                          : adminSession.brand;

                      const isMyBrand = bt.brand === adminBrandKey;

                      return (
                        <div
                          key={bt.brand}
                          className={`p-4 rounded-xl border ${
                            isMyBrand
                              ? "border-amber-400/40 bg-amber-400/5"
                              : "border-white/10 bg-white/[0.02]"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div>
                              <p className="text-xs font-bold uppercase tracking-wider text-white">
                                {bt.displayName}
                              </p>
                              <p className="text-[10px] text-neutral-400 mt-0.5">
                                Current Status: <span className="text-amber-400 font-bold">{bt.status}</span>
                              </p>
                            </div>

                            {isMyBrand ? (
                              <select
                                value={bt.status}
                                onChange={(e) => handleTrackingUpdate(e.target.value)}
                                disabled={trackingUpdating}
                                className="rounded-xl border border-amber-400/40 bg-black px-3 py-1.5 text-xs font-bold text-amber-400 outline-none focus:border-amber-400 disabled:opacity-50 cursor-pointer"
                              >
                                <option value="Processing">Processing</option>
                                <option value="In Transit">In Transit</option>
                                <option value="Delivered">Delivered</option>
                              </select>
                            ) : (
                              <span className="text-[10px] uppercase font-bold text-neutral-500 bg-white/5 border border-white/10 px-2.5 py-1 rounded-lg">
                                Read Only
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-neutral-500">No brand tracking entries available.</p>
                )}
              </div>
            )}

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
