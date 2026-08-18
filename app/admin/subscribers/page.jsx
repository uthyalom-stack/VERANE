"use client";

import { useEffect, useState } from "react";

export default function SubscribersPage() {
  const [subscribers, setSubscribers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [error, setError] = useState("");

  const loadSubscribers = async () => {
    try {
      setError("");

      const response = await fetch(
        "/api/admin/subscribers",
        {
          cache: "no-store",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error || "Failed to load subscribers"
        );
      }

      setSubscribers(
        Array.isArray(data) ? data : []
      );
    } catch (error) {
      console.error(
        "Failed to load subscribers:",
        error
      );

      setSubscribers([]);
      setError(
        error?.message ||
          "Failed to load subscribers."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSubscribers();
  }, []);

  const deleteSubscriber = async (id) => {
    const confirmed = window.confirm(
      "Delete this subscriber? This action cannot be undone."
    );

    if (!confirmed) return;

    try {
      setActionLoading(id);
      setError("");

      const response = await fetch(
        `/api/admin/subscribers/${id}`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Failed to delete subscriber"
        );
      }

      setSubscribers((current) =>
        current.filter(
          (subscriber) => subscriber.id !== id
        )
      );
    } catch (error) {
      console.error(
        "Failed to delete subscriber:",
        error
      );

      setError(
        error?.message ||
          "Failed to delete subscriber."
      );
    } finally {
      setActionLoading(null);
    }
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
        <div className="mx-auto max-w-4xl px-5 py-12 sm:px-8">

          <div className="mb-10">
            <div className="h-10 w-52 animate-pulse rounded-xl bg-neutral-900" />
            <div className="mt-3 h-4 w-64 animate-pulse rounded bg-neutral-900" />
          </div>

          <div className="overflow-hidden rounded-3xl border border-white/10 bg-neutral-950 p-6">
            <div className="space-y-4">
              {Array.from({ length: 5 }).map(
                (_, index) => (
                  <div
                    key={index}
                    className="h-14 animate-pulse rounded-xl bg-white/[0.03]"
                  />
                )
              )}
            </div>
          </div>

        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white">

      <div className="mx-auto max-w-4xl px-5 py-12 sm:px-8">

        {/* HEADER */}
        <div className="mb-10 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">

          <div>

            <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.4em] text-amber-400">
              Administration
            </p>

            <h1 className="text-4xl font-black tracking-[-0.04em] md:text-5xl">
              Subscribers
            </h1>

            <p className="mt-3 text-sm text-neutral-500">
              Manage your newsletter subscribers.
            </p>

          </div>

          <div className="rounded-2xl border border-white/10 bg-neutral-950 px-5 py-4">

            <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-neutral-600">
              Total Subscribers
            </p>

            <p className="mt-1 text-2xl font-black">
              {subscribers.length}
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
              onClick={loadSubscribers}
              className="shrink-0 rounded-full border border-red-500/20 px-4 py-2 text-xs font-bold text-red-400 transition hover:bg-red-500/10"
            >
              Retry
            </button>

          </div>
        )}

        {/* EMPTY STATE */}
        {subscribers.length === 0 ? (

          <div className="rounded-3xl border border-white/10 bg-neutral-950 py-24 text-center">

            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-white/[0.02]">
              <span className="text-xl">✉</span>
            </div>

            <p className="font-semibold">
              No subscribers yet.
            </p>

            <p className="mt-2 text-sm text-neutral-600">
              Newsletter subscribers will appear here.
            </p>

          </div>

        ) : (

          <div className="overflow-hidden rounded-3xl border border-white/10 bg-neutral-950">

            <div className="overflow-x-auto">

              <table className="w-full min-w-[600px] text-sm">

                <thead>

                  <tr className="border-b border-white/10 bg-white/[0.02]">

                    <th className="p-5 text-left text-[10px] font-bold uppercase tracking-[0.18em] text-neutral-600">
                      Email
                    </th>

                    <th className="p-5 text-left text-[10px] font-bold uppercase tracking-[0.18em] text-neutral-600">
                      Joined
                    </th>

                    <th className="p-5 text-right text-[10px] font-bold uppercase tracking-[0.18em] text-neutral-600">
                      Action
                    </th>

                  </tr>

                </thead>

                <tbody>

                  {subscribers.map(
                    (subscriber) => {

                      const deleting =
                        actionLoading ===
                        subscriber.id;

                      return (
                        <tr
                          key={subscriber.id}
                          className="border-b border-white/5 transition last:border-0 hover:bg-white/[0.02]"
                        >

                          <td className="p-5">

                            <p className="font-medium text-white">
                              {subscriber.email}
                            </p>

                          </td>

                          <td className="p-5 text-xs text-neutral-500">
                            {formatDate(
                              subscriber.createdAt
                            )}
                          </td>

                          <td className="p-5 text-right">

                            <button
                              type="button"
                              disabled={
                                !!actionLoading
                              }
                              onClick={() =>
                                deleteSubscriber(
                                  subscriber.id
                                )
                              }
                              className="text-xs font-semibold text-red-400 transition hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              {deleting
                                ? "Deleting..."
                                : "Delete"}
                            </button>

                          </td>

                        </tr>
                      );
                    }
                  )}

                </tbody>

              </table>

            </div>

          </div>

        )}

      </div>

    </main>
  );
}