"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const categories = {
  UTHY_LUXURY: [
    { value: "shirts", label: "Shirts" },
    { value: "trousers", label: "Trousers" },
    { value: "hoodies", label: "Hoodies" },
    { value: "traditional", label: "Traditional Wear" },
  ],
  ALOMZIEE_FOOTIES: [
    { value: "shoes", label: "Shoes" },
    { value: "sandals", label: "Sandals" },
    { value: "slides", label: "Slides" },
    { value: "boots", label: "Boots" },
    { value: "belts", label: "Belts" },
    { value: "bags", label: "Bags" },
  ],
};

const outfitLayers = [
  { value: "top", label: "Top" },
  { value: "bottom", label: "Bottom" },
  { value: "footwear", label: "Footwear" },
  { value: "belt", label: "Belt" },
  { value: "bag", label: "Bag" },
];

export default function AddProductPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    name: "",
    brand: "UTHY_LUXURY",
    category: "shirts",
    price: "",
    description: "",
    inventory: 0,
    colors: "",
    style: "",
    occasion: "",
    images: [],
    outfitCompatible: false,
    outfitLayer: "none",
  });

  const [imageInput, setImageInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const updateField = (field, value) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleBrandChange = (brand) => {
    setForm((prev) => ({
      ...prev,
      brand,
      category: categories[brand]?.[0]?.value || "",
    }));
  };

  const addImage = () => {
    const url = imageInput.trim();

    if (!url) return;

    setForm((prev) => ({
      ...prev,
      images: [...prev.images, url],
    }));

    setImageInput("");
  };

  const removeImage = (index) => {
    setForm((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
  };

  const validate = () => {
    if (!form.name.trim()) {
      return "Product name is required.";
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

      const response = await fetch("/api/products", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: form.name.trim(),
          brand: form.brand,
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
        err.message ||
          "Something went wrong while creating the product."
      );
    } finally {
      setSaving(false);
    }
  };

  const brandCategories = categories[form.brand] || [];

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="max-w-5xl mx-auto px-5 sm:px-8 py-10 md:py-16">

        {/* HEADER */}
        <div className="mb-10">
          <button
            type="button"
            onClick={() => router.push("/admin/products")}
            className="inline-flex items-center gap-2 text-xs text-neutral-500 hover:text-white transition mb-6"
          >
            ← Back to Products
          </button>

          <p className="text-amber-400 text-[10px] font-bold uppercase tracking-[0.35em] mb-3">
            VÉRANE ADMIN
          </p>

          <h1 className="text-4xl md:text-6xl font-black tracking-tight">
            Add Product
          </h1>

          <p className="text-neutral-500 mt-3 max-w-xl">
            Create a new product for UTHY LUXURY or
            ALOMZIEE FOOTIES.
          </p>
        </div>

        {/* ALERTS */}
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
              <p className="text-amber-400 text-[10px] font-bold uppercase tracking-[0.25em]">
                01
              </p>

              <h2 className="text-xl font-bold mt-1">
                Product Information
              </h2>

              <p className="text-sm text-neutral-500 mt-1">
                Add the information customers will see.
              </p>
            </div>

            <div className="space-y-5">

              {/* NAME */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2">
                  Product Name *
                </label>

                <input
                  value={form.name}
                  onChange={(e) =>
                    updateField("name", e.target.value)
                  }
                  placeholder="Product name"
                  className="w-full bg-black border border-white/10 rounded-2xl px-5 py-4 text-white outline-none focus:border-amber-500/60"
                />
              </div>

              {/* BRAND + CATEGORY */}
              <div className="grid md:grid-cols-2 gap-5">

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2">
                    Brand
                  </label>

                  <select
                    value={form.brand}
                    onChange={(e) =>
                      handleBrandChange(e.target.value)
                    }
                    className="w-full bg-black border border-white/10 rounded-2xl px-5 py-4 text-white outline-none focus:border-amber-500/60"
                  >
                    <option value="UTHY_LUXURY">
                      UTHY LUXURY
                    </option>

                    <option value="ALOMZIEE_FOOTIES">
                      ALOMZIEE FOOTIES
                    </option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2">
                    Category
                  </label>

                  <select
                    value={form.category}
                    onChange={(e) =>
                      updateField("category", e.target.value)
                    }
                    className="w-full bg-black border border-white/10 rounded-2xl px-5 py-4 text-white outline-none focus:border-amber-500/60"
                  >
                    {brandCategories.map((category) => (
                      <option
                        key={category.value}
                        value={category.value}
                      >
                        {category.label}
                      </option>
                    ))}
                  </select>
                </div>

              </div>

              {/* PRICE + INVENTORY */}
              <div className="grid md:grid-cols-2 gap-5">

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2">
                    Price (₦) *
                  </label>

                  <div className="relative">
                    <span className="absolute left-5 top-1/2 -translate-y-1/2 text-neutral-500">
                      ₦
                    </span>

                    <input
                      value={form.price}
                      onChange={(e) =>
                        updateField("price", e.target.value)
                      }
                      type="number"
                      min="0"
                      step="1"
                      placeholder="0"
                      className="w-full bg-black border border-white/10 rounded-2xl pl-10 pr-5 py-4 text-white outline-none focus:border-amber-500/60"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2">
                    Inventory
                  </label>

                  <input
                    value={form.inventory}
                    onChange={(e) =>
                      updateField("inventory", e.target.value)
                    }
                    type="number"
                    min="0"
                    step="1"
                    className="w-full bg-black border border-white/10 rounded-2xl px-5 py-4 text-white outline-none focus:border-amber-500/60"
                  />
                </div>

              </div>

              {/* DESCRIPTION */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2">
                  Description
                </label>

                <textarea
                  value={form.description}
                  onChange={(e) =>
                    updateField(
                      "description",
                      e.target.value
                    )
                  }
                  rows={5}
                  placeholder="Describe the product..."
                  className="w-full bg-black border border-white/10 rounded-2xl px-5 py-4 text-white outline-none focus:border-amber-500/60 resize-none"
                />

                <p className="text-[11px] text-neutral-600 mt-2">
                  {form.description.length} characters
                </p>
              </div>

              {/* STYLE + OCCASION */}
              <div className="grid md:grid-cols-2 gap-5">

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2">
                    Style
                  </label>

                  <input
                    value={form.style}
                    onChange={(e) =>
                      updateField("style", e.target.value)
                    }
                    placeholder="Minimal, Classic, Streetwear..."
                    className="w-full bg-black border border-white/10 rounded-2xl px-5 py-4 text-white outline-none focus:border-amber-500/60"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2">
                    Occasion
                  </label>

                  <input
                    value={form.occasion}
                    onChange={(e) =>
                      updateField(
                        "occasion",
                        e.target.value
                      )
                    }
                    placeholder="Wedding, Casual, Formal..."
                    className="w-full bg-black border border-white/10 rounded-2xl px-5 py-4 text-white outline-none focus:border-amber-500/60"
                  />
                </div>

              </div>

              {/* COLORS */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2">
                  Colors
                </label>

                <input
                  value={form.colors}
                  onChange={(e) =>
                    updateField("colors", e.target.value)
                  }
                  placeholder="Black, White, Gold"
                  className="w-full bg-black border border-white/10 rounded-2xl px-5 py-4 text-white outline-none focus:border-amber-500/60"
                />

                <p className="text-[11px] text-neutral-600 mt-2">
                  Separate multiple colors with commas.
                </p>
              </div>

            </div>
          </section>

          {/* IMAGES */}
          <section className="rounded-3xl border border-white/10 bg-neutral-950 p-6 md:p-8">

            <div className="mb-7">
              <p className="text-amber-400 text-[10px] font-bold uppercase tracking-[0.25em]">
                02
              </p>

              <h2 className="text-xl font-bold mt-1">
                Product Images
              </h2>

              <p className="text-sm text-neutral-500 mt-1">
                Add the image URLs for this product.
              </p>
            </div>

            <div className="flex gap-3">

              <input
                value={imageInput}
                onChange={(e) =>
                  setImageInput(e.target.value)
                }
                placeholder="https://..."
                className="flex-1 bg-black border border-white/10 rounded-2xl px-5 py-4 text-white outline-none focus:border-amber-500/60"
              />

              <button
                type="button"
                onClick={addImage}
                className="px-6 rounded-2xl bg-white text-black text-sm font-black hover:bg-neutral-200 transition"
              >
                Add
              </button>

            </div>

            {form.images.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-5">

                {form.images.map((image, index) => (
                  <div
                    key={`${image}-${index}`}
                    className="relative aspect-square rounded-2xl overflow-hidden border border-white/10 bg-black"
                  >
                    <img
                      src={image}
                      alt={`Product image ${index + 1}`}
                      className="w-full h-full object-cover"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        removeImage(index)
                      }
                      className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/80 text-white text-xs"
                    >
                      ×
                    </button>
                  </div>
                ))}

              </div>
            ) : (
              <div className="mt-5 border border-dashed border-white/10 rounded-2xl p-10 text-center">
                <p className="text-sm text-neutral-500">
                  No images added yet.
                </p>
              </div>
            )}

          </section>

          {/* OUTFIT BUILDER */}
          <section className="rounded-3xl border border-white/10 bg-neutral-950 p-6 md:p-8">

            <div className="mb-7">
              <p className="text-amber-400 text-[10px] font-bold uppercase tracking-[0.25em]">
                03
              </p>

              <h2 className="text-xl font-bold mt-1">
                Outfit Builder
              </h2>

              <p className="text-sm text-neutral-500 mt-1">
                Decide whether customers can use this product
                inside the Outfit Builder.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black p-5">

              <label className="flex items-start gap-4 cursor-pointer">

                <input
                  type="checkbox"
                  checked={form.outfitCompatible}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      outfitCompatible:
                        e.target.checked,
                      outfitLayer:
                        e.target.checked
                          ? prev.outfitLayer === "none"
                            ? "top"
                            : prev.outfitLayer
                          : "none",
                    }))
                  }
                  className="mt-1 w-4 h-4 accent-amber-500"
                />

                <div>
                  <p className="font-semibold">
                    Make this product Outfit Builder compatible
                  </p>

                  <p className="text-xs text-neutral-500 mt-1">
                    Customers can use this piece when creating
                    a complete look.
                  </p>
                </div>

              </label>

              {form.outfitCompatible && (
                <div className="mt-6 pt-6 border-t border-white/10">

                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2">
                    Outfit Layer
                  </label>

                  <select
                    value={form.outfitLayer}
                    onChange={(e) =>
                      updateField(
                        "outfitLayer",
                        e.target.value
                      )
                    }
                    className="w-full bg-neutral-950 border border-white/10 rounded-2xl px-5 py-4 text-white outline-none focus:border-amber-500/60"
                  >
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
              )}

            </div>
          </section>

          {/* ACTIONS */}
          <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">

            <button
              type="button"
              onClick={() =>
                router.push("/admin/products")
              }
              className="px-7 py-4 rounded-full border border-white/10 text-sm font-bold hover:bg-white/5 transition"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="px-8 py-4 rounded-full bg-amber-500 text-black text-sm font-black hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed transition"
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