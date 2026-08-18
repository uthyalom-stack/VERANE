"use client";

import { useEffect, useState } from "react";

const DEFAULT_NAVIGATION = [
  {
    label: "UTHY LUXURY",
    url: "/catalog?brand=UTHY_LUXURY",
  },
  {
    label: "ALOMZIEE",
    url: "/catalog?brand=ALOMZIEE_FOOTIES",
  },
  {
    label: "Outfit Builder",
    url: "/outfit-builder",
  },
  {
    label: "Shop",
    url: "/catalog",
  },
  {
    label: "Cart",
    url: "/cart",
  },
];

export default function NavigationPage() {
  const [items, setItems] = useState(DEFAULT_NAVIGATION);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadNavigation();
  }, []);

  async function loadNavigation() {
    try {
      setLoading(true);

      const response = await fetch("/api/admin/settings");
      const data = await response.json();

      if (data.navItems) {
        try {
          const parsed = JSON.parse(data.navItems);

          if (Array.isArray(parsed)) {
            setItems(parsed);
          }
        } catch {
          const parsed = data.navItems
            .split("\n")
            .map((line) => line.trim())
            .filter(Boolean)
            .map((line) => {
              const separator = line.indexOf(":");

              if (separator === -1) {
                return {
                  label: line,
                  url: "#",
                };
              }

              return {
                label: line.slice(0, separator).trim(),
                url: line.slice(separator + 1).trim(),
              };
            });

          if (parsed.length > 0) {
            setItems(parsed);
          }
        }
      }
    } catch (error) {
      console.error("Failed to load navigation:", error);
      setMessage("Failed to load navigation.");
    } finally {
      setLoading(false);
    }
  }

  function updateItem(index, field, value) {
    setItems((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              [field]: value,
            }
          : item
      )
    );
  }

  function addItem() {
    setItems((current) => [
      ...current,
      {
        label: "New Menu Item",
        url: "/",
      },
    ]);
  }

  function removeItem(index) {
    setItems((current) =>
      current.filter((_, itemIndex) => itemIndex !== index)
    );
  }

  function moveItem(index, direction) {
    setItems((current) => {
      const newItems = [...current];
      const newIndex = index + direction;

      if (
        newIndex < 0 ||
        newIndex >= newItems.length
      ) {
        return current;
      }

      const temp = newItems[index];
      newItems[index] = newItems[newIndex];
      newItems[newIndex] = temp;

      return newItems;
    });
  }

  async function saveNavigation() {
    try {
      setSaving(true);
      setSaved(false);
      setMessage("");

      const response = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          navItems: JSON.stringify(items),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error || "Failed to save navigation."
        );
      }

      setSaved(true);
      setMessage("Navigation saved successfully.");

      setTimeout(() => {
        setSaved(false);
      }, 3000);
    } catch (error) {
      console.error("Failed to save navigation:", error);
      setMessage(
        error.message || "Failed to save navigation."
      );
    } finally {
      setSaving(false);
    }
  }

  function resetNavigation() {
    if (
      !confirm(
        "Reset navigation to the default VÉRANE menu?"
      )
    ) {
      return;
    }

    setItems(DEFAULT_NAVIGATION);
    setMessage("Navigation reset. Save to apply the changes.");
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-5xl px-5 py-10 sm:px-8 lg:px-10">

        {/* HEADER */}
        <header className="mb-10">
          <div className="mb-5 flex items-center gap-3">
            <span className="h-px w-10 bg-amber-400" />

            <span className="text-[10px] font-bold uppercase tracking-[0.35em] text-amber-400">
              VÉRANE / NAVIGATION
            </span>
          </div>

          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">
                Navigation
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-7 text-white/40">
                Control the links customers see in your
                storefront navigation without editing the
                website code.
              </p>
            </div>

            <div className="rounded-full border border-white/[0.08] bg-white/[0.025] px-5 py-3 text-xs text-white/40">
              {items.length}{" "}
              {items.length === 1 ? "item" : "items"}
            </div>
          </div>
        </header>

        {/* MESSAGE */}
        {message && (
          <div className="mb-6 rounded-2xl border border-amber-400/20 bg-amber-400/[0.05] px-5 py-4 text-sm text-amber-300">
            {message}
          </div>
        )}

        {/* NAVIGATION EDITOR */}
        <section className="overflow-hidden rounded-[28px] border border-white/[0.08] bg-white/[0.025]">

          <div className="flex flex-col gap-4 border-b border-white/[0.06] px-6 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-amber-400/70">
                Menu Structure
              </p>

              <h2 className="mt-2 text-xl font-semibold tracking-tight">
                Storefront navigation
              </h2>
            </div>

            <button
              type="button"
              onClick={addItem}
              className="w-fit rounded-full bg-amber-400 px-5 py-3 text-xs font-bold text-black transition hover:bg-amber-300"
            >
              + Add Menu Item
            </button>
          </div>

          <div className="p-6 sm:p-8">

            {loading ? (
              <div className="py-16 text-center text-sm text-white/30">
                Loading navigation...
              </div>
            ) : (
              <div className="space-y-3">

                {items.map((item, index) => (
                  <div
                    key={`${index}-${item.label}`}
                    className="group rounded-2xl border border-white/[0.07] bg-black/50 p-4 transition hover:border-white/[0.13]"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center">

                      {/* NUMBER */}
                      <div className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.025] text-[10px] font-bold tracking-widest text-white/25 sm:flex">
                        {String(index + 1).padStart(2, "0")}
                      </div>

                      {/* LABEL */}
                      <div className="flex-1">
                        <label className="mb-2 block text-[9px] font-bold uppercase tracking-[0.2em] text-white/30">
                          Label
                        </label>

                        <input
                          value={item.label}
                          onChange={(e) =>
                            updateItem(
                              index,
                              "label",
                              e.target.value
                            )
                          }
                          className="w-full rounded-xl border border-white/[0.08] bg-white/[0.025] px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/20 focus:border-amber-400/40"
                          placeholder="Menu name"
                        />
                      </div>

                      {/* URL */}
                      <div className="flex-1">
                        <label className="mb-2 block text-[9px] font-bold uppercase tracking-[0.2em] text-white/30">
                          Destination
                        </label>

                        <input
                          value={item.url}
                          onChange={(e) =>
                            updateItem(
                              index,
                              "url",
                              e.target.value
                            )
                          }
                          className="w-full rounded-xl border border-white/[0.08] bg-white/[0.025] px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/20 focus:border-amber-400/40"
                          placeholder="/catalog"
                        />
                      </div>

                      {/* CONTROLS */}
                      <div className="flex items-center gap-2 lg:pt-5">

                        <button
                          type="button"
                          onClick={() =>
                            moveItem(index, -1)
                          }
                          disabled={index === 0}
                          className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.07] text-white/40 transition hover:border-white/20 hover:text-white disabled:cursor-not-allowed disabled:opacity-20"
                          title="Move up"
                        >
                          ↑
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            moveItem(index, 1)
                          }
                          disabled={
                            index === items.length - 1
                          }
                          className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.07] text-white/40 transition hover:border-white/20 hover:text-white disabled:cursor-not-allowed disabled:opacity-20"
                          title="Move down"
                        >
                          ↓
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            removeItem(index)
                          }
                          className="flex h-10 w-10 items-center justify-center rounded-xl border border-red-400/10 text-red-400/50 transition hover:border-red-400/30 hover:text-red-400"
                          title="Remove"
                        >
                          ×
                        </button>

                      </div>
                    </div>
                  </div>
                ))}

                {items.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-white/[0.1] px-6 py-14 text-center">
                    <p className="text-sm font-semibold">
                      No navigation items
                    </p>

                    <p className="mt-2 text-xs text-white/30">
                      Add your first menu item above.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* ACTIONS */}
            <div className="mt-8 flex flex-col gap-3 border-t border-white/[0.06] pt-6 sm:flex-row sm:items-center sm:justify-between">

              <button
                type="button"
                onClick={resetNavigation}
                className="w-fit text-[10px] font-bold uppercase tracking-[0.2em] text-white/30 transition hover:text-white"
              >
                Reset Defaults
              </button>

              <button
                type="button"
                onClick={saveNavigation}
                disabled={saving || loading}
                className="rounded-full bg-amber-400 px-7 py-3 text-xs font-bold text-black transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving
                  ? "Saving..."
                  : saved
                  ? "Saved ✓"
                  : "Save Navigation"}
              </button>
            </div>
          </div>
        </section>

        {/* INFO */}
        <section className="mt-8 rounded-[24px] border border-white/[0.06] bg-white/[0.02] p-6">
          <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-amber-400/60">
            How it works
          </p>

          <p className="mt-3 text-sm leading-6 text-white/35">
            Each menu item has a display name and destination.
            Changes are saved to your database so you can update
            your storefront navigation from the Admin without
            touching the website code.
          </p>
        </section>

      </div>
    </main>
  );
}