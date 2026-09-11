"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function CategoriesPage() {
  const router = useRouter();

  const [categories, setCategories] = useState([]);

  const [name, setName] = useState("");
 const [description, setDescription] = useState("");
const [sizeType, setSizeType] = useState("none");
const [enabled, setEnabled] = useState(true);

  const [editing, setEditing] = useState(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function loadCategories() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/admin/categories", {
        cache: "no-store",
        credentials: "include",
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          data?.error || "Unable to load categories."
        );
      }

      setCategories(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Categories loading error:", err);

      setError(
        err?.message || "Unable to load categories."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCategories();
  }, []);

  function resetForm() {
    setName("");
    setDescription("");
setSizeType("none");
setEnabled(true);
    setEditing(null);
    setError("");
    setMessage("");
  }

  function startEditing(category) {
    setEditing(category);
    setName(category.name || "");
    setDescription(category.description || "");
setSizeType(category.sizeType || "none");
setEnabled(category.enabled !== false);
    setError("");
    setMessage("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function saveCategory() {
    if (!name.trim()) {
      setError("Category name is required.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setMessage("");

      const url = editing
        ? `/api/admin/categories/${editing.id}`
        : "/api/admin/categories";

      const response = await fetch(url, {
        method: editing ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
  name: name.trim(),
  description: description.trim(),
  sizeType,
  enabled,
}),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Failed to save category."
        );
      }

      setMessage(
        editing
          ? "Category updated successfully."
          : "Category created successfully."
      );

      resetForm();
      await loadCategories();
    } catch (err) {
      console.error("Category save error:", err);

      setError(
        err?.message || "Failed to save category."
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteCategory(id) {
    const confirmed = window.confirm(
      "Delete this category? Products using it will keep their existing category value, but the category will no longer be available for new products."
    );

    if (!confirmed) return;

    try {
      setError("");
      setMessage("");

      const response = await fetch(
        `/api/admin/categories/${id}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Failed to delete category."
        );
      }

      if (editing?.id === id) {
        resetForm();
      }

      setMessage("Category deleted.");
      await loadCategories();
    } catch (err) {
      console.error("Category delete error:", err);

      setError(
        err?.message || "Failed to delete category."
      );
    }
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <button
          type="button"
          onClick={() => router.push("/admin")}
          className="mb-6 text-xs text-neutral-500 transition hover:text-white"
        >
          ← Control Center
        </button>

        <header className="mb-10">
          <p className="text-[10px] uppercase tracking-[0.35em] text-amber-400">
            STORE ADMIN
          </p>

          <h1 className="mt-2 text-4xl font-black md:text-5xl">
            Categories
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-neutral-500">
            Create as many store categories as you need and
            control their visibility.
          </p>
        </header>

        {error && (
          <div className="mb-6 rounded-2xl border border-red-500/20 bg-red-500/5 px-5 py-4 text-sm text-red-300">
            {error}
          </div>
        )}

        {message && (
          <div className="mb-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 px-5 py-4 text-sm text-emerald-300">
            {message}
          </div>
        )}

        <section className="mb-10 rounded-3xl border border-white/10 bg-white/[0.025] p-6 md:p-8">
          <div className="mb-7 flex items-start justify-between gap-5">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-amber-400">
                {editing
                  ? "Edit Category"
                  : "New Category"}
              </p>

              <h2 className="mt-1 text-2xl font-black">
                {editing
                  ? editing.name
                  : "Add a category"}
              </h2>
            </div>

            {editing && (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-full border border-white/10 px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-neutral-500 transition hover:border-white/20 hover:text-white"
              >
                Cancel
              </button>
            )}
          </div>

          <div className="space-y-5">
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-neutral-400">
                Category Name
              </label>

              <input
                value={name}
                onChange={(event) => {
                  setName(event.target.value);
                  setError("");
                }}
                placeholder="e.g. Jackets"
                className="w-full rounded-2xl border border-white/10 bg-black px-5 py-4 text-white outline-none transition placeholder:text-neutral-700 focus:border-amber-500/60"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-neutral-400">
                Description
              </label>

              <textarea
                value={description}
                onChange={(event) =>
                  setDescription(event.target.value)
                }
                rows={4}
                placeholder="Describe this category..."
                className="w-full resize-none rounded-2xl border border-white/10 bg-black px-5 py-4 text-white outline-none transition placeholder:text-neutral-700 focus:border-amber-500/60"
              />
            </div>

<div>
  <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-neutral-400">
    Size System
  </label>

  <select
    value={sizeType}
    onChange={(event) =>
      setSizeType(event.target.value)
    }
    className="w-full rounded-2xl border border-white/10 bg-black px-5 py-4 text-white outline-none transition focus:border-amber-500/60"
  >
    <option value="none">
      No sizing
    </option>

    <option value="clothing">
      Clothing — S, M, L, XL, XXL
    </option>

    <option value="footwear">
      Footwear — Numeric sizes
    </option>

    <option value="waist">
      Waist — Numeric sizes
    </option>
  </select>

  <p className="mt-2 text-xs text-neutral-600">
    This determines which sizing system appears when
    creating products in this category.
  </p>
</div>

            <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-black px-5 py-4">
              <div>
                <p className="text-sm font-semibold">
                  Category enabled
                </p>

                <p className="mt-1 text-xs text-neutral-600">
                  Disabled categories won't appear when
                  creating new products.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setEnabled((current) => !current)
                }
                className={`relative h-7 w-12 rounded-full transition ${
                  enabled
                    ? "bg-amber-400"
                    : "bg-white/10"
                }`}
                aria-label="Toggle category"
              >
                <span
                  className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-all ${
                    enabled ? "left-6" : "left-1"
                  }`}
                />
              </button>
            </div>

            <button
              type="button"
              onClick={saveCategory}
              disabled={saving}
              className="w-full rounded-full bg-amber-500 px-6 py-4 text-sm font-black text-black transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving
                ? "Saving..."
                : editing
                ? "Update Category"
                : "Create Category"}
            </button>
          </div>
        </section>

        <section>
          <div className="mb-6 flex items-end justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-amber-400">
                Library
              </p>

              <h2 className="mt-1 text-2xl font-black">
                Your Categories
              </h2>
            </div>

            <span className="text-xs text-neutral-600">
              {categories.length} categories
            </span>
          </div>

          {loading ? (
            <div className="rounded-3xl border border-white/10 p-12 text-center text-sm text-neutral-500">
              Loading categories...
            </div>
          ) : categories.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-white/10 p-12 text-center">
              <h3 className="text-lg font-black">
                No categories yet
              </h3>

              <p className="mt-2 text-sm text-neutral-600">
                Create your first category above.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {categories.map((category) => (
                <article
                  key={category.id}
                  className="rounded-2xl border border-white/10 bg-white/[0.025] p-5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h3 className="font-black">
                        {category.name}
                      </h3>

                      <p className="mt-1 text-[10px] uppercase tracking-wider text-neutral-600">
                        {category.slug}
                      </p>
                    </div>

                    <span
                      className={`shrink-0 rounded-full border px-3 py-1 text-[9px] font-bold uppercase tracking-wider ${
                        category.enabled
                          ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
                          : "border-white/10 bg-white/5 text-neutral-600"
                      }`}
                    >
                      {category.enabled
                        ? "Active"
                        : "Disabled"}
                    </span>
                  </div>

                  <p className="mt-4 min-h-[48px] text-sm leading-6 text-neutral-500">
                    {category.description ||
                      "No description added."}
                  </p>

                  <div className="mt-5 grid grid-cols-2 gap-2 border-t border-white/10 pt-4">
                    <button
                      type="button"
                      onClick={() =>
                        startEditing(category)
                      }
                      className="rounded-xl border border-white/10 py-3 text-xs font-bold transition hover:bg-white/5"
                    >
                      Edit
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        deleteCategory(category.id)
                      }
                      className="rounded-xl border border-red-500/20 py-3 text-xs font-bold text-red-400 transition hover:bg-red-500/5"
                    >
                      Delete
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}