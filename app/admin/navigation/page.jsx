"use client";

import { useEffect, useState } from "react";

const DEFAULT_NAV_ITEMS = [
  {
    label: "Shop",
    href: "/catalog",
  },
  {
    label: "UTHY LUXURY",
    href: "/catalog?brand=UTHY_LUXURY",
  },
  {
    label: "ALOMZIEE",
    href: "/catalog?brand=ALOMZIEE_FOOTIES",
  },
  {
    label: "Outfit Builder",
    href: "/outfit-builder",
  },
];

export default function NavigationPage() {
  const [settings, setSettings] = useState({});
  const [navItems, setNavItems] = useState([]);

  const [editingIndex, setEditingIndex] =
    useState(null);

  const [editLabel, setEditLabel] = useState("");
  const [editHref, setEditHref] = useState("");

  const [newLabel, setNewLabel] = useState("");
  const [newHref, setNewHref] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadNavigation();
  }, []);

  async function loadNavigation() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        "/api/admin/settings",
        {
          cache: "no-store",
        }
      );

      if (!response.ok) {
        throw new Error(
          "Failed to load navigation settings."
        );
      }

      const data = await response.json();

      setSettings(data || {});

      if (
        data?.navItems &&
        typeof data.navItems === "string"
      ) {
        const items = data.navItems
          .split("\n")
          .map((line) => {
            const separatorIndex =
              line.indexOf(":");

            if (separatorIndex === -1) {
              return null;
            }

            const label = line
              .slice(0, separatorIndex)
              .trim();

            const href = line
              .slice(separatorIndex + 1)
              .trim();

            if (!label || !href) {
              return null;
            }

            return {
              label,
              href,
            };
          })
          .filter(Boolean);

        setNavItems(
          items.length > 0
            ? items
            : DEFAULT_NAV_ITEMS
        );
      } else {
        setNavItems(DEFAULT_NAV_ITEMS);
      }
    } catch (err) {
      console.error(
        "Failed to load navigation:",
        err
      );

      setError(
        "Could not load navigation settings."
      );

      setNavItems(DEFAULT_NAV_ITEMS);
    } finally {
      setLoading(false);
    }
  }

  async function save() {
    if (saving) return;

    try {
      setSaving(true);
      setError("");

      const navString = navItems
        .map(
          (item) =>
            `${item.label}:${item.href}`
        )
        .join("\n");

      const response = await fetch(
        "/api/admin/settings",
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...settings,
            navItems: navString,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(
          "Failed to save navigation."
        );
      }

      const data = await response.json();

      if (data && typeof data === "object") {
        setSettings(data);
      }

      setSaved(true);

      setTimeout(() => {
        setSaved(false);
      }, 3000);
    } catch (err) {
      console.error(
        "Failed to save navigation:",
        err
      );

      setError(
        "Could not save navigation."
      );
    } finally {
      setSaving(false);
    }
  }

  function addItem() {
    const label = newLabel.trim();
    const href = newHref.trim();

    if (!label || !href) {
      setError(
        "Please enter both a label and URL."
      );
      return;
    }

    setNavItems((current) => [
      ...current,
      {
        label,
        href,
      },
    ]);

    setNewLabel("");
    setNewHref("");
    setError("");
  }

  function editItem(index) {
    const item = navItems[index];

    if (!item) return;

    setEditingIndex(index);
    setEditLabel(item.label);
    setEditHref(item.href);
    setError("");
  }

  function cancelEdit() {
    setEditingIndex(null);
    setEditLabel("");
    setEditHref("");
  }

  function saveEdit() {
    const label = editLabel.trim();
    const href = editHref.trim();

    if (!label || !href) {
      setError(
        "Please enter both a label and URL."
      );
      return;
    }

    setNavItems((current) =>
      current.map((item, index) =>
        index === editingIndex
          ? {
              label,
              href,
            }
          : item
      )
    );

    cancelEdit();
    setError("");
  }

  function deleteItem(index) {
    const item = navItems[index];

    if (!item) return;

    const confirmed = window.confirm(
      `Delete "${item.label}" from the navigation?`
    );

    if (!confirmed) return;

    setNavItems((current) =>
      current.filter(
        (_, currentIndex) =>
          currentIndex !== index
      )
    );

    if (editingIndex === index) {
      cancelEdit();
    }
  }

  function moveItem(index, direction) {
    const newIndex = index + direction;

    if (
      newIndex < 0 ||
      newIndex >= navItems.length
    ) {
      return;
    }

    const newItems = [...navItems];

    [
      newItems[index],
      newItems[newIndex],
    ] = [
      newItems[newIndex],
      newItems[index],
    ];

    setNavItems(newItems);
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black text-white">
        <p className="text-neutral-500">
          Loading navigation...
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white">

      <div className="mx-auto max-w-4xl px-5 py-10 sm:px-8">

        {/* HEADER */}
        <div className="mb-8">

          <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-amber-400">
            Site Management
          </p>

          <h1 className="mt-2 text-4xl font-black tracking-[-0.04em]">
            Navigation
          </h1>

          <p className="mt-2 text-sm text-neutral-500">
            Manage the links displayed in your
            website navigation.
          </p>

        </div>

        {/* ERROR */}
        {error && (
          <div className="mb-6 rounded-2xl border border-red-500/20 bg-red-500/5 px-5 py-4 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* NAVIGATION ITEMS */}
        <div className="mb-8 space-y-3">

          {navItems.length === 0 ? (

            <div className="rounded-3xl border border-white/10 bg-neutral-950 py-20 text-center">

              <p className="font-semibold">
                No navigation items.
              </p>

              <p className="mt-2 text-sm text-neutral-600">
                Add your first menu item below.
              </p>

            </div>

          ) : (

            navItems.map((item, index) => (

              <div
                key={`${item.href}-${index}`}
                className="rounded-2xl border border-white/10 bg-neutral-950 p-4 transition hover:border-white/[0.15]"
              >

                {editingIndex === index ? (

                  /* EDIT MODE */
                  <div className="space-y-4">

                    <div>
                      <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-amber-400">
                        Editing Menu Item
                      </p>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">

                      <input
                        value={editLabel}
                        onChange={(event) =>
                          setEditLabel(
                            event.target.value
                          )
                        }
                        className="w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-sm outline-none transition focus:border-amber-400/40"
                        placeholder="Label"
                      />

                      <input
                        value={editHref}
                        onChange={(event) =>
                          setEditHref(
                            event.target.value
                          )
                        }
                        className="w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-sm outline-none transition focus:border-amber-400/40"
                        placeholder="/catalog"
                      />

                    </div>

                    <div className="flex gap-2">

                      <button
                        type="button"
                        onClick={saveEdit}
                        className="rounded-full bg-amber-500 px-5 py-2.5 text-xs font-bold text-black transition hover:bg-amber-400"
                      >
                        Save Changes
                      </button>

                      <button
                        type="button"
                        onClick={cancelEdit}
                        className="rounded-full border border-white/10 px-5 py-2.5 text-xs font-bold text-neutral-400 transition hover:bg-white/[0.04] hover:text-white"
                      >
                        Cancel
                      </button>

                    </div>

                  </div>

                ) : (

                  /* NORMAL MODE */
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

                    <div className="min-w-0 flex-1">

                      <p className="font-bold">
                        {item.label}
                      </p>

                      <p className="mt-1 break-all text-xs text-neutral-500">
                        {item.href}
                      </p>

                    </div>

                    <div className="flex shrink-0 items-center gap-2">

                      <button
                        type="button"
                        onClick={() =>
                          moveItem(
                            index,
                            -1
                          )
                        }
                        disabled={index === 0}
                        aria-label="Move item up"
                        className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-neutral-400 transition hover:bg-white/[0.04] disabled:cursor-not-allowed disabled:opacity-30"
                      >
                        ↑
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          moveItem(
                            index,
                            1
                          )
                        }
                        disabled={
                          index ===
                          navItems.length - 1
                        }
                        aria-label="Move item down"
                        className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-neutral-400 transition hover:bg-white/[0.04] disabled:cursor-not-allowed disabled:opacity-30"
                      >
                        ↓
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          editItem(index)
                        }
                        className="rounded-lg px-3 py-1.5 text-xs font-semibold text-blue-400 transition hover:bg-blue-400/10"
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          deleteItem(index)
                        }
                        className="rounded-lg px-3 py-1.5 text-xs font-semibold text-red-400 transition hover:bg-red-400/10"
                      >
                        Delete
                      </button>

                    </div>

                  </div>

                )}

              </div>

            ))

          )}

        </div>

        {/* ADD MENU ITEM */}
        <div className="mb-8 rounded-3xl border border-white/10 bg-neutral-950 p-6">

          <div className="mb-5">

            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-neutral-600">
              Navigation
            </p>

            <h2 className="mt-1 text-lg font-bold">
              Add Menu Item
            </h2>

          </div>

          <div className="grid gap-3 md:grid-cols-2">

            <input
              value={newLabel}
              onChange={(event) =>
                setNewLabel(
                  event.target.value
                )
              }
              onKeyDown={(event) => {
                if (
                  event.key === "Enter"
                ) {
                  addItem();
                }
              }}
              className="w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-sm outline-none transition focus:border-amber-400/40"
              placeholder="Label"
            />

            <input
              value={newHref}
              onChange={(event) =>
                setNewHref(
                  event.target.value
                )
              }
              onKeyDown={(event) => {
                if (
                  event.key === "Enter"
                ) {
                  addItem();
                }
              }}
              className="w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-sm outline-none transition focus:border-amber-400/40"
              placeholder="URL (e.g. /about)"
            />

          </div>

          <button
            type="button"
            onClick={addItem}
            className="mt-4 w-full rounded-xl bg-white px-5 py-3 text-sm font-bold text-black transition hover:bg-neutral-200"
          >
            + Add Menu Item
          </button>

        </div>

        {/* SAVE */}
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="w-full rounded-full bg-amber-500 px-6 py-4 font-bold text-black transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving
            ? "Saving..."
            : saved
              ? "Saved ✓"
              : "Save Navigation"}
        </button>

      </div>

    </main>
  );
}