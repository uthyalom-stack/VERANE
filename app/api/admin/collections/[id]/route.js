"use client";

import { useEffect, useMemo, useState } from "react";

export default function CollectionsPage() {
  const [collections, setCollections] = useState([]);
  const [products, setProducts] = useState([]);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState("");
  const [enabled, setEnabled] = useState(true);

  const [editing, setEditing] = useState(null);
  const [selectedProducts, setSelectedProducts] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);

      const [collectionResponse, productResponse] = await Promise.all([
        fetch("/api/admin/collections"),
        fetch("/api/products"),
      ]);

      const collectionData = await collectionResponse.json();
      const productData = await productResponse.json();

      setCollections(
        Array.isArray(collectionData) ? collectionData : []
      );

      setProducts(
        Array.isArray(productData) ? productData : []
      );
    } catch (error) {
      console.error("Failed to load collections:", error);
      setMessage("Unable to load collections.");
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setName("");
    setDescription("");
    setImage("");
    setEnabled(true);
    setSelectedProducts([]);
    setEditing(null);
    setMessage("");
  }

  function startEditing(collection) {
    setEditing(collection);
    setName(collection.name || "");
    setDescription(collection.description || "");
    setImage(collection.image || "");
    setEnabled(collection.enabled !== false);

    setSelectedProducts(
      collection.products?.map((product) => product.id) || []
    );

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function toggleProduct(productId) {
    setSelectedProducts((current) =>
      current.includes(productId)
        ? current.filter((id) => id !== productId)
        : [...current, productId]
    );
  }

  async function saveCollection() {
    if (!name.trim()) {
      setMessage("Collection name is required.");
      return;
    }

    try {
      setSaving(true);
      setMessage("");

      const payload = {
        name: name.trim(),
        description: description.trim(),
        image: image.trim(),
        enabled,
        products: selectedProducts,
      };

      const url = editing
        ? `/api/admin/collections/${editing.id}`
        : "/api/admin/collections";

      const response = await fetch(url, {
        method: editing ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error || "Failed to save collection."
        );
      }

      setMessage(
        editing
          ? "Collection updated successfully."
          : "Collection created successfully."
      );

      resetForm();
      await loadData();
    } catch (error) {
      console.error("Failed to save collection:", error);
      setMessage(error.message || "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteCollection(id) {
    const confirmed = window.confirm(
      "Delete this collection? This cannot be undone."
    );

    if (!confirmed) return;

    try {
      const response = await fetch(
        `/api/admin/collections/${id}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));

        throw new Error(
          data?.error || "Failed to delete collection."
        );
      }

      setMessage("Collection deleted.");
      await loadData();
    } catch (error) {
      console.error("Failed to delete collection:", error);
      setMessage(error.message || "Failed to delete collection.");
    }
  }

  const totalProducts = useMemo(() => {
    return collections.reduce(
      (total, collection) =>
        total + (collection.products?.length || 0),
      0
    );
  }, [collections]);

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-7xl px-5 pb-24 pt-10 sm:px-8 lg:px-10">

        {/* HEADER */}
        <header className="mb-12">
          <div className="mb-5 flex items-center gap-3">
            <span className="h-px w-10 bg-amber-400" />

            <span className="text-[10px] font-bold uppercase tracking-[0.35em] text-amber-400">
              VÉRANE / COLLECTIONS
            </span>
          </div>

          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-5xl font-semibold tracking-[-0.055em] sm:text-6xl">
                Collections
              </h1>

              <p className="mt-4 max-w-2xl text-sm leading-7 text-white/40 sm:text-base">
                Curate the way your products are presented.
                Build collections for campaigns, seasons, drops
                and special releases.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.08]">
              <div className="bg-white/[0.025] px-5 py-4">
                <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-white/30">
                  Collections
                </p>

                <p className="mt-1 text-xl font-semibold">
                  {collections.length}
                </p>
              </div>

              <div className="bg-white/[0.025] px-5 py-4">
                <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-white/30">
                  Products
                </p>

                <p className="mt-1 text-xl font-semibold">
                  {totalProducts}
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* EDITOR */}
        <section className="mb-12 overflow-hidden rounded-[28px] border border-white/[0.08] bg-white/[0.025]">

          <div className="border-b border-white/[0.06] px-6 py-5 sm:px-8">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-amber-400/80">
                  {editing ? "Edit Collection" : "Create Collection"}
                </p>

                <h2 className="mt-1 text-xl font-semibold">
                  {editing
                    ? `Editing ${editing.name}`
                    : "New collection"}
                </h2>
              </div>

              {editing && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-full border border-white/[0.08] px-4 py-2 text-[10px] font-bold uppercase tracking-[0.15em] text-white/50 transition hover:border-white/20 hover:text-white"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>

          <div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[1fr_320px]">

            <div className="space-y-6">

              {/* NAME */}
              <div>
                <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">
                  Collection Name
                </label>

                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. New Arrivals"
                  className="w-full rounded-2xl border border-white/[0.08] bg-black px-5 py-4 text-sm text-white outline-none transition placeholder:text-white/20 focus:border-amber-400/40"
                />
              </div>

              {/* DESCRIPTION */}
              <div>
                <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">
                  Description
                </label>

                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  placeholder="Describe this collection..."
                  className="w-full resize-none rounded-2xl border border-white/[0.08] bg-black px-5 py-4 text-sm text-white outline-none transition placeholder:text-white/20 focus:border-amber-400/40"
                />
              </div>

              {/* IMAGE */}
              <div>
                <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">
                  Collection Image
                </label>

                <input
                  value={image}
                  onChange={(e) => setImage(e.target.value)}
                  placeholder="Paste image URL"
                  className="w-full rounded-2xl border border-white/[0.08] bg-black px-5 py-4 text-sm text-white outline-none transition placeholder:text-white/20 focus:border-amber-400/40"
                />

                <p className="mt-2 text-[11px] text-white/25">
                  The image is controlled by the collection data.
                  Nothing is hard-coded into the storefront.
                </p>

                {image && (
                  <div className="mt-4 overflow-hidden rounded-2xl border border-white/[0.08] bg-black">
                    <img
                      src={image}
                      alt="Collection preview"
                      className="h-48 w-full object-cover"
                      onError={(event) => {
                        event.currentTarget.style.display = "none";
                      }}
                    />
                  </div>
                )}
              </div>

              {/* STATUS */}
              <div className="flex items-center justify-between rounded-2xl border border-white/[0.07] bg-black/50 px-5 py-4">
                <div>
                  <p className="text-sm font-semibold">
                    Collection visibility
                  </p>

                  <p className="mt-1 text-xs text-white/30">
                    Control whether this collection is active.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setEnabled((value) => !value)}
                  className={`relative h-7 w-12 rounded-full transition ${
                    enabled
                      ? "bg-amber-400"
                      : "bg-white/10"
                  }`}
                  aria-label="Toggle collection visibility"
                >
                  <span
                    className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-all ${
                      enabled
                        ? "left-6"
                        : "left-1"
                    }`}
                  />
                </button>
              </div>

              {/* MESSAGE */}
              {message && (
                <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] px-5 py-4 text-sm text-white/60">
                  {message}
                </div>
              )}

              {/* SAVE */}
              <button
                type="button"
                onClick={saveCollection}
                disabled={saving}
                className="w-full rounded-full bg-amber-400 px-6 py-4 text-xs font-bold uppercase tracking-[0.15em] text-black transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving
                  ? "Saving..."
                  : editing
                  ? "Update Collection"
                  : "Create Collection"}
              </button>
            </div>

            {/* PRODUCTS */}
            <div className="rounded-2xl border border-white/[0.07] bg-black/50 p-5">
              <div className="mb-5">
                <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-amber-400/70">
                  Products
                </p>

                <h3 className="mt-1 font-semibold">
                  Assign products
                </h3>

                <p className="mt-1 text-xs leading-5 text-white/25">
                  Select the products that belong to this collection.
                </p>
              </div>

              <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
                {products.length === 0 ? (
                  <p className="py-8 text-center text-xs text-white/25">
                    No products available yet.
                  </p>
                ) : (
                  products.map((product) => {
                    const selected =
                      selectedProducts.includes(product.id);

                    return (
                      <button
                        key={product.id}
                        type="button"
                        onClick={() =>
                          toggleProduct(product.id)
                        }
                        className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition ${
                          selected
                            ? "border-amber-400/30 bg-amber-400/[0.06]"
                            : "border-white/[0.06] bg-white/[0.02] hover:border-white/10"
                        }`}
                      >
                        <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-white/10">
                          {selected && (
                            <span className="text-xs text-amber-400">
                              ✓
                            </span>
                          )}
                        </div>

                        <div className="min-w-0">
                          <p className="truncate text-xs font-semibold">
                            {product.name}
                          </p>

                          <p className="mt-0.5 truncate text-[10px] text-white/25">
                            {product.brand || "VÉRANE"}
                          </p>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>

              <div className="mt-4 border-t border-white/[0.06] pt-4">
                <p className="text-[10px] uppercase tracking-[0.15em] text-white/25">
                  {selectedProducts.length} selected
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* COLLECTION LIST */}
        <section>
          <div className="mb-6 flex items-end justify-between">
            <div>
              <p className="mb-2 text-[9px] font-bold uppercase tracking-[0.3em] text-amber-400/70">
                Library
              </p>

              <h2 className="text-2xl font-semibold tracking-tight">
                Your collections
              </h2>
            </div>

            <span className="hidden text-[10px] uppercase tracking-[0.2em] text-white/20 sm:block">
              {collections.length} collections
            </span>
          </div>

          {loading ? (
            <div className="rounded-[24px] border border-white/[0.08] bg-white/[0.025] p-12 text-center">
              <p className="text-sm text-white/30">
                Loading collections...
              </p>
            </div>
          ) : collections.length === 0 ? (
            <div className="rounded-[24px] border border-dashed border-white/[0.1] bg-white/[0.02] p-14 text-center">
              <p className="text-lg font-semibold">
                No collections yet
              </p>

              <p className="mt-2 text-sm text-white/30">
                Create your first collection above.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">

              {collections.map((collection) => (
                <article
                  key={collection.id}
                  className="group overflow-hidden rounded-[24px] border border-white/[0.08] bg-white/[0.025] transition hover:border-white/[0.14]"
                >
                  {/* IMAGE */}
                  <div className="relative h-48 overflow-hidden bg-black">
                    {collection.image ? (
                      <img
                        src={collection.image}
                        alt={collection.name}
                        className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/15">
                          No Image
                        </span>
                      </div>
                    )}

                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

                    <div className="absolute left-5 top-5">
                      <span
                        className={`rounded-full border px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.15em] ${
                          collection.enabled
                            ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
                            : "border-white/10 bg-black/40 text-white/30"
                        }`}
                      >
                        {collection.enabled
                          ? "Published"
                          : "Hidden"}
                      </span>
                    </div>
                  </div>

                  {/* CONTENT */}
                  <div className="p-6">
                    <div className="flex items-start justify-between gap-5">
                      <div className="min-w-0">
                        <h3 className="text-xl font-semibold tracking-tight">
                          {collection.name}
                        </h3>

                        <p className="mt-2 line-clamp-2 text-sm leading-6 text-white/35">
                          {collection.description ||
                            "No description added."}
                        </p>
                      </div>

                      <span className="shrink-0 text-[10px] font-medium uppercase tracking-[0.15em] text-white/20">
                        {collection.products?.length || 0} items
                      </span>
                    </div>

                    <div className="mt-6 flex items-center justify-between border-t border-white/[0.06] pt-4">
                      <button
                        type="button"
                        onClick={() =>
                          startEditing(collection)
                        }
                        className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40 transition hover:text-amber-400"
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          deleteCollection(collection.id)
                        }
                        className="text-[10px] font-bold uppercase tracking-[0.2em] text-red-400/50 transition hover:text-red-400"
                      >
                        Delete
                      </button>
                    </div>
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