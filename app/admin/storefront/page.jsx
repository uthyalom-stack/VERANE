"use client";

import { useEffect, useState } from "react";

function createSection() {
  return {
    id: `${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}`,
    title: "New Section",
    description: "",
    enabled: true,
    productIds: [],
    sortOrder: 0,
  };
}

function getImage(images) {
  if (!images) return "";

  try {
    const parsed = JSON.parse(images);

    if (Array.isArray(parsed)) {
      return parsed[0] || "";
    }

    if (typeof parsed === "string") {
      return parsed;
    }
  } catch {
    return String(images)
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)[0] || "";
  }

  return "";
}

function formatPrice(price) {
  return `₦${Number(price || 0).toLocaleString("en-NG")}`;
}

export default function StorefrontAdminPage() {
  const [brand, setBrand] = useState("");
  const [sections, setSections] = useState([]);
  const [products, setProducts] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    loadStorefront();
  }, []);

  async function loadStorefront() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        "/api/admin/storefront",
        {
          method: "GET",
          cache: "no-store",
          credentials: "include",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Failed to load store page."
        );
      }

      setBrand(data.brand || "");

      setSections(
        Array.isArray(data.sections)
          ? data.sections
          : []
      );

      setProducts(
        Array.isArray(data.products)
          ? data.products
          : []
      );
    } catch (err) {
      console.error(
        "Storefront loading error:",
        err
      );

      setError(
        err.message ||
          "Failed to load store page."
      );
    } finally {
      setLoading(false);
    }
  }

  function addSection() {
    setSections((current) => [
      ...current,
      {
        ...createSection(),
        sortOrder: current.length,
      },
    ]);

    setMessage("");
    setError("");
  }

  function updateSection(
    sectionId,
    field,
    value
  ) {
    setSections((current) =>
      current.map((section) =>
        section.id === sectionId
          ? {
              ...section,
              [field]: value,
            }
          : section
      )
    );

    setMessage("");
  }

  function deleteSection(sectionId) {
    const confirmed = window.confirm(
      "Are you sure you want to remove this section?"
    );

    if (!confirmed) {
      return;
    }

    setSections((current) =>
      current
        .filter(
          (section) =>
            section.id !== sectionId
        )
        .map((section, index) => ({
          ...section,
          sortOrder: index,
        }))
    );

    setMessage("");
  }

  function moveSection(
    sectionIndex,
    direction
  ) {
    const newIndex =
      direction === "up"
        ? sectionIndex - 1
        : sectionIndex + 1;

    if (
      newIndex < 0 ||
      newIndex >= sections.length
    ) {
      return;
    }

    setSections((current) => {
      const copy = [...current];

      const currentSection =
        copy[sectionIndex];

      copy[sectionIndex] =
        copy[newIndex];

      copy[newIndex] =
        currentSection;

      return copy.map(
        (section, index) => ({
          ...section,
          sortOrder: index,
        })
      );
    });

    setMessage("");
  }

  function toggleProduct(
    sectionId,
    productId
  ) {
    setSections((current) =>
      current.map((section) => {
        if (section.id !== sectionId) {
          return section;
        }

        const currentProductIds =
          Array.isArray(
            section.productIds
          )
            ? section.productIds
            : [];

        const alreadySelected =
          currentProductIds.includes(
            productId
          );

        return {
          ...section,

          productIds: alreadySelected
            ? currentProductIds.filter(
                (id) =>
                  id !== productId
              )
            : [
                ...currentProductIds,
                productId,
              ],
        };
      })
    );

    setMessage("");
  }

  async function saveStorefront() {
    try {
      setSaving(true);
      setMessage("");
      setError("");

      const cleanedSections =
        sections.map(
          (section, index) => ({
            id: section.id,
            title:
              section.title?.trim() ||
              "Untitled Section",
            description:
              section.description?.trim() ||
              "",
            enabled:
              section.enabled !== false,
            productIds:
              Array.isArray(
                section.productIds
              )
                ? section.productIds
                : [],
            sortOrder: index,
          })
        );

      const response = await fetch(
        "/api/admin/storefront",
        {
          method: "PUT",
          headers: {
            "Content-Type":
              "application/json",
          },
          credentials: "include",

          body: JSON.stringify({
            sections:
              cleanedSections,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Failed to save store page."
        );
      }

      setSections(
        Array.isArray(data.sections)
          ? data.sections
          : cleanedSections
      );

      setMessage(
        "Store page saved successfully."
      );
    } catch (err) {
      console.error(
        "Storefront saving error:",
        err
      );

      setError(
        err.message ||
          "Failed to save store page."
      );
    } finally {
      setSaving(false);
    }
  }

  const brandName =
    brand === "UTHY_LUXURY"
      ? "UTHY LUXURY"
      : brand ===
        "ALOMZIEE_FOOTIES"
      ? "ALOMZIEE FOOTIES"
      : "STORE";

  if (loading) {
    return (
      <main className="min-h-screen bg-[#050505] text-white">
        <div className="mx-auto flex min-h-[70vh] max-w-7xl items-center justify-center px-6">
          <div className="text-center">
            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-amber-400" />

            <p className="text-[10px] uppercase tracking-[0.35em] text-white/30">
              Loading Store Page
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (error && !brand) {
    return (
      <main className="min-h-screen bg-[#050505] text-white">
        <div className="mx-auto max-w-3xl px-6 py-20">
          <div className="rounded-3xl border border-red-500/20 bg-red-500/[0.05] p-8 text-center">
            <p className="text-sm font-semibold text-red-400">
              {error}
            </p>

            <button
              type="button"
              onClick={loadStorefront}
              className="mt-6 rounded-full bg-white px-6 py-3 text-xs font-bold text-black"
            >
              Try Again
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#050505] text-white">
      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-10">

        {/* HEADER */}

        <div className="mb-10">
          <div className="mb-5 flex items-center gap-3">
            <span className="h-px w-10 bg-amber-400" />

            <span className="text-[9px] font-bold uppercase tracking-[0.35em] text-amber-400">
              Store Management
            </span>
          </div>

          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">
                {brandName}
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-7 text-white/40">
                Control the sections that appear
                on your storefront and choose
                exactly which products belong in
                each section.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="rounded-full border border-white/[0.08] bg-white/[0.025] px-5 py-3">
                <span className="text-xs text-white/40">
                  Products
                </span>

                <span className="ml-2 text-sm font-semibold text-white">
                  {products.length}
                </span>
              </div>

              <div className="rounded-full border border-amber-400/20 bg-amber-400/[0.05] px-5 py-3">
                <span className="text-xs text-amber-400/60">
                  Sections
                </span>

                <span className="ml-2 text-sm font-semibold text-amber-400">
                  {sections.length}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* SUCCESS MESSAGE */}

        {message && (
          <div className="mb-6 flex items-center justify-between gap-4 rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.05] px-5 py-4">
            <p className="text-sm text-emerald-300">
              {message}
            </p>

            <button
              type="button"
              onClick={() =>
                setMessage("")
              }
              className="text-xs text-emerald-400/60 hover:text-emerald-300"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* ERROR MESSAGE */}

        {error && (
          <div className="mb-6 rounded-2xl border border-red-500/20 bg-red-500/[0.05] px-5 py-4">
            <p className="text-sm text-red-400">
              {error}
            </p>
          </div>
        )}

        {/* STORE INFO */}

        <section className="mb-8 overflow-hidden rounded-[28px] border border-white/[0.08] bg-white/[0.025]">
          <div className="flex flex-col gap-5 p-6 sm:p-8 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-amber-400">
                Your Store
              </p>

              <h2 className="mt-2 text-2xl font-semibold">
                {brandName}
              </h2>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-white/35">
                Only products belonging to this
                store are available here. This
                storefront is separate from the
                other brand.
              </p>
            </div>

            <div className="shrink-0 rounded-2xl border border-white/[0.07] bg-black/30 px-5 py-4">
              <p className="text-[9px] uppercase tracking-[0.25em] text-white/25">
                Brand
              </p>

              <p className="mt-1 text-sm font-semibold text-amber-400">
                {brand}
              </p>
            </div>
          </div>
        </section>

        {/* ADD SECTION */}

        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold">
              Store Sections
            </h2>

            <p className="mt-1 text-xs text-white/30">
              Arrange your storefront however
              you want.
            </p>
          </div>

          <button
            type="button"
            onClick={addSection}
            className="rounded-full bg-amber-400 px-6 py-3 text-xs font-black uppercase tracking-[0.12em] text-black transition hover:bg-amber-300"
          >
            + Add Section
          </button>
        </div>

        {/* EMPTY STATE */}

        {sections.length === 0 && (
          <section className="rounded-[28px] border border-dashed border-white/10 bg-white/[0.015] px-6 py-20 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-white/10 bg-white/[0.03]">
              <span className="text-2xl text-white/20">
                +
              </span>
            </div>

            <h3 className="mt-6 text-xl font-semibold">
              No sections yet
            </h3>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-white/30">
              Create your first storefront
              section and choose the products
              customers should see inside it.
            </p>

            <button
              type="button"
              onClick={addSection}
              className="mt-6 rounded-full bg-white px-6 py-3 text-xs font-bold text-black transition hover:bg-amber-400"
            >
              Create First Section
            </button>
          </section>
        )}

        {/* SECTIONS */}

        <div className="space-y-8">
          {sections.map(
            (section, sectionIndex) => {
              const selectedCount =
                Array.isArray(
                  section.productIds
                )
                  ? section.productIds
                      .length
                  : 0;

              return (
                <section
                  key={section.id}
                  className="overflow-hidden rounded-[28px] border border-white/[0.08] bg-white/[0.025]"
                >
                  {/* SECTION TOP */}

                  <div className="border-b border-white/[0.06] p-6 sm:p-8">
                    <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-3">
                          <span className="flex h-7 min-w-7 items-center justify-center rounded-full bg-white/[0.06] px-2 text-[10px] font-bold text-white/40">
                            {sectionIndex +
                              1}
                          </span>

                          <span className="text-[9px] font-bold uppercase tracking-[0.3em] text-amber-400/70">
                            Store Section
                          </span>
                        </div>

                        <input
                          type="text"
                          value={
                            section.title ||
                            ""
                          }
                          onChange={(event) =>
                            updateSection(
                              section.id,
                              "title",
                              event.target.value
                            )
                          }
                          placeholder="Section name"
                          className="mt-5 w-full border-none bg-transparent text-3xl font-semibold tracking-[-0.03em] text-white outline-none placeholder:text-white/15 sm:text-4xl"
                        />

                        <textarea
                          value={
                            section.description ||
                            ""
                          }
                          onChange={(event) =>
                            updateSection(
                              section.id,
                              "description",
                              event.target.value
                            )
                          }
                          placeholder="Add a description for this section..."
                          rows={2}
                          className="mt-3 w-full resize-none border-none bg-transparent text-sm leading-6 text-white/40 outline-none placeholder:text-white/15"
                        />
                      </div>

                      {/* SECTION CONTROLS */}

                      <div className="flex flex-wrap items-center gap-2 xl:max-w-sm xl:justify-end">
                        <button
                          type="button"
                          onClick={() =>
                            moveSection(
                              sectionIndex,
                              "up"
                            )
                          }
                          disabled={
                            sectionIndex ===
                            0
                          }
                          className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 text-sm text-white/50 transition hover:border-white/20 hover:text-white disabled:cursor-not-allowed disabled:opacity-20"
                          title="Move section up"
                        >
                          ↑
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            moveSection(
                              sectionIndex,
                              "down"
                            )
                          }
                          disabled={
                            sectionIndex ===
                            sections.length -
                              1
                          }
                          className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 text-sm text-white/50 transition hover:border-white/20 hover:text-white disabled:cursor-not-allowed disabled:opacity-20"
                          title="Move section down"
                        >
                          ↓
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            updateSection(
                              section.id,
                              "enabled",
                              !section.enabled
                            )
                          }
                          className={`rounded-full px-5 py-2.5 text-[10px] font-black uppercase tracking-[0.12em] transition ${
                            section.enabled !==
                            false
                              ? "bg-emerald-400 text-black"
                              : "bg-white/10 text-white/40"
                          }`}
                        >
                          {section.enabled !==
                          false
                            ? "Visible"
                            : "Hidden"}
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            deleteSection(
                              section.id
                            )
                          }
                          className="rounded-full border border-red-500/20 px-5 py-2.5 text-[10px] font-black uppercase tracking-[0.12em] text-red-400 transition hover:bg-red-500/10"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* PRODUCT SELECTION */}

                  <div className="p-6 sm:p-8">
                    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                      <div>
                        <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-white/40">
                          Choose Products
                        </p>

                        <p className="mt-2 text-sm text-white/30">
                          Click a product to add or
                          remove it from this section.
                        </p>
                      </div>

                      <div className="rounded-full border border-amber-400/20 bg-amber-400/[0.05] px-4 py-2">
                        <span className="text-xs text-amber-400">
                          {selectedCount} selected
                        </span>
                      </div>
                    </div>

                    {products.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-white/10 px-6 py-16 text-center">
                        <p className="text-sm text-white/30">
                          No products are available
                          for this store yet.
                        </p>
                      </div>
                    ) : (
                      <div className="grid max-h-[600px] grid-cols-1 gap-3 overflow-y-auto pr-1 sm:grid-cols-2 lg:grid-cols-3">
                        {products.map(
                          (product) => {
                            const selected =
                              Array.isArray(
                                section.productIds
                              ) &&
                              section.productIds.includes(
                                product.id
                              );

                            const image =
                              getImage(
                                product.images
                              );

                            return (
                              <button
                                key={
                                  product.id
                                }
                                type="button"
                                onClick={() =>
                                  toggleProduct(
                                    section.id,
                                    product.id
                                  )
                                }
                                className={`group flex items-center gap-3 rounded-2xl border p-3 text-left transition ${
                                  selected
                                    ? "border-amber-400/40 bg-amber-400/[0.07]"
                                    : "border-white/[0.07] bg-black/30 hover:border-white/15 hover:bg-white/[0.03]"
                                }`}
                              >
                                {/* IMAGE */}

                                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-white/[0.05]">
                                  {image ? (
                                    <img
                                      src={image}
                                      alt={
                                        product.name ||
                                        "Product"
                                      }
                                      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                                    />
                                  ) : (
                                    <div className="flex h-full w-full items-center justify-center">
                                      <span className="text-xl text-white/15">
                                        V
                                      </span>
                                    </div>
                                  )}

                                  {selected && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-400 text-sm font-black text-black">
                                        ✓
                                      </span>
                                    </div>
                                  )}
                                </div>

                                {/* DETAILS */}

                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-sm font-semibold text-white">
                                    {product.name ||
                                      "Unnamed Product"}
                                  </p>

                                  <p className="mt-1 text-xs text-white/40">
                                    {formatPrice(
                                      product.price
                                    )}
                                  </p>

                                  <p className="mt-1 truncate text-[9px] uppercase tracking-[0.15em] text-white/20">
                                    {product.category ||
                                      "Uncategorized"}
                                  </p>
                                </div>

                                {/* CHECK */}

                                <div
                                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[11px] font-black transition ${
                                    selected
                                      ? "border-amber-400 bg-amber-400 text-black"
                                      : "border-white/10 text-transparent"
                                  }`}
                                >
                                  ✓
                                </div>
                              </button>
                            );
                          }
                        )}
                      </div>
                    )}
                  </div>
                </section>
              );
            }
          )}
        </div>

        {/* SAVE BAR */}

        <div className="sticky bottom-4 z-30 mt-10">
          <div className="rounded-2xl border border-white/[0.08] bg-[#0b0b0b]/95 p-3 shadow-2xl backdrop-blur-xl">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="px-3">
                <p className="text-xs font-semibold text-white">
                  {sections.length === 0
                    ? "No sections created"
                    : `${sections.length} section${
                        sections.length ===
                        1
                          ? ""
                          : "s"
                      } configured`}
                </p>

                <p className="mt-1 text-[10px] text-white/25">
                  Save your changes to update
                  the storefront.
                </p>
              </div>

              <button
                type="button"
                onClick={saveStorefront}
                disabled={saving}
                className="rounded-full bg-amber-400 px-8 py-4 text-xs font-black uppercase tracking-[0.15em] text-black transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving
                  ? "Saving..."
                  : "Save Store Page"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}