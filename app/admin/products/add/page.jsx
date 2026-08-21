"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const outfitLayers = [
  { value: "top", label: "Top" },
  { value: "bottom", label: "Bottom" },
  { value: "feet", label: "Feet" },
  { value: "waist", label: "Waist" },
  { value: "hand", label: "Hand" },
];

export default function AddProductPage() {
  const router = useRouter();

  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);

  const [form, setForm] = useState({
    name: "",
    category: "",
    price: "",
    description: "",
    inventory: 0,
    colors: "",
    style: "",
    occasion: "",
    images: [],
    outfitCompatible: false,
    outfitLayer: "none",
    mannequinAsset: "",
  });

  const [imageInput, setImageInput] = useState("");
  const [assetInput, setAssetInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    loadCategories();
  }, []);

  async function loadCategories() {
    try {
      setCategoriesLoading(true);
      setError("");

      const response = await fetch("/api/admin/categories", {
        cache: "no-store",
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          data?.error || "Unable to load categories."
        );
      }

      const availableCategories = Array.isArray(data)
        ? data.filter((category) => category.enabled)
        : [];

      setCategories(availableCategories);

      setForm((current) => ({
        ...current,
        category:
          current.category ||
          availableCategories[0]?.id ||
          "",
      }));
    } catch (err) {
      console.error("Category loading error:", err);
      setError(
        err?.message || "Unable to load categories."
      );
    } finally {
      setCategoriesLoading(false);
    }
  }

  const updateField = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const addImage = () => {
    const url = imageInput.trim();

    if (!url) return;

    setForm((current) => ({
      ...current,
      images: [...current.images, url],
    }));

    setImageInput("");
  };

  const removeImage = (index) => {
    setForm((current) => ({
      ...current,
      images: current.images.filter((_, i) => i !== index),
    }));
  };

  const validate = () => {
    if (!form.name.trim()) {
      return "Product name is required.";
    }

    if (!form.category) {
      return "Choose a category.";
    }

    if (categories.length === 0) {
      return "Create at least one category before adding a product.";
    }

    const price = Number(form.price);

    if (!form.price || Number.isNaN(price) || price <= 0) {
      return "Enter a valid product price.";
    }

    const inventory = Number(form.inventory);

    if (
      form.inventory === "" ||
      Number.isNaN(inventory) ||
      inventory < 0
    ) {
      return "Enter a valid inventory quantity.";
    }

    if (
      form.outfitCompatible &&
      form.outfitLayer === "none"
    ) {
      return "Choose an Outfit Builder layer.";
    }

    if (
      form.outfitCompatible &&
      !form.mannequinAsset.trim()
    ) {
      return "Add a transparent PNG asset URL for the Outfit Builder.";
    }

    return "";
  };

  const save = async () => {
    setError("");
    setSuccess("");

    const validationError = validate();

    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setSaving(true);

      const response = await fetch("/api/admin/products", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          name: form.name.trim(),
          category: form.category,
          price: Number(form.price),
          description: form.description.trim(),
          inventory: Number(form.inventory),

          colors: form.colors
            ? form.colors
                .split(",")
                .map((color) => color.trim())
                .filter(Boolean)
            : [],

          style: form.style.trim(),
          occasion: form.occasion.trim(),
          images: form.images,

          outfitCompatible: form.outfitCompatible,

          outfitLayer: form.outfitCompatible
            ? form.outfitLayer
            : "none",

          mannequinAsset: form.outfitCompatible
            ? form.mannequinAsset.trim()
            : "",
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          data?.error ||
            data?.message ||
            "Failed to create product."
        );
      }

      setSuccess("Product created successfully.");

      setTimeout(() => {
        router.push("/admin/products");
        router.refresh();
      }, 700);
    } catch (err) {
      console.error("Create product error:", err);

      setError(
        err?.message ||
          "Something went wrong while creating the product."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-5xl px-5 py-10 sm:px-8 md:py-16">

        <div className="mb-10">
          <button
            type="button"
            onClick={() => router.push("/admin/products")}
            className="mb-6 inline-flex items-center gap-2 text-xs text-neutral-500 transition hover:text-white"
          >
            ← Back to Products
          </button>

          <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.35em] text-amber-400">
            STORE ADMIN
          </p>

          <h1 className="text-4xl font-black tracking-tight md:text-6xl">
            Add Product
          </h1>

          <p className="mt-3 max-w-xl text-neutral-500">
            Create a product for your authorized store.
            Products marked as Outfit Builder compatible can
            appear inside the digital styling experience.
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-2xl border border-red-500/20 bg-red-500/5 px-5 py-4 text-sm text-red-300">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-6 rounded-2xl border border-green-500/20 bg-green-500/5 px-5 py-4 text-sm text-green-300">
            {success}
          </div>
        )}

        <div className="space-y-8">

          {/* PRODUCT INFORMATION */}
          <section className="rounded-3xl border border-white/10 bg-neutral-950 p-6 md:p-8">

            <div className="mb-7">
              <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-amber-400">
                01
              </p>

              <h2 className="mt-1 text-xl font-bold">
                Product Information
              </h2>

              <p className="mt-1 text-sm text-neutral-500">
                Add the information customers will see.
              </p>
            </div>

            <div className="space-y-5">

              {/* NAME */}
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-neutral-400">
                  Product Name *
                </label>

                <input
                  value={form.name}
                  onChange={(event) => {
                    updateField("name", event.target.value);
                    setError("");
                  }}
                  placeholder="Product name"
                  className="w-full rounded-2xl border border-white/10 bg-black px-5 py-4 text-white outline-none transition focus:border-amber-500/60"
                />
              </div>

              {/* CATEGORY */}
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-neutral-400">
                  Category *
                </label>

                {categoriesLoading ? (
                  <div className="w-full rounded-2xl border border-white/10 bg-black px-5 py-4 text-sm text-neutral-600">
                    Loading your categories...
                  </div>
                ) : categories.length === 0 ? (
                  <div className="rounded-2xl border border-amber-400/20 bg-amber-400/5 px-5 py-4">
                    <p className="text-sm text-amber-200">
                      No categories exist yet.
                    </p>

                    <button
                      type="button"
                      onClick={() =>
                        router.push("/admin/categories")
                      }
                      className="mt-3 text-xs font-bold uppercase tracking-wider text-amber-400 hover:text-amber-300"
                    >
                      Create a category →
                    </button>
                  </div>
                ) : (
                  <select
                    value={form.category}
                    onChange={(event) =>
                      updateField(
                        "category",
                        event.target.value
                      )
                    }
                    className="w-full rounded-2xl border border-white/10 bg-black px-5 py-4 text-white outline-none transition focus:border-amber-500/60"
                  >
                    <option value="" disabled>
                      Select a category
                    </option>

                    {categories.map((category) => (
                      <option
                        key={category.id}
                        value={category.id}
                      >
                        {category.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* PRICE + INVENTORY */}
              <div className="grid gap-5 md:grid-cols-2">

                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-neutral-400">
                    Price (₦) *
                  </label>

                  <input
                    value={form.price}
                    onChange={(event) =>
                      updateField(
                        "price",
                        event.target.value
                      )
                    }
                    type="number"
                    min="0"
                    step="1"
                    placeholder="0"
                    className="w-full rounded-2xl border border-white/10 bg-black px-5 py-4 text-white outline-none transition focus:border-amber-500/60"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-neutral-400">
                    Inventory
                  </label>

                  <input
                    value={form.inventory}
                    onChange={(event) =>
                      updateField(
                        "inventory",
                        event.target.value
                      )
                    }
                    type="number"
                    min="0"
                    step="1"
                    className="w-full rounded-2xl border border-white/10 bg-black px-5 py-4 text-white outline-none transition focus:border-amber-500/60"
                  />
                </div>

              </div>

              {/* DESCRIPTION */}
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-neutral-400">
                  Description
                </label>

                <textarea
                  value={form.description}
                  onChange={(event) =>
                    updateField(
                      "description",
                      event.target.value
                    )
                  }
                  rows={5}
                  placeholder="Describe the product..."
                  className="w-full resize-none rounded-2xl border border-white/10 bg-black px-5 py-4 text-white outline-none transition focus:border-amber-500/60"
                />

                <p className="mt-2 text-[11px] text-neutral-600">
                  {form.description.length} characters
                </p>
              </div>

              {/* STYLE + OCCASION */}
              <div className="grid gap-5 md:grid-cols-2">

                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-neutral-400">
                    Style
                  </label>

                  <input
                    value={form.style}
                    onChange={(event) =>
                      updateField(
                        "style",
                        event.target.value
                      )
                    }
                    placeholder="Minimal, Classic, Streetwear..."
                    className="w-full rounded-2xl border border-white/10 bg-black px-5 py-4 text-white outline-none transition focus:border-amber-500/60"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-neutral-400">
                    Occasion
                  </label>

                  <input
                    value={form.occasion}
                    onChange={(event) =>
                      updateField(
                        "occasion",
                        event.target.value
                      )
                    }
                    placeholder="Wedding, Casual, Formal..."
                    className="w-full rounded-2xl border border-white/10 bg-black px-5 py-4 text-white outline-none transition focus:border-amber-500/60"
                  />
                </div>

              </div>

              {/* COLORS */}
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-neutral-400">
                  Colors
                </label>

                <input
                  value={form.colors}
                  onChange={(event) =>
                    updateField(
                      "colors",
                      event.target.value
                    )
                  }
                  placeholder="Black, White, Gold"
                  className="w-full rounded-2xl border border-white/10 bg-black px-5 py-4 text-white outline-none transition focus:border-amber-500/60"
                />

                <p className="mt-2 text-[11px] text-neutral-600">
                  Separate multiple colors with commas.
                </p>
              </div>

            </div>
          </section>

          {/* IMAGES */}
          <section className="rounded-3xl border border-white/10 bg-neutral-950 p-6 md:p-8">

            <div className="mb-7">
              <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-amber-400">
                02
              </p>

              <h2 className="mt-1 text-xl font-bold">
                Product Images
              </h2>

              <p className="mt-1 text-sm text-neutral-500">
                Add the product image URLs customers will see.
              </p>
            </div>

            <div className="flex gap-3">

              <input
                value={imageInput}
                onChange={(event) =>
                  setImageInput(event.target.value)
                }
                placeholder="https://..."
                className="flex-1 rounded-2xl border border-white/10 bg-black px-5 py-4 text-white outline-none transition focus:border-amber-500/60"
              />

              <button
                type="button"
                onClick={addImage}
                className="rounded-2xl bg-white px-6 text-sm font-black text-black transition hover:bg-neutral-200"
              >
                Add
              </button>

            </div>

            {form.images.length > 0 ? (
              <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3">

                {form.images.map((image, index) => (
                  <div
                    key={`${image}-${index}`}
                    className="relative aspect-square overflow-hidden rounded-2xl border border-white/10 bg-black"
                  >
                    <img
                      src={image}
                      alt={`Product image ${index + 1}`}
                      className="h-full w-full object-cover"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        removeImage(index)
                      }
                      className="absolute right-2 top-2 h-8 w-8 rounded-full bg-black/80 text-xs text-white"
                    >
                      ×
                    </button>
                  </div>
                ))}

              </div>
            ) : (
              <div className="mt-5 rounded-2xl border border-dashed border-white/10 p-10 text-center">
                <p className="text-sm text-neutral-500">
                  No images added yet.
                </p>
              </div>
            )}

          </section>

          {/* OUTFIT BUILDER */}
          <section className="rounded-3xl border border-white/10 bg-neutral-950 p-6 md:p-8">

            <div className="mb-7">
              <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-amber-400">
                03
              </p>

              <h2 className="mt-1 text-xl font-bold">
                Outfit Builder
              </h2>

              <p className="mt-1 text-sm text-neutral-500">
                Make this product available inside the
                Outfit Builder.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black p-5">

              <label className="flex cursor-pointer items-start gap-4">

                <input
                  type="checkbox"
                  checked={form.outfitCompatible}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      outfitCompatible:
                        event.target.checked,
                      outfitLayer:
                        event.target.checked
                          ? current.outfitLayer === "none"
                            ? "top"
                            : current.outfitLayer
                          : "none",
                    }))
                  }
                  className="mt-1 h-4 w-4 accent-amber-500"
                />

                <div>
                  <p className="font-semibold">
                    Make this product Outfit Builder compatible
                  </p>

                  <p className="mt-1 text-xs text-neutral-500">
                    Customers can use this piece when creating
                    a complete look.
                  </p>
                </div>

              </label>

              {form.outfitCompatible && (
                <div className="mt-6 space-y-6 border-t border-white/10 pt-6">

                  {/* LAYER */}
                  <div>
                    <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-neutral-400">
                      Outfit Layer *
                    </label>

                    <select
                      value={form.outfitLayer}
                      onChange={(event) =>
                        updateField(
                          "outfitLayer",
                          event.target.value
                        )
                      }
                      className="w-full rounded-2xl border border-white/10 bg-neutral-950 px-5 py-4 text-white outline-none transition focus:border-amber-500/60"
                    >
                      <option value="none">
                        Select layer
                      </option>

                      {outfitLayers.map((layer) => (
                        <option
                          key={layer.value}
                          value={layer.value}
                        >
                          {layer.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* PNG ASSET */}
                  <div>

                    <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-neutral-400">
                      Transparent PNG Asset URL *
                    </label>

                    <input
                      value={assetInput}
                      onChange={(event) => {
                        setAssetInput(event.target.value);
                        updateField(
                          "mannequinAsset",
                          event.target.value
                        );
                      }}
                      placeholder="https://your-image-host.com/product.png"
                      className="w-full rounded-2xl border border-white/10 bg-neutral-950 px-5 py-4 text-white outline-none transition focus:border-amber-500/60"
                    />

                    <p className="mt-2 text-[11px] leading-5 text-neutral-600">
                      Use a transparent PNG of the actual
                      clothing, footwear, belt or bag. This
                      image will be layered onto the mannequin.
                    </p>

                    {form.mannequinAsset && (
                      <div className="mt-5 overflow-hidden rounded-2xl border border-white/10 bg-neutral-900 p-5">

                        <p className="mb-3 text-[9px] font-bold uppercase tracking-[0.25em] text-white/30">
                          Asset Preview
                        </p>

                        <div className="flex min-h-[220px] items-center justify-center rounded-xl bg-[radial-gradient(circle_at_center,_#262626_0%,_#0a0a0a_60%,_#000_100%)] p-6">

                          <img
                            src={form.mannequinAsset}
                            alt="Outfit Builder asset preview"
                            className="max-h-[200px] max-w-full object-contain"
                            onError={(event) => {
                              event.currentTarget.style.display =
                                "none";
                            }}
                          />

                        </div>

                      </div>
                    )}

                  </div>

                </div>
              )}

            </div>
          </section>

          {/* ACTIONS */}
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">

            <button
              type="button"
              onClick={() =>
                router.push("/admin/products")
              }
              className="rounded-full border border-white/10 px-7 py-4 text-sm font-bold transition hover:bg-white/5"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={save}
              disabled={
                saving ||
                categoriesLoading ||
                categories.length === 0
              }
              className="rounded-full bg-amber-500 px-8 py-4 text-sm font-black text-black transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving
                ? "Creating Product..."
                : "Create Product →"}
            </button>

          </div>

        </div>
      </div>
    </main>
  );
}