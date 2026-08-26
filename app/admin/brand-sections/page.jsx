"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const BRANDS = {
  UTHY_LUXURY: {
    name: "UTHY LUXURY",
    description:
      "Manage the sections and products displayed on the UTHY LUXURY page.",
  },
  ALOMZIEE_FOOTIES: {
    name: "ALOMZIEE FOOTIES",
    description:
      "Manage the sections and products displayed on the ALOMZIEE FOOTIES page.",
  },
};

export default function BrandSectionsPage() {
  const router = useRouter();

  const [brand, setBrand] =
    useState("UTHY_LUXURY");

  const [sections, setSections] =
    useState([]);

  const [products, setProducts] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [showAdd, setShowAdd] =
    useState(false);

  const [newSection, setNewSection] =
    useState({
      title: "",
      description: "",
      image: "",
      enabled: true,
      products: [],
    });

  useEffect(() => {
    const auth =
      localStorage.getItem("adminAuth");

    if (auth !== "true") {
      router.replace("/admin/login");
      return;
    }

    loadBrand(brand);
  }, [router]);

  useEffect(() => {
    if (
      localStorage.getItem("adminAuth") ===
      "true"
    ) {
      loadBrand(brand);
    }
  }, [brand]);

  async function loadBrand(selectedBrand) {
    try {
      setLoading(true);
      setMessage("");

      const response = await fetch(
        `/api/admin/brand-sections?brand=${encodeURIComponent(
          selectedBrand
        )}`,
        {
          cache: "no-store",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Failed to load brand sections."
        );
      }

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
    } catch (error) {
      console.error(
        "Failed to load brand sections:",
        error
      );

      setMessage(
        error.message ||
          "Failed to load brand sections."
      );

      setSections([]);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }

  function toggleProduct(
    productId,
    currentProducts,
    setter
  ) {
    setter((current) => {
      const selected =
        currentProducts.includes(productId);

      if (selected) {
        return current.filter(
          (id) => id !== productId
        );
      }

      return [
        ...current,
        productId,
      ];
    });
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
  }

  async function addSection() {
    if (!newSection.title.trim()) {
      setMessage(
        "Section name is required."
      );
      return;
    }

    try {
      setSaving(true);
      setMessage("");

      const response = await fetch(
        "/api/admin/brand-sections",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            brand,
            title:
              newSection.title.trim(),
            description:
              newSection.description.trim(),
            image:
              newSection.image.trim(),
            enabled:
              newSection.enabled,
            products:
              newSection.products,
          }),
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Failed to create section."
        );
      }

      setSections((current) => [
        ...current,
        data.section,
      ]);

      setNewSection({
        title: "",
        description: "",
        image: "",
        enabled: true,
        products: [],
      });

      setShowAdd(false);
      setMessage(
        "Section created successfully."
      );
    } catch (error) {
      console.error(
        "Failed to create section:",
        error
      );

      setMessage(
        error.message ||
          "Failed to create section."
      );
    } finally {
      setSaving(false);
    }
  }

  async function saveSections() {
    try {
      setSaving(true);
      setMessage("");

      const response = await fetch(
        "/api/admin/brand-sections",
        {
          method: "PUT",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            brand,
            sections,
          }),
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Failed to save sections."
        );
      }

      setSections(
        Array.isArray(data.sections)
          ? data.sections
          : sections
      );

      setMessage(
        "Changes saved successfully."
      );
    } catch (error) {
      console.error(
        "Failed to save sections:",
        error
      );

      setMessage(
        error.message ||
          "Failed to save sections."
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteSection(id) {
    const confirmed =
      window.confirm(
        "Delete this section?"
      );

    if (!confirmed) {
      return;
    }

    try {
      setSaving(true);
      setMessage("");

      const response = await fetch(
        `/api/admin/brand-sections?id=${encodeURIComponent(
          id
        )}`,
        {
          method: "DELETE",
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Failed to delete section."
        );
      }

      setSections((current) =>
        current.filter(
          (section) =>
            section.id !== id
        )
      );

      setMessage(
        "Section deleted."
      );
    } catch (error) {
      console.error(
        "Failed to delete section:",
        error
      );

      setMessage(
        error.message ||
          "Failed to delete section."
      );
    } finally {
      setSaving(false);
    }
  }

  function moveSection(
    index,
    direction
  ) {
    const nextIndex =
      index + direction;

    if (
      nextIndex < 0 ||
      nextIndex >= sections.length
    ) {
      return;
    }

    const updated = [
      ...sections,
    ];

    [
      updated[index],
      updated[nextIndex],
    ] = [
      updated[nextIndex],
      updated[index],
    ];

    setSections(
      updated.map(
        (section, position) => ({
          ...section,
          sortOrder: position,
        })
      )
    );
  }

  function getProduct(id) {
    return products.find(
      (product) =>
        product.id === id
    );
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8">

        {/* HEADER */}
        <div className="mb-8">
          <button
            type="button"
            onClick={() =>
              router.push("/admin")
            }
            className="mb-6 text-sm text-white/40 transition hover:text-white"
          >
            ← Back to Admin
          </button>

          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-amber-400">
                VÉRANE / BRAND PAGES
              </p>

              <h1 className="mt-2 text-4xl font-black tracking-[-0.04em] sm:text-5xl">
                Brand Sections
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-white/40">
                Build the sections that appear
                on each brand's dedicated page.
                Products remain available in
                the brand's full catalog.
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                setShowAdd(
                  (current) => !current
                )
              }
              className="rounded-full bg-amber-400 px-6 py-3 text-sm font-bold text-black transition hover:bg-amber-300"
            >
              {showAdd
                ? "Cancel"
                : "+ Add Section"}
            </button>
          </div>
        </div>

        {/* BRAND SWITCHER */}
        <div className="mb-8 grid gap-3 sm:grid-cols-2">
          {Object.entries(BRANDS).map(
            ([key, value]) => {
              const active =
                brand === key;

              return (
                <button
                  type="button"
                  key={key}
                  onClick={() =>
                    setBrand(key)
                  }
                  className={`rounded-2xl border p-5 text-left transition ${
                    active
                      ? "border-amber-400/40 bg-amber-400/[0.06]"
                      : "border-white/10 bg-white/[0.02] hover:border-white/20"
                  }`}
                >
                  <p
                    className={`text-xs font-bold uppercase tracking-[0.2em] ${
                      active
                        ? "text-amber-400"
                        : "text-white/40"
                    }`}
                  >
                    Brand
                  </p>

                  <h2 className="mt-2 text-xl font-bold">
                    {value.name}
                  </h2>

                  <p className="mt-2 text-xs leading-5 text-white/30">
                    {value.description}
                  </p>
                </button>
              );
            }
          )}
        </div>

        {/* MESSAGE */}
        {message && (
          <div className="mb-6 rounded-2xl border border-amber-400/20 bg-amber-400/[0.05] px-5 py-4 text-sm text-amber-300">
            {message}
          </div>
        )}

        {/* ADD SECTION */}
        {showAdd && (
          <section className="mb-8 rounded-3xl border border-white/10 bg-neutral-950 p-6 sm:p-8">

            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-amber-400">
              New Section
            </p>

            <h2 className="mt-2 text-2xl font-bold">
              Add section to{" "}
              {BRANDS[brand].name}
            </h2>

            <div className="mt-6 grid gap-5 md:grid-cols-2">

              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-white/40">
                  Section Name
                </label>

                <input
                  value={
                    newSection.title
                  }
                  onChange={(event) =>
                    setNewSection(
                      (current) => ({
                        ...current,
                        title:
                          event.target
                            .value,
                      })
                    )
                  }
                  placeholder="New Arrivals"
                  className="w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-sm outline-none focus:border-amber-400/40"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-white/40">
                  Image URL
                </label>

                <input
                  value={
                    newSection.image
                  }
                  onChange={(event) =>
                    setNewSection(
                      (current) => ({
                        ...current,
                        image:
                          event.target
                            .value,
                      })
                    )
                  }
                  placeholder="Optional"
                  className="w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-sm outline-none focus:border-amber-400/40"
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-white/40">
                  Description
                </label>

                <textarea
                  value={
                    newSection.description
                  }
                  onChange={(event) =>
                    setNewSection(
                      (current) => ({
                        ...current,
                        description:
                          event.target
                            .value,
                      })
                    )
                  }
                  rows={3}
                  placeholder="Describe this section..."
                  className="w-full resize-none rounded-xl border border-white/10 bg-black px-4 py-3 text-sm outline-none focus:border-amber-400/40"
                />
              </div>
            </div>

            {/* PRODUCT PICKER */}
            <div className="mt-7">
              <div className="mb-4 flex items-end justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-white/40">
                    Products
                  </p>

                  <p className="mt-1 text-xs text-white/25">
                    Choose which products
                    appear in this section.
                  </p>
                </div>

                <span className="text-xs text-amber-400">
                  {
                    newSection.products
                      .length
                  }{" "}
                  selected
                </span>
              </div>

              <div className="grid max-h-[420px] gap-3 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3">
                {products.map(
                  (product) => {
                    const selected =
                      newSection.products.includes(
                        product.id
                      );

                    return (
                      <button
                        type="button"
                        key={product.id}
                        onClick={() =>
                          toggleProduct(
                            product.id,
                            newSection.products,
                            (updater) =>
                              setNewSection(
                                (
                                  current
                                ) => ({
                                  ...current,
                                  products:
                                    typeof updater ===
                                    "function"
                                      ? updater(
                                          current.products
                                        )
                                      : updater,
                                })
                              )
                          )
                        }
                        className={`flex items-center gap-3 rounded-xl border p-3 text-left transition ${
                          selected
                            ? "border-amber-400/40 bg-amber-400/[0.07]"
                            : "border-white/10 bg-black hover:border-white/20"
                        }`}
                      >
                        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-white/5">
                          {product.images ? (
                            <img
                              src={
                                product.images
                                  .split(
                                    ","
                                  )[0]
                              }
                              alt={
                                product.name
                              }
                              className="h-full w-full object-cover"
                            />
                          ) : null}
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold">
                            {
                              product.name
                            }
                          </p>

                          <p className="mt-1 text-xs text-white/30">
                            ₦
                            {Number(
                              product.price
                            ).toLocaleString()}
                          </p>
                        </div>

                        <span
                          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] ${
                            selected
                              ? "border-amber-400 bg-amber-400 text-black"
                              : "border-white/15 text-transparent"
                          }`}
                        >
                          ✓
                        </span>
                      </button>
                    );
                  }
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={addSection}
              disabled={saving}
              className="mt-7 rounded-full bg-white px-7 py-3 text-sm font-bold text-black transition hover:bg-neutral-200 disabled:opacity-50"
            >
              {saving
                ? "Creating..."
                : "Create Section"}
            </button>
          </section>
        )}

        {/* LOADING */}
        {loading ? (
          <div className="rounded-3xl border border-white/10 bg-neutral-950 px-6 py-20 text-center text-sm text-white/30">
            Loading {BRANDS[brand].name}...
          </div>
        ) : sections.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-white/10 bg-neutral-950 px-6 py-20 text-center">
            <p className="text-lg font-semibold">
              No custom sections yet.
            </p>

            <p className="mt-2 text-sm text-white/30">
              {BRANDS[brand].name} products
              will still appear in the All
              Products area.
            </p>
          </div>
        ) : (
          <div className="space-y-6">

            {sections.map(
              (section, index) => (
                <section
                  key={section.id}
                  className="rounded-3xl border border-white/10 bg-neutral-950 p-6 sm:p-8"
                >
                  {/* SECTION HEADER */}
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex items-start gap-3">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            moveSection(
                              index,
                              -1
                            )
                          }
                          disabled={
                            index === 0
                          }
                          className="rounded-lg border border-white/10 px-3 py-1 text-white/40 disabled:opacity-20"
                        >
                          ↑
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            moveSection(
                              index,
                              1
                            )
                          }
                          disabled={
                            index ===
                            sections.length -
                              1
                          }
                          className="rounded-lg border border-white/10 px-3 py-1 text-white/40 disabled:opacity-20"
                        >
                          ↓
                        </button>
                      </div>

                      <div>
                        <h2 className="text-xl font-bold">
                          {section.title}
                        </h2>

                        <p className="mt-1 text-xs text-white/30">
                          {
                            section
                              .products
                              .length
                          }{" "}
                          products selected
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          updateSection(
                            section.id,
                            "enabled",
                            !section.enabled
                          )
                        }
                        className={`rounded-full px-4 py-2 text-xs font-bold ${
                          section.enabled
                            ? "bg-emerald-400/10 text-emerald-400"
                            : "bg-white/5 text-white/30"
                        }`}
                      >
                        {section.enabled
                          ? "Enabled"
                          : "Disabled"}
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          deleteSection(
                            section.id
                          )
                        }
                        className="rounded-full bg-red-400/10 px-4 py-2 text-xs font-bold text-red-400"
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  {/* EDITABLE CONTENT */}
                  <div className="mt-7 grid gap-5 md:grid-cols-2">

                    <div>
                      <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-white/40">
                        Section Name
                      </label>

                      <input
                        value={
                          section.title ||
                          ""
                        }
                        onChange={(event) =>
                          updateSection(
                            section.id,
                            "title",
                            event.target
                              .value
                          )
                        }
                        className="w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-sm outline-none focus:border-amber-400/40"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-white/40">
                        Section Image URL
                      </label>

                      <input
                        value={
                          section.image ||
                          ""
                        }
                        onChange={(event) =>
                          updateSection(
                            section.id,
                            "image",
                            event.target
                              .value
                          )
                        }
                        placeholder="Optional"
                        className="w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-sm outline-none focus:border-amber-400/40"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-white/40">
                        Description
                      </label>

                      <textarea
                        value={
                          section.description ||
                          ""
                        }
                        onChange={(event) =>
                          updateSection(
                            section.id,
                            "description",
                            event.target
                              .value
                          )
                        }
                        rows={3}
                        className="w-full resize-none rounded-xl border border-white/10 bg-black px-4 py-3 text-sm outline-none focus:border-amber-400/40"
                      />
                    </div>
                  </div>

                  {/* PRODUCT SELECTION */}
                  <div className="mt-7 border-t border-white/[0.06] pt-7">
                    <div className="mb-4 flex items-end justify-between">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-white/40">
                          Section Products
                        </p>

                        <p className="mt-1 text-xs text-white/25">
                          Select the products
                          that belong in this
                          section.
                        </p>
                      </div>

                      <span className="text-xs text-amber-400">
                        {
                          section.products
                            .length
                        }{" "}
                        selected
                      </span>
                    </div>

                    <div className="grid max-h-[420px] gap-3 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3">
                      {products.map(
                        (product) => {
                          const selected =
                            section.products.includes(
                              product.id
                            );

                          return (
                            <button
                              type="button"
                              key={
                                product.id
                              }
                              onClick={() =>
                                toggleProduct(
                                  product.id,
                                  section.products,
                                  (updater) =>
                                    updateSection(
                                      section.id,
                                      "products",
                                      typeof updater ===
                                      "function"
                                        ? updater(
                                            section.products
                                          )
                                        : updater
                                    )
                                )
                              }
                              className={`flex items-center gap-3 rounded-xl border p-3 text-left transition ${
                                selected
                                  ? "border-amber-400/40 bg-amber-400/[0.07]"
                                  : "border-white/10 bg-black hover:border-white/20"
                              }`}
                            >
                              <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-white/5">
                                {product.images ? (
                                  <img
                                    src={
                                      product.images
                                        .split(
                                          ","
                                        )[0]
                                    }
                                    alt={
                                      product.name
                                    }
                                    className="h-full w-full object-cover"
                                  />
                                ) : null}
                              </div>

                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-semibold">
                                  {
                                    product.name
                                  }
                                </p>

                                <p className="mt-1 text-xs text-white/30">
                                  ₦
                                  {Number(
                                    product.price
                                  ).toLocaleString()}
                                </p>
                              </div>

                              <span
                                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] ${
                                  selected
                                    ? "border-amber-400 bg-amber-400 text-black"
                                    : "border-white/15 text-transparent"
                                }`}
                              >
                                ✓
                              </span>
                            </button>
                          );
                        }
                      )}
                    </div>
                  </div>
                </section>
              )
            )}

            <div className="sticky bottom-5 flex justify-end">
              <button
                type="button"
                onClick={saveSections}
                disabled={saving}
                className="rounded-full bg-amber-400 px-8 py-4 text-sm font-bold text-black shadow-2xl transition hover:bg-amber-300 disabled:opacity-50"
              >
                {saving
                  ? "Saving..."
                  : "Save All Changes"}
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}