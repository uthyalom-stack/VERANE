"use client";

import { useEffect, useState } from "react";

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState(null);

  const loadOrders = async () => {
    try {
      setError("");

      const response = await fetch("/api/admin/orders", {
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error || "Failed to load orders"
        );
      }

      setOrders(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to load orders:", error);
      setOrders([]);
      setError(
        error?.message || "Failed to load orders."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const updateStatus = async (id, status) => {
    try {
      setActionLoading(`status-${id}`);
      setError("");

      const response = await fetch(
        `/api/admin/orders/${id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error || "Failed to update order"
        );
      }

      setOrders((currentOrders) =>
        currentOrders.map((order) =>
          order.id === id
            ? {
                ...order,
                status: data.status || status,
              }
            : order
        )
      );

      if (selectedOrder?.id === id) {
        setSelectedOrder((current) =>
          current
            ? {
                ...current,
                status: data.status || status,
              }
            : current
        );
      }
    } catch (error) {
      console.error("Failed to update order:", error);

      setError(
        error?.message || "Failed to update order."
      );

      await loadOrders();
    } finally {
      setActionLoading(null);
    }
  };

  const deleteOrder = async (id) => {
    const confirmed = window.confirm(
      "Delete this order? This action cannot be undone."
    );

    if (!confirmed) return;

    try {
      setActionLoading(`delete-${id}`);
      setError("");

      const response = await fetch(
        `/api/admin/orders/${id}`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error || "Failed to delete order"
        );
      }

      setOrders((currentOrders) =>
        currentOrders.filter(
          (order) => order.id !== id
        )
      );

      if (selectedOrder?.id === id) {
        setSelectedOrder(null);
      }
    } catch (error) {
      console.error("Failed to delete order:", error);

      setError(
        error?.message || "Failed to delete order."
      );
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusColor = (status) => {
    if (status === "completed") {
      return "bg-emerald-500/10 text-emerald-400";
    }

    if (status === "pending") {
      return "bg-amber-500/10 text-amber-400";
    }

    if (status === "processing") {
      return "bg-blue-500/10 text-blue-400";
    }

    if (status === "cancelled") {
      return "bg-red-500/10 text-red-400";
    }

    return "bg-white/5 text-neutral-400";
  };

  const formatPrice = (value) => {
    return `₦${Number(value || 0).toLocaleString()}`;
  };

  const formatDate = (value) => {
    if (!value) return "—";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "—";
    }

    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-black text-white">
        <div className="mx-auto max-w-7xl px-5 py-12 sm:px-8">

          <div className="mb-10">
            <div className="h-10 w-40 animate-pulse rounded-xl bg-neutral-900" />
            <div className="mt-3 h-4 w-64 animate-pulse rounded bg-neutral-900" />
          </div>

          <div className="overflow-hidden rounded-3xl border border-white/10 bg-neutral-950">
            <div className="space-y-4 p-6">
              {Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={index}
                  className="h-14 animate-pulse rounded-xl bg-white/[0.03]"
                />
              ))}
            </div>
          </div>

        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white">

      <div className="mx-auto max-w-7xl px-5 py-12 sm:px-8">

        {/* HEADER */}
        <div className="mb-10 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">

          <div>
            <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.4em] text-amber-400">
              Administration
            </p>

            <h1 className="text-4xl font-black tracking-[-0.04em] md:text-5xl">
              Orders
            </h1>

            <p className="mt-3 text-sm text-neutral-500">
              Manage customer orders and fulfillment.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-neutral-950 px-5 py-4">
            <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-neutral-600">
              Total Orders
            </p>

            <p className="mt-1 text-2xl font-black">
              {orders.length}
            </p>
          </div>

        </div>

        {/* ERROR */}
        {error && (
          <div className="mb-6 flex items-center justify-between gap-4 rounded-2xl border border-red-500/20 bg-red-500/5 px-5 py-4">

            <p className="text-sm text-red-400">
              {error}
            </p>

            <button
              type="button"
              onClick={loadOrders}
              className="shrink-0 rounded-full border border-red-500/20 px-4 py-2 text-xs font-bold text-red-400 transition hover:bg-red-500/10"
            >
              Retry
            </button>

          </div>
        )}

        {/* EMPTY STATE */}
        {orders.length === 0 ? (

          <div className="rounded-3xl border border-white/10 bg-neutral-950 py-24 text-center">

            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-white/[0.02]">
              <span className="text-xl">⌁</span>
            </div>

            <p className="font-semibold">
              No orders yet.
            </p>

            <p className="mt-2 text-sm text-neutral-600">
              Customer orders will appear here.
            </p>

          </div>

        ) : (

          /* ORDER TABLE */
          <div className="overflow-hidden rounded-3xl border border-white/10 bg-neutral-950">

            <div className="overflow-x-auto">

              <table className="w-full min-w-[900px] text-sm">

                <thead>
                  <tr className="border-b border-white/10 bg-white/[0.02]">

                    <th className="p-5 text-left text-[10px] font-bold uppercase tracking-[0.18em] text-neutral-600">
                      Order ID
                    </th>

                    <th className="p-5 text-left text-[10px] font-bold uppercase tracking-[0.18em] text-neutral-600">
                      Customer
                    </th>

                    <th className="p-5 text-left text-[10px] font-bold uppercase tracking-[0.18em] text-neutral-600">
                      Total
                    </th>

                    <th className="p-5 text-left text-[10px] font-bold uppercase tracking-[0.18em] text-neutral-600">
                      Status
                    </th>

                    <th className="p-5 text-left text-[10px] font-bold uppercase tracking-[0.18em] text-neutral-600">
                      Date
                    </th>

                    <th className="p-5 text-right text-[10px] font-bold uppercase tracking-[0.18em] text-neutral-600">
                      Actions
                    </th>

                  </tr>
                </thead>

                <tbody>

                  {orders.map((order) => {

                    const updating =
                      actionLoading ===
                      `status-${order.id}`;

                    const deleting =
                      actionLoading ===
                      `delete-${order.id}`;

                    return (
                      <tr
                        key={order.id}
                        className="border-b border-white/5 transition last:border-0 hover:bg-white/[0.02]"
                      >

                        {/* ORDER ID */}
                        <td className="p-5">

                          <button
                            type="button"
                            onClick={() =>
                              setSelectedOrder(order)
                            }
                            className="font-mono text-xs text-white transition hover:text-amber-400"
                          >
                            {order.id.slice(0, 12)}...
                          </button>

                        </td>

                        {/* CUSTOMER */}
                        <td className="p-5">

                          <div>
                            <p className="font-medium text-white">
                              {order.user?.email ||
                                "Guest"}
                            </p>

                            {order.user?.name && (
                              <p className="mt-1 text-xs text-neutral-600">
                                {order.user.name}
                              </p>
                            )}
                          </div>

                        </td>

                        {/* TOTAL */}
                        <td className="p-5 font-semibold">
                          {formatPrice(order.total)}
                        </td>

                        {/* STATUS */}
                        <td className="p-5">

                          <select
                            value={
                              order.status || "pending"
                            }
                            disabled={
                              updating || deleting
                            }
                            onChange={(event) =>
                              updateStatus(
                                order.id,
                                event.target.value
                              )
                            }
                            className={`cursor-pointer rounded-full border border-white/10 bg-black px-3 py-1.5 text-xs font-bold outline-none transition focus:border-amber-400/40 disabled:cursor-not-allowed disabled:opacity-50 ${getStatusColor(
                              order.status
                            )}`}
                          >

                            <option value="pending">
                              Pending
                            </option>

                            <option value="processing">
                              Processing
                            </option>

                            <option value="completed">
                              Completed
                            </option>

                            <option value="cancelled">
                              Cancelled
                            </option>

                          </select>

                        </td>

                        {/* DATE */}
                        <td className="p-5 text-xs text-neutral-500">
                          {formatDate(
                            order.createdAt
                          )}
                        </td>

                        {/* ACTIONS */}
                        <td className="p-5">

                          <div className="flex justify-end gap-4">

                            <a
                              href={`/admin/orders/${order.id}`}
                              className="text-xs font-semibold text-amber-400 transition hover:text-amber-300"
                            >
                              Details →
                            </a>

                            <button
                              type="button"
                              disabled={!!actionLoading}
                              onClick={() =>
                                deleteOrder(order.id)
                              }
                              className="text-xs font-semibold text-red-400 transition hover:text-red-300 disabled:opacity-40"
                            >
                              {deleting
                                ? "Deleting..."
                                : "Delete"}
                            </button>

                          </div>

                        </td>

                      </tr>
                    );
                  })}

                </tbody>

              </table>

            </div>

          </div>

        )}

      </div>

      {/* ORDER DETAILS MODAL */}
      {selectedOrder && (

        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-5 backdrop-blur-sm"
          onClick={() =>
            setSelectedOrder(null)
          }
        >

          <div
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-white/10 bg-neutral-950 p-6 shadow-2xl sm:p-8"
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            {/* MODAL HEADER */}
            <div className="mb-6 flex items-start justify-between gap-5">

              <div>

                <p className="mb-2 text-[9px] font-bold uppercase tracking-[0.3em] text-amber-400">
                  Order Details
                </p>

                <h2 className="text-xl font-black">
                  Customer Order
                </h2>

                <p className="mt-2 break-all font-mono text-[10px] text-neutral-600">
                  {selectedOrder.id}
                </p>

              </div>

              <button
                type="button"
                onClick={() =>
                  setSelectedOrder(null)
                }
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 text-neutral-500 transition hover:border-white/20 hover:text-white"
                aria-label="Close order details"
              >
                ×
              </button>

            </div>

            {/* CUSTOMER */}
            <div className="mb-6 rounded-2xl border border-white/10 bg-white/[0.02] p-4">

              <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-neutral-600">
                Customer
              </p>

              <p className="mt-2 text-sm font-semibold">
                {selectedOrder.user?.email ||
                  "Guest"}
              </p>

            </div>

            {/* ITEMS */}
            <div className="mb-6">

              <p className="mb-4 text-[9px] font-bold uppercase tracking-[0.25em] text-neutral-600">
                Items
              </p>

              <div className="space-y-3">

                {selectedOrder.items?.length ? (

                  selectedOrder.items.map((item) => (

                    <div
                      key={item.id}
                      className="flex justify-between gap-5 border-b border-white/5 pb-3 last:border-0"
                    >

                      <div className="min-w-0">

                        <p className="font-semibold">
                          {item.product?.name ||
                            "Product"}
                        </p>

                        <p className="mt-1 text-xs text-neutral-500">
                          {item.quantity} ×{" "}
                          {formatPrice(item.price)}
                        </p>

                      </div>

                      <p className="shrink-0 font-semibold">
                        {formatPrice(
                          Number(item.price) *
                            Number(item.quantity)
                        )}
                      </p>

                    </div>

                  ))

                ) : (

                  <p className="text-sm text-neutral-600">
                    No order items found.
                  </p>

                )}

              </div>

            </div>

            {/* TOTAL */}
            <div className="mb-6 flex items-center justify-between border-t border-white/10 pt-5">

              <span className="text-sm font-bold">
                Total
              </span>

              <span className="text-xl font-black">
                {formatPrice(
                  selectedOrder.total
                )}
              </span>

            </div>

            {/* STATUS */}
            <div className="mb-6">

              <p className="mb-2 text-[9px] font-bold uppercase tracking-[0.25em] text-neutral-600">
                Status
              </p>

              <span
                className={`inline-flex rounded-full px-3 py-1.5 text-xs font-bold capitalize ${getStatusColor(
                  selectedOrder.status
                )}`}
              >
                {selectedOrder.status ||
                  "pending"}
              </span>

            </div>

            <button
              type="button"
              onClick={() =>
                setSelectedOrder(null)
              }
              className="w-full rounded-full bg-white py-3.5 text-sm font-bold text-black transition hover:bg-neutral-200"
            >
              Close
            </button>

          </div>

        </div>

      )}

    </main>
  );
}