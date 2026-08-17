"use client";

import { useEffect, useState } from "react";

const DEFAULT_NAVIGATION = [
  {
    id: "home",
    label: "Home",
    href: "/",
    enabled: true,
  },
  {
    id: "shop",
    label: "Shop",
    href: "/shop",
    enabled: true,
  },
  {
    id: "uthy",
    label: "UTHY LUXURY",
    href: "/uthy-luxury",
    enabled: true,
  },
  {
    id: "alomziee",
    label: "ALOMZIEE FOOTIES",
    href: "/alomziee-footies",
    enabled: true,
  },
  {
    id: "collections",
    label: "Collections",
    href: "/collections",
    enabled: true,
  },
];

export default function NavigationPage() {
  const [items, setItems] = useState(DEFAULT_NAVIGATION);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const [newLabel, setNewLabel] = useState("");
  const [newHref, setNewHref] = useState("");

  useEffect(() => {
    try {
      const stored = localStorage.getItem("verane_navigation");

      if (stored) {
        const parsed = JSON.parse(stored);

        if (Array.isArray(parsed)) {
          setItems(parsed);
        }
      }
    } catch (error) {
      console.error("Navigation loading error:", error);
    }
  }, []);

  function updateItem(id, key, value) {
    setItems((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              [key]: value,
            }
          : item
      )
    );

    setSaved(false);
    setError("");
  }

  function toggleItem(id) {
    setItems((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              enabled: !item.enabled,
            }
          : item
      )
    );

    setSaved(false);
  }

  function moveItem(index, direction) {
    const newItems = [...items];
    const newIndex = index + direction;

    if (newIndex < 0 || newIndex >= newItems.length) {
      return;
    }

    const currentItem = newItems[index];

    newItems[index] = newItems[newIndex];
    newItems[newIndex] = currentItem;

    setItems(newItems);
    setSaved(false);
  }

  function removeItem(id) {
    const confirmed = window.confirm(
      "Remove this navigation item?"
    );

    if (!confirmed) {
      return;
    }

    setItems((current) =>
      current.filter((item) => item.id !== id)
    );

    setSaved(false);
  }

  function addItem() {
    const label = newLabel.trim();
    const href = newHref.trim();

    if (!label || !href) {
      setError(
        "Enter both a navigation name and destination."
      );
      return;
    }

    const newItem = {
      id: `custom-${Date.now()}`,
      label,
      href,
      enabled: true,
    };

    setItems((current) => [...current, newItem]);

    setNewLabel("");
    setNewHref("");
    setSaved(false);
    setError("");
  }

  function saveNavigation() {
    try {
      setSaving(true);
      setError("");

      localStorage.setItem(
        "verane_navigation",
        JSON.stringify(items)
      );

      setSaved(true);

      setTimeout(() => {
        setSaved(false);
      }, 3000);
    } catch (error) {
      console.error("Navigation saving error:", error);
      setError("Unable to save navigation settings.");
    } finally {
      setSaving(false);
    }
  }

  const visibleCount = items.filter(
    (item) => item.enabled
  ).length;

  return (
    <main className="min-h-screen bg-black px-5 pb-32 pt-10 text-white sm:px-8 lg:px-10">
      <div className="mx-auto max-w-5xl">

        {/* HEADER */}
        <header className="mb-10">
          <div className="flex flex-col gap-7 sm:flex-row sm:items-end sm:justify-between">

            <div>
              <div className="mb-4 flex items-center gap-3">
                <span className="h-px w-9 bg-amber-400" />

                <span className="text-[10px] font-bold uppercase tracking-[0.32em] text-amber-400">
                  Content / Navigation
                </span>
              </div>

              <h1 className="text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">
                Navigation
              </h1>

              <p className="mt-3 max-w-xl text-sm leading-6 text-white/40 sm:text-base">
                Control the links customers use to move around
                your VÉRANE storefront.
              </p>
            </div>

            <div className="rounded-full border border-white/[0.08] bg-white/[0.025] px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/40">
              {visibleCount} Visible / {items.length} Total
            </div>

          </div>
        </header>

        {/* WARNING / INFO */}
        <div className="mb-8 rounded-[24px] border border-amber-400/10 bg-amber-400/[0.025] p-5 sm:p-6">
          <div className="flex gap-4">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-amber-400/20 bg-amber-400/[0.06] text-sm text-amber-400">
              i
            </div>

            <div>
              <p className="text-sm font-semibold text-white">
                Navigation structure
              </p>

              <p className="mt-1 text-xs leading-5 text-white/35">
                Changes made here control the navigation
                configuration. The storefront header must be
                connected to this configuration for changes to
                appear publicly.
              </p>
            </div>
          </div>
        </div>

        {/* ERROR */}
        {error && (
          <div className="mb-6 flex items-center justify-between gap-4 rounded-2xl border border-red-400/20 bg-red-400/[0.06] px-5 py-4">
            <p className="text-sm text-red-300">
              {error}
            </p>

            <button
              onClick={() => setError("")}
              className="text-xs font-semibold text-white/40 transition hover:text-white"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* NAVIGATION LIST */}
        <section className="overflow-hidden rounded-[28px] border border-white/[0.08] bg-white/[0.025]">

          <div className="border-b border-white/[0.07] px-6 py-6 sm:px-8">
            <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-amber-400/70">
              Primary Menu
            </p>

            <h2 className="mt-2 text-xl font-semibold">
              Menu Items
            </h2>

            <p className="mt-1 text-sm text-white/35">
              Drag-style ordering controls let you determine
              how the navigation should appear.
            </p>
          </div>

          <div className="divide-y divide-white/[0.06]">

            {items.map((item, index) => (
              <div
                key={item.id}
                className={`p-5 transition sm:p-6 ${
                  item.enabled
                    ? "bg-transparent"
                    : "bg-white/[0.015] opacity-60"
                }`}
              >
                <div className="flex flex-col gap-5 lg:flex-row lg:items-center">

                  {/* ORDER */}
                  <div className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/[0.07] bg-black text-[10px] font-bold text-white/30 sm:flex">
                    {String(index + 1).padStart(2, "0")}
                  </div>

                  {/* FIELDS */}
                  <div className="grid flex-1 gap-4 md:grid-cols-2">

                    <div>
                      <label className="mb-2 block text-[9px] font-bold uppercase tracking-[0.2em] text-white/30">
                        Label
                      </label>

                      <input
                        value={item.label}
                        onChange={(e) =>
                          updateItem(
                            item.id,
                            "label",
                            e.target.value
                          )
                        }
                        className="w-full rounded-xl border border-white/[0.08] bg-black/40 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/20 focus:border-amber-400/40"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-[9px] font-bold uppercase tracking-[0.2em] text-white/30">
                        Destination
                      </label>

                      <input
                        value={item.href}
                        onChange={(e) =>
                          updateItem(
                            item.id,
                            "href",
                            e.target.value
                          )
                        }
                        placeholder="/shop"
                        className="w-full rounded-xl border border-white/[0.08] bg-black/40 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/20 focus:border-amber-400/40"
                      />
                    </div>

                  </div>

                  {/* ACTIONS */}
                  <div className="flex items-center gap-2">

                    <button
                      onClick={() =>
                        moveItem(index, -1)
                      }
                      disabled={index === 0}
                      title="Move up"
                      className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.02] text-white/40 transition hover:border-white/20 hover:text-white disabled:cursor-not-allowed disabled:opacity-20"
                    >
                      ↑
                    </button>

                    <button
                      onClick={() =>
                        moveItem(index, 1)
                      }
                      disabled={index === items.length - 1}
                      title="Move down"
                      className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.02] text-white/40 transition hover:border-white/20 hover:text-white disabled:cursor-not-allowed disabled:opacity-20"
                    >
                      ↓
                    </button>

                    <button
                      onClick={() =>
                        toggleItem(item.id)
                      }
                      title={
                        item.enabled
                          ? "Hide item"
                          : "Show item"
                      }
                      className={`flex h-10 items-center gap-2 rounded-xl border px-3 text-[9px] font-bold uppercase tracking-[0.12em] transition ${
                        item.enabled
                          ? "border-emerald-400/20 bg-emerald-400/[0.04] text-emerald-300"
                          : "border-white/[0.08] text-white/30"
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          item.enabled
                            ? "bg-emerald-400"
                            : "bg-white/30"
                        }`}
                      />

                      {item.enabled
                        ? "Visible"
                        : "Hidden"}
                    </button>

                    <button
                      onClick={() =>
                        removeItem(item.id)
                      }
                      title="Remove item"
                      className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.02] text-white/25 transition hover:border-red-400/20 hover:bg-red-400/[0.04] hover:text-red-300"
                    >
                      ×
                    </button>

                  </div>

                </div>
              </div>
            ))}

          </div>
        </section>

        {/* ADD ITEM */}
        <section className="mt-6 overflow-hidden rounded-[28px] border border-white/[0.08] bg-white/[0.025]">

          <div className="border-b border-white/[0.07] px-6 py-6 sm:px-8">
            <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-amber-400/70">
              Custom Link
            </p>

            <h2 className="mt-2 text-xl font-semibold">
              Add Navigation Item
            </h2>

            <p className="mt-1 text-sm text-white/35">
              Add another destination to your menu.
            </p>
          </div>

          <div className="grid gap-4 p-6 md:grid-cols-[1fr_1fr_auto] md:items-end sm:p-8">

            <div>
              <label className="mb-2 block text-[9px] font-bold uppercase tracking-[0.2em] text-white/30">
                Menu Label
              </label>

              <input
                value={newLabel}
                onChange={(e) =>
                  setNewLabel(e.target.value)
                }
                placeholder="New Collection"
                className="w-full rounded-xl border border-white/[0.08] bg-black/40 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/20 focus:border-amber-400/40"
              />
            </div>

            <div>
              <label className="mb-2 block text-[9px] font-bold uppercase tracking-[0.2em] text-white/30">
                Destination
              </label>

              <input
                value={newHref}
                onChange={(e) =>
                  setNewHref(e.target.value)
                }
                placeholder="/collections/new"
                className="w-full rounded-xl border border-white/[0.08] bg-black/40 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/20 focus:border-amber-400/40"
              />
            </div>

            <button
              onClick={addItem}
              className="rounded-xl bg-white px-6 py-3 text-xs font-bold text-black transition hover:bg-white/80"
            >
              Add Item
            </button>

          </div>
        </section>

        {/* SAVE */}
        <div className="sticky bottom-4 z-20 mt-8">
          <div className="flex flex-col gap-4 rounded-[24px] border border-white/[0.08] bg-black/80 p-4 shadow-2xl shadow-black/50 backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between sm:p-5">

            <div>
              <p className="text-sm font-semibold text-white">
                {saved
                  ? "Navigation saved"
                  : "Navigation changes"}
              </p>

              <p className="mt-1 text-xs text-white/35">
                {saved
                  ? "Your navigation configuration has been saved."
                  : "Review your menu structure before saving."}
              </p>
            </div>

            <button
              onClick={saveNavigation}
              disabled={saving}
              className="rounded-full bg-amber-400 px-7 py-3.5 text-sm font-bold text-black transition hover:bg-amber-300 hover:shadow-[0_0_30px_rgba(245,185,66,0.15)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving
                ? "Saving..."
                : saved
                  ? "Saved ✓"
                  : "Save Navigation"}
            </button>

          </div>
        </div>

      </div>
    </main>
  );
}