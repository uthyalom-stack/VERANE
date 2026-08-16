```jsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

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
  { value: "none", label: "Not outfit compatible" },
  { value: "top", label: "Top" },
  { value: "bottom", label: "Bottom" },
  { value: "footwear", label: "Footwear" },
  { value: "belt", label: "Belt" },
  { value: "bag", label: "Bag" },
];

const emptyForm = {
  name: "",
  brand: "UTHY_LUXURY",
  category: "shirts",
  price: "",
  description: "",
  inventory: "10",
  colors: "",
  style: "",
  occasion: "",
  outfitLayer: "none",
  outfitCompatible: false,
  images: [],
};

export default function AddProductPage() {
  const router = useRouter();

  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const updateField = (field, value) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleBrandChange = (brand) => {
    const firstCategory = categories[brand][0].value;

    setForm((prev) => ({
      ...prev,
      brand,
      category: firstCategory,
    }));
  };

  const handleOutfitToggle = (checked) => {
    setForm((prev) => ({
      ...prev,
      outfitCompatible: checked,
      outfitLayer: checked
        ? prev.outfitLayer === "none"
          ? "top"
          : prev.outfitLayer
        : "none",
    }));
  };

  const handleImages = (e) => {
    const files = Array.from(e.target.files || []);

    if (!files.length) return;

    const remainingSlots = 6 - form.images.length;

    if (remainingSlots <= 0) {
      setError("You can upload a maximum of 6 images.");
      return;
    }

    const selectedFiles = files.slice(0, remainingSlots);

    const invalidFile = selectedFiles.find(
      (file) => !file.type.startsWith("image/")
    );

    if (invalidFile) {
      setError("Only image files are allowed.");
      return;
    }

    const oversizedFile = selectedFiles.find(
      (file) => file.size > 5 * 1024 * 1024
    );

    if (oversizedFile) {
      setError("Each image must be smaller than 5MB.");
      return;
    }

    setError("");

    selectedFiles.forEach((file) => {
      const reader = new FileReader();

      reader.onload = () => {
        setForm((prev) => ({
          ...prev,
          images: [
            ...prev.images,
            {
              preview: reader.result,
              name: file.name,
            },
          ],
        }));
      };

      reader.readAsDataURL(file);
    });

    e.target.value = "";
  };

  const removeImage = (index) => {
    setForm((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
  };

  const moveImage = (index, direction) => {
    setForm((prev) => {
      const images = [...prev.images];
      const newIndex = index + direction;

      if (newIndex < 0 || newIndex >= images.length) {
        return prev;
      }

      [images[index], images[newIndex]] = [
        images[newIndex],
        images[index],
      ];

      return {
        ...prev,
        images,
      };
    });
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

    if (form.outfitCompatible && form.outfitLayer === "none") {
      return "Choose an Outfit Builder layer.";
    }

    if (form.images.length === 0) {
      return "Add at least one product image.";
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

    setLoading(true);

    try {
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
          outfitLayer: form.outfitCompatible
            ? form.outfitLayer
            : "none",
          outfitCompatible: form.outfitCompatible,

          // Keep the existing API contract:
          // images are sent as an array of data URLs.
          images: form.images.map((image) => image.preview),
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
      setLoading(false);
    }
  };

  const brandCategories = categories[form.brand] || [];

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="max-w-5xl mx-auto px-5 sm:px-8 py-10 md:py-16">

        {/* HEADER */}
        <div className="mb-10">
          <Link
            href="/admin/products"
            className="inline-flex items-center gap-2 text-xs text-neutral-500 hover:text-white transition mb-6"
          >
            ← Back to Products
          </Link>

          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div>
              <p className="text-amber-400 text-[10px] font-bold uppercase tracking-[0.35em] mb-3">
                Vérane Admin
              </p>

              <h1 className="text-4xl md:text-6xl font-black tracking-tight">
                Add Product
              </h1>

              <p className="text-neutral-500 mt-3 max-w-xl">
                Add a new piece to the Vérane catalog and,
                optionally, make it available inside the Outfit
                Builder.
              </p>
            </div>

            <div className="text-xs text-neutral-600">
              {form.images.length}/6 images
            </div>
          </div>
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

          {/* BASIC INFORMATION */}
          <section className="rounded-3xl border border-white/10 bg-neutral-950 p-6 md:p-8">
            <div className="mb-7">
              <p className="text-amber-400 text-[10px] font-bold uppercase tracking-[0.25em]">
                01
              </p>

              <h2 className="text-xl font-bold mt-1">
                Product Information
              </h2>

              <p className="text-sm text-neutral-500 mt-1">
                The basic information customers will see.
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
                  placeholder="e.g. Signature Linen Shirt"
                  className="w-full bg-black border border-white/10 rounded-2xl px-5 py-4 text-white outline-none focus:border-amber-500/60 transition"
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
                      placeholder="85000"
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
                    updateField("description", e.target.value)
                  }
                  rows={5}
                  placeholder="Describe the piece, materials, craftsmanship, fit, and other details..."
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
                      updateField("occasion", e.target.value)
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
                The first image becomes the primary product image.
              </p>
            </div>

            <label className="block border border-dashed border-white/15 rounded-2xl p-8 text-center cursor-pointer hover:border-amber-500/40 hover:bg-white/[0.02] transition">
              <div className="text-3xl mb-3">＋</div>

              <p className="font-semibold">
                Add product images
              </p>

              <p className="text-xs text-neutral-600 mt-2">
                JPG, PNG or WEBP · Maximum 5MB each · Up to 6 images
              </p>

              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                onChange={handleImages}
                className="hidden"
              />
            </label>

            {form.images.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-6">
                {form.images.map((image, index) => (
                  <div
                    key={`${image.name}-${index}`}
                    className="relative group"
                  >
                    <div className="aspect-square rounded-2xl overflow-hidden border border-white/10 bg-black">
                      <img
                        src={image.preview}
                        alt={`Product image ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    {index === 0 && (
                      <span className="absolute top-2 left-2 bg-white text-black px-2 py-1 rounded-full text-[8px] font-black uppercase tracking-wider">
                        Primary
                      </span>
                    )}

                    <div className="absolute inset-x-2 bottom-2 flex gap-1 opacity-0 group-hover:opacity-100 transition">
                      <button
                        type="button"
                        onClick={() => moveImage(index, -1)}
                        disabled={index === 0}
                        className="flex-1 bg-black/80 backdrop-blur text-white rounded-lg py-2 text-xs disabled:opacity-30"
                      >
                        ←
                      </button>

                      <button
                        type="button"
                        onClick={() => moveImage(index, 1)}
                        disabled={index === form.images.length - 1}
                        className="flex-1 bg-black/80 backdrop-blur text-white rounded-lg py-2 text-xs disabled:opacity-30"
                      >
                        →
                      </button>

                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="flex-1 bg-red-500/90 text-white rounded-lg py-2 text-xs"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))}
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
                Tell Vérane how this product can be used in a
                complete outfit.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black p-5">

              <label className="flex items-start gap-4 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.outfitCompatible}
                  onChange={(e) =>
                    handleOutfitToggle(e.target.checked)
                  }
                  className="mt-1 w-4 h-4 accent-amber-500"
                />

                <div>
                  <p className="font-semibold">
                    Make this product Outfit Builder compatible
                  </p>

                  <p className="text-xs text-neutral-500 mt-1">
                    Customers will be able to use this piece when
                    creating a complete look.
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
                    {outfitLayers
                      .filter((layer) => layer.value !== "none")
                      .map((layer) => (
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

          {/* SAVE */}
          <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">

            <Link
              href="/admin/products"
              className="px-7 py-4 rounded-full border border-white/10 text-sm font-bold text-center hover:bg-white/5 transition"
            >
              Cancel
            </Link>

            <button
              type="button"
              onClick={save}
              disabled={loading}
              className="px-8 py-4 rounded-full bg-amber-500 text-black text-sm font-black hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {loading ? "Creating Product..." : "Create Product →"}
            </button>
          </div>

        </div>
      </div>
    </main>
  );
}
```
