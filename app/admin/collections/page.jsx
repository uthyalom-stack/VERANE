"use client";

import { useEffect, useState } from "react";

export default function CollectionsPage() {
  const [collections, setCollections] = useState([]);
  const [products, setProducts] = useState([]);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState("");
  const [enabled, setEnabled] = useState(true);
  const [selectedProducts, setSelectedProducts] = useState([]);

  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);

      const [collectionsResponse, productsResponse] =
        await Promise.all([
          fetch("/api/admin/collections", {
            cache: "no-store",
          }),
          fetch("/api/admin/products", {
            cache: "no-store",
          }),
        ]);

      const collectionsData =
        await collectionsResponse.json();

      const productsData =
        await productsResponse.json();

      setCollections(
        Array.isArray(collectionsData)
          ? collectionsData
          : []
      );

      setProducts(
        Array.isArray(productsData)
          ? productsData
          : []
      );
    } catch (error) {
      console.error(
        "Failed to load collections:",
        error
      );

      setMessage(
        "Failed to load collections."
      );
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
    setEditingId(null);
    setMessage("");
  }

  function startEditing(collection) {
    setEditingId(collection.id);
    setName(collection.name || "");
    setDescription(
      collection.description || ""
    );
    setImage(collection.image || "");
    setEnabled(collection.enabled !== false);

    setSelectedProducts(
      collection.products?.map(
        (product) => product.id
      ) || []
    );

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function toggleProduct(productId) {
    setSelectedProducts((current) => {
      if (current.includes(productId)) {
        return current.filter(
          (id) => id !== productId
        );
      }

      return [...current, productId];
    });
  }

  async function handleImageUpload(event) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    try {
      setUploadingImage(true);
      setMessage("");

      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(
        "/api/admin/upload",
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok || !data?.success) {
        throw new Error(
          data?.error ||
            "Failed to upload image."
        );
      }

      setImage(data.url);

      setMessage(
        "Collection image uploaded successfully."
      );
    } catch (error) {
      console.error(
        "Collection image upload failed:",
        error
      );

      setMessage(
        error?.message ||
          "Failed to upload image."
      );
    } finally {
      setUploadingImage(false);

      event.target.value = "";
    }
  }

  async function saveCollection() {
    if (!name.trim()) {
      setMessage(
        "Collection name is required."
      );
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

      const url = editingId
        ? `/api/admin/collections/${editingId}`
        : "/api/admin/collections";

      const method = editingId
        ? "PUT"
        : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Failed to save collection."
        );
      }

      await loadData();

      const wasEditing = Boolean(editingId);

      resetForm();

      setMessage(
        wasEditing
          ? "Collection updated successfully."
          : "Collection created successfully."
      );
    } catch (error) {
      console.error(
        "Failed to save collection:",
        error
      );

      setMessage(
        error?.message ||
          "Something went wrong."
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteCollection(id) {
    if (!confirm("Delete this collection?")) {
      return;
    }

    try {
      setDeletingId(id);

      const response = await fetch(
        `/api/admin/collections/${id}`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Failed to delete collection."
        );
      }

      if (editingId === id) {
        resetForm();
      }

      await loadData();

      setMessage(
        "Collection deleted."
      );
    } catch (error) {
      console.error(
        "Failed to delete collection:",
        error
      );

      setMessage(
        error?.message ||
          "Failed to delete collection."
      );
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8 lg:px-10">

        {/* HEADER */}
        <header className="mb-10">
          <div className="mb-5 flex items-center gap-3">
            <span className="h-px w-10 bg-amber-400" />

            <span className="text-[10px] font-bold uppercase tracking-[0.35em] text-amber-400">
              VÉRANE / COLLECTIONS
            </span>
          </div>

          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">
                Collections
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-7 text-white/40">
                Build curated collections and decide
                exactly which products belong to each one.
              </p>
            </div>

            <div className="rounded-full border border-white/[0.08] bg-white/[0.025] px-5 py-3 text-xs text-white/40">
              {collections.length}{" "}
              {collections.length === 1
                ? "collection"
                : "collections"}
            </div>
          </div>
        </header>

        {/* MESSAGE */}
        {message && (
          <div className="mb-6 rounded-2xl border border-amber-400/20 bg-amber-400/[0.05] px-5 py-4 text-sm text-amber-300">
            {message}
          </div>
        )}

        {/* FORM */}
        <section className="mb-12 overflow-hidden rounded-[28px] border border-white/[0.08] bg-white/[0.025]">

          <div className="border-b border-white/[0.06] px-6 py-5 sm:px-8">
            <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-amber-400/70">
              {editingId
                ? "Edit Collection"
                : "Create Collection"}
            </p>

            <h2 className="mt-2 text-xl font-semibold tracking-tight">
              {editingId
                ? "Update your collection"
                : "Create a curated collection"}
            </h2>
          </div>

          <div className="space-y-6 p-6 sm:p-8">

            {/* NAME */}
            <div>
              <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">
                Collection Name
              </label>

              <input
                value={name}
                onChange={(e) =>
                  setName(e.target.value)
                }
                placeholder="New Arrivals"
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
                onChange={(e) =>
                  setDescription(e.target.value)
                }
                placeholder="A curated selection of our latest pieces."
                rows={4}
                className="w-full resize-none rounded-2xl border border-white/[0.08] bg-black px-5 py-4 text-sm text-white outline-none transition placeholder:text-white/20 focus:border-amber-400/40"
              />
            </div>

            {/* IMAGE */}
            <div>
              <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">
                Collection Image
              </label>

              <div className="flex flex-col gap-3 sm:flex-row">
                <label
                  className={`inline-flex cursor-pointer items-center justify-center rounded-2xl border px-5 py-4 text-sm font-bold transition ${
                    uploadingImage
                      ? "cursor-not-allowed border-white/10 bg-white/5 text-white/30"
                      : "border-white/[0.08] bg-black text-white hover:border-amber-400/40 hover:bg-white/[0.03]"
                  }`}
                >
                  {uploadingImage
                    ? "Uploading..."
                    : image
                    ? "Choose Another Image"
                    : "Choose Image From Device"}

                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
                    onChange={handleImageUpload}
                    disabled={uploadingImage}
                    className="hidden"
                  />
                </label>

                {image && (
                  <div className="flex items-center rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.05] px-5 py-4 text-xs text-emerald-400">
                    Image uploaded
                  </div>
                )}
              </div>

              <p className="mt-2 text-xs text-white/25">
                Choose an image directly from your computer.
                It will be uploaded to VÉRANE storage automatically.
              </p>

              {image && (
                <div className="mt-4 overflow-hidden rounded-2xl border border-white/[0.08] bg-black">
                  <img
                    src={image}
                    alt={
                      name ||
                      "Collection preview"
                    }
                    className="h-48 w-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display =
                        "none";
                    }}
                  />
                </div>
              )}
            </div>

            {/* ENABLED */}
            <div className="flex items-center justify-between rounded-2xl border border-white/[0.07] bg-black/50 px-5 py-4">
              <div>
                <p className="text-sm font-semibold">
                  Collection visible
                </p>

                <p className="mt-1 text-xs text-white/30">
                  Disabled collections can remain saved
                  without appearing publicly.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setEnabled(!enabled)
                }
                className={`relative h-7 w-12 rounded-full transition ${
                  enabled
                    ? "bg-amber-400"
                    : "bg-white/10"
                }`}
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

            {/* PRODUCTS */}
            <div>
              <div className="mb-4 flex items-end justify-between">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">
                    Products
                  </label>

                  <p className="mt-1 text-xs text-white/25">
                    Select the products that belong to this
                    collection.
                  </p>
                </div>

                <span className="text-xs text-amber-400">
                  {selectedProducts.length} selected
                </span>
              </div>

              {products.length === 0 ? (
                <div className="rounded-2xl border border-white/[0.07] bg-black/50 px-5 py-8 text-center text-sm text-white/30">
                  No products available yet.
                </div>
              ) : (
                <div className="grid max-h-[420px] gap-3 overflow-y-auto pr-1 sm:grid-cols-2 lg:grid-cols-3">
                  {products.map((product) => {
                    const selected =
                      selectedProducts.includes(
                        product.id
                      );

                    return (
                      <button
                        type="button"
                        key={product.id}
                        onClick={() =>
                          toggleProduct(
                            product.id
                          )
                        }
                        className={`group flex items-center gap-3 rounded-2xl border p-3 text-left transition ${
                          selected
                            ? "border-amber-400/40 bg-amber-400/[0.07]"
                            : "border-white/[0.07] bg-black/40 hover:border-white/15"
                        }`}
                      >
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white/[0.05]">
                          {product.images ? (
                            <img
                              src={
                                product.images.split(
                                  ","
                                )[0]
                              }
                              alt={product.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <span className="text-xs text-white/20">
                              —
                            </span>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-white">
                            {product.name}
                          </p>

                          <p className="mt-1 text-xs text-white/30">
                            {product.brand}
                          </p>
                        </div>

                        <div
                          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] ${
                            selected
                              ? "border-amber-400 bg-amber-400 text-black"
                              : "border-white/15 text-transparent"
                          }`}
                        >
                          ✓
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ACTIONS */}
            <div className="flex flex-col gap-3 border-t border-white/[0.06] pt-6 sm:flex-row sm:justify-end">
              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-full border border-white/[0.08] px-6 py-3 text-xs font-bold text-white/60 transition hover:border-white/20 hover:text-white"
                >
                  Cancel
                </button>
              )}

              <button
                type="button"
                onClick={saveCollection}
                disabled={
                  saving ||
                  uploadingImage
                }
                className="rounded-full bg-amber-400 px-7 py-3 text-xs font-bold text-black transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving
                  ? "Saving..."
                  : editingId
                  ? "Save Changes"
                  : "Create Collection"}
              </button>
            </div>
          </div>
        </section>

        {/* COLLECTION LIST */}
        <section>
          <div className="mb-6 flex items-end justify-between">
            <div>
              <p className="mb-2 text-[9px] font-bold uppercase tracking-[0.3em] text-amber-400/70">
                Your Collections
              </p>

              <h2 className="text-2xl font-semibold tracking-tight">
                Manage collections
              </h2>
            </div>
          </div>

          {loading ? (
            <div className="rounded-[28px] border border-white/[0.08] bg-white/[0.025] px-6 py-16 text-center text-sm text-white/30">
              Loading collections...
            </div>
          ) : collections.length === 0 ? (
            <div className="rounded-[28px] border border-dashed border-white/[0.1] bg-white/[0.015] px-6 py-16 text-center">
              <p className="text-lg font-semibold">
                No collections yet
              </p>

              <p className="mt-2 text-sm text-white/30">
                Create your first curated collection above.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {collections.map(
                (collection) => (
                  <article
                    key={collection.id}
                    className="group overflow-hidden rounded-[26px] border border-white/[0.08] bg-white/[0.025] transition hover:border-white/[0.14]"
                  >
                    <div className="flex">

                      {/* IMAGE */}
                      <div className="hidden h-auto w-32 shrink-0 bg-black sm:block">
                        {collection.image ? (
                          <img
                            src={
                              collection.image
                            }
                            alt={
                              collection.name
                            }
                            className="h-full min-h-[190px] w-full object-cover opacity-80 transition group-hover:opacity-100"
                          />
                        ) : (
                          <div className="flex h-full min-h-[190px] items-center justify-center text-white/10">
                            V
                          </div>
                        )}
                      </div>

                      {/* CONTENT */}
                      <div className="flex min-w-0 flex-1 flex-col p-6">
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <div className="mb-2 flex items-center gap-2">
                              <span
                                className={`h-1.5 w-1.5 rounded-full ${
                                  collection.enabled
                                    ? "bg-emerald-400"
                                    : "bg-white/20"
                                }`}
                              />

                              <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/30">
                                {collection.enabled
                                  ? "Published"
                                  : "Hidden"}
                              </span>
                            </div>

                            <h3 className="truncate text-xl font-semibold tracking-tight">
                              {collection.name}
                            </h3>
                          </div>

                          <span className="shrink-0 text-[10px] text-white/20">
                            {collection.products
                              ?.length || 0}{" "}
                            products
                          </span>
                        </div>

                        <p className="mt-3 line-clamp-2 text-sm leading-6 text-white/35">
                          {collection.description ||
                            "No description added."}
                        </p>

                        {/* PRODUCT PREVIEW */}
                        {collection.products
                          ?.length > 0 && (
                          <div className="mt-5 flex -space-x-2">
                            {collection.products
                              .slice(0, 5)
                              .map(
                                (product) => (
                                  <div
                                    key={
                                      product.id
                                    }
                                    className="h-9 w-9 overflow-hidden rounded-full border-2 border-black bg-white/[0.08]"
                                  >
                                    {product.images ? (
                                      <img
                                        src={
                                          product.images.split(
                                            ","
                                          )[0]
                                        }
                                        alt=""
                                        className="h-full w-full object-cover"
                                      />
                                    ) : null}
                                  </div>
                                )
                              )}

                            {collection.products
                              .length > 5 && (
                              <div className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-black bg-white/10 text-[9px] text-white/50">
                                +
                                {collection
                                  .products
                                  .length -
                                  5}
                              </div>
                            )}
                          </div>
                        )}

                        {/* ACTIONS */}
                        <div className="mt-6 flex items-center justify-between border-t border-white/[0.06] pt-4">
                          <button
                            type="button"
                            onClick={() =>
                              startEditing(
                                collection
                              )
                            }
                            className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40 transition hover:text-amber-400"
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              deleteCollection(
                                collection.id
                              )
                            }
                            disabled={
                              deletingId ===
                              collection.id
                            }
                            className="text-[10px] font-bold uppercase tracking-[0.2em] text-red-400/60 transition hover:text-red-400 disabled:opacity-40"
                          >
                            {deletingId ===
                            collection.id
                              ? "Deleting..."
                              : "Delete"}
                          </button>
                        </div>
                      </div>
                    </div>
                  </article>
                )
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}