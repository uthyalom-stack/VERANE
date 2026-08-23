"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const outfitLayers = [
  { value: "top", label: "Top" },
  { value: "bottom", label: "Bottom" },
  { value: "feet", label: "Feet" },
  { value: "waist", label: "Waist" },
  { value: "hand", label: "Hand" },
];

const COLOR_PALETTE = [
  { name: "Black", hex: "#000000" },
  { name: "White", hex: "#FFFFFF" },
  { name: "Ivory", hex: "#FFFFF0" },
  { name: "Cream", hex: "#FFFDD0" },
  { name: "Beige", hex: "#F5F5DC" },
  { name: "Brown", hex: "#8B4513" },
  { name: "Chocolate", hex: "#3B1F14" },
  { name: "Camel", hex: "#C19A6B" },
  { name: "Red", hex: "#DC2626" },
  { name: "Burgundy", hex: "#800020" },
  { name: "Pink", hex: "#EC4899" },
  { name: "Rose", hex: "#F43F5E" },
  { name: "Orange", hex: "#F97316" },
  { name: "Yellow", hex: "#EAB308" },
  { name: "Gold", hex: "#D4AF37" },
  { name: "Green", hex: "#16A34A" },
  { name: "Olive", hex: "#808000" },
  { name: "Emerald", hex: "#059669" },
  { name: "Blue", hex: "#2563EB" },
  { name: "Navy", hex: "#1E3A8A" },
  { name: "Sky Blue", hex: "#38BDF8" },
  { name: "Purple", hex: "#7C3AED" },
  { name: "Lavender", hex: "#A78BFA" },
  { name: "Grey", hex: "#6B7280" },
  { name: "Silver", hex: "#C0C0C0" },
];

const CLOTHING_SIZES = ["S", "M", "L", "XL", "XXL"];

const NUMBER_SIZES = Array.from(
  { length: 100 },
  (_, index) => String(index + 1)
);

function makeId() {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random()}`;
}

function compressImage(file, maxWidth = 1400) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => reject(new Error("Could not read image."));

    reader.onload = () => {
      const image = new Image();

      image.onerror = () => reject(new Error("Invalid image file."));

      image.onload = () => {
        let width = image.naturalWidth;
        let height = image.naturalHeight;

        if (width > maxWidth) {
          height = Math.round((height / width) * maxWidth);
          width = maxWidth;
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const context = canvas.getContext("2d");

        if (!context) {
          reject(new Error("Image processing is unavailable."));
          return;
        }

        context.drawImage(image, 0, 0, width, height);

        const dataUrl = canvas.toDataURL("image/webp", 0.82);

        resolve(dataUrl);
      };

      image.src = reader.result;
    };

    reader.readAsDataURL(file);
  });
}

function isFootwearCategory(category) {
  if (!category) return false;

  const value = `${category.slug || ""} ${category.name || ""}`.toLowerCase();

  return [
    "shoe",
    "shoes",
    "sandal",
    "sandals",
    "slide",
    "slides",
    "boot",
    "boots",
    "footwear",
  ].some((word) => value.includes(word));
}

function isBeltCategory(category) {
  if (!category) return false;

  const value = `${category.slug || ""} ${category.name || ""}`.toLowerCase();

  return value.includes("belt");
}

function isClothingCategory(category) {
  if (!category) return false;

  const value = `${category.slug || ""} ${category.name || ""}`.toLowerCase();

  return [
    "shirt",
    "shirts",
    "trouser",
    "trousers",
    "hoodie",
    "hoodies",
    "traditional",
    "cloth",
    "clothing",
    "top",
    "bottom",
  ].some((word) => value.includes(word));
}

export default function AddProductPage() {
  const router = useRouter();

  const imagePickerRef = useRef(null);
  const mannequinPickerRef = useRef(null);

  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);

  const [uploading, setUploading] = useState(false);
  const [mannequinUploading, setMannequinUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [form, setForm] = useState({
    name: "",
    category: "",
    price: "",
    description: "",
    style: "",
    occasion: "",

    images: [],

    colors: [],

    sizeType: "none",
    sizes: [],

    variantStock: {},

    preOrderEnabled: false,
    customSizingEnabled: false,
    fulfillmentTime: "",

    outfitCompatible: false,
    outfitLayer: "none",
    mannequinAsset: "",
  });

  useEffect(() => {
    loadCategories();
  }, []);

  async function loadCategories() {
    try {
      setCategoriesLoading(true);

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

      const available = Array.isArray(data)
        ? data.filter((category) => category.enabled !== false)
        : [];

      setCategories(available);

      setForm((current) => ({
        ...current,
        category:
          current.category ||
          available[0]?.id ||
          "",
      }));
    } catch (err) {
      setError(
        err?.message ||
          "Unable to load categories."
      );
    } finally {
      setCategoriesLoading(false);
    }
  }

  function updateField(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));

    setError("");
  }

  const selectedCategory = useMemo(() => {
    return categories.find(
      (category) =>
        category.id === form.category
    );
  }, [categories, form.category]);

  const footwear = isFootwearCategory(
    selectedCategory
  );

  const belt = isBeltCategory(
    selectedCategory
  );

  const clothing = isClothingCategory(
    selectedCategory
  );

  const sizeOptions = useMemo(() => {
    if (footwear) {
      return NUMBER_SIZES;
    }

    if (belt) {
      return NUMBER_SIZES;
    }

    if (clothing) {
      return CLOTHING_SIZES;
    }

    return [];
  }, [footwear, belt, clothing]);

  useEffect(() => {
    if (!selectedCategory) return;

    let nextType = "none";

    if (footwear) {
      nextType = "footwear";
    } else if (belt) {
      nextType = "waist";
    } else if (clothing) {
      nextType = "clothing";
    }

    setForm((current) => {
      if (current.sizeType === nextType) {
        return current;
      }

      return {
        ...current,
        sizeType: nextType,
        sizes: [],
        variantStock: {},
      };
    });
  }, [
    selectedCategory,
    footwear,
    belt,
    clothing,
  ]);

  async function handleImageFiles(fileList) {
    const files = Array.from(
      fileList || []
    ).filter((file) =>
      file.type.startsWith("image/")
    );

    if (!files.length) return;

    try {
      setUploading(true);
      setError("");

      const processed = [];

      for (const file of files) {
        const src = await compressImage(file);

        processed.push({
          id: makeId(),
          name: file.name,
          src,
        });
      }

      setForm((current) => ({
        ...current,
        images: [
          ...current.images,
          ...processed,
        ],
      }));
    } catch (err) {
      setError(
        err?.message ||
          "One or more images could not be processed."
      );
    } finally {
      setUploading(false);
    }
  }

  async function handleMannequinFile(file) {
    if (
      !file ||
      !file.type.startsWith("image/")
    ) {
      return;
    }

    try {
      setMannequinUploading(true);

      const src = await compressImage(
        file,
        1800
      );

      updateField(
        "mannequinAsset",
        src
      );
    } catch (err) {
      setError(
        err?.message ||
          "Could not process the Outfit Builder image."
      );
    } finally {
      setMannequinUploading(false);
    }
  }

  function removeImage(id) {
    setForm((current) => ({
      ...current,
      images: current.images.filter(
        (image) => image.id !== id
      ),
    }));
  }

  function moveImage(index, direction) {
    setForm((current) => {
      const next = [...current.images];

      const target =
        index + direction;

      if (
        target < 0 ||
        target >= next.length
      ) {
        return current;
      }

      [
        next[index],
        next[target],
      ] = [
        next[target],
        next[index],
      ];

      return {
        ...current,
        images: next,
      };
    });
  }

  function addPaletteColor(color) {
    setForm((current) => {
      const exists = current.colors.some(
        (item) =>
          item.hex.toLowerCase() ===
          color.hex.toLowerCase()
      );

      if (exists) {
        return current;
      }

      return {
        ...current,
        colors: [
          ...current.colors,
          {
            id: makeId(),
            name: color.name,
            hex: color.hex,
          },
        ],
      };
    });

    setError("");
  }

  function addCustomColor(event) {
    const hex = event.target.value;

    setForm((current) => {
      const exists = current.colors.some(
        (item) =>
          item.hex.toLowerCase() ===
          hex.toLowerCase()
      );

      if (exists) {
        return current;
      }

      return {
        ...current,
        colors: [
          ...current.colors,
          {
            id: makeId(),
            name: "Custom",
            hex,
          },
        ],
      };
    });

    setError("");
  }

  function removeColor(colorId) {
    setForm((current) => {
      const removedColor = current.colors.find(
        (color) => color.id === colorId
      );

      const nextStock = {
        ...current.variantStock,
      };

      if (removedColor) {
        Object.keys(nextStock).forEach(
          (key) => {
            if (
              key === removedColor.id ||
              key.startsWith(
                `${removedColor.id}__`
              )
            ) {
              delete nextStock[key];
            }
          }
        );
      }

      return {
        ...current,
        colors: current.colors.filter(
          (color) =>
            color.id !== colorId
        ),
        variantStock: nextStock,
      };
    });
  }

  function toggleSize(size) {
    setForm((current) => {
      const exists =
        current.sizes.includes(size);

      const nextSizes = exists
        ? current.sizes.filter(
            (item) => item !== size
          )
        : [
            ...current.sizes,
            size,
          ];

      const nextStock = {
        ...current.variantStock,
      };

      if (exists) {
        current.colors.forEach(
          (color) => {
            delete nextStock[
              `${color.id}__${size}`
            ];
          }
        );
      }

      return {
        ...current,
        sizes: nextSizes,
        variantStock: nextStock,
      };
    });

    setError("");
  }

  function updateVariantStock(
    colorId,
    size,
    value
  ) {
    const numeric =
      value === ""
        ? ""
        : Math.max(
            0,
            Number(value) || 0
          );

    /*
      Products WITH sizes:
      colorId__size

      Products WITHOUT sizes:
      colorId
    */
    const key =
      size === null
        ? colorId
        : `${colorId}__${size}`;

    setForm((current) => ({
      ...current,
      variantStock: {
        ...current.variantStock,
        [key]: numeric,
      },
    }));

    setError("");
  }

  function getTotalInventory() {
    if (!form.colors.length) {
      return 0;
    }

    /*
      Products without sizes such as:
      bags, wallets, and other accessories.

      Inventory is tracked directly by color.
    */
    if (!form.sizes.length) {
      return form.colors.reduce(
        (total, color) => {
          return (
            total +
            (Number(
              form.variantStock[color.id]
            ) || 0)
          );
        },
        0
      );
    }

    /*
      Products with sizes:
      inventory is tracked by color + size.
    */
    return form.colors.reduce(
      (total, color) => {
        return (
          total +
          form.sizes.reduce(
            (sizeTotal, size) => {
              const value =
                form.variantStock[
                  `${color.id}__${size}`
                ];

              return (
                sizeTotal +
                (Number(value) || 0)
              );
            },
            0
          )
        );
      },
      0
    );
  }

  function validate() {
    if (!form.name.trim()) {
      return "Product name is required.";
    }

    if (!form.category) {
      return "Choose a category.";
    }

    if (!categories.length) {
      return "Create a category before adding a product.";
    }

    const price = Number(form.price);

    if (
      !Number.isFinite(price) ||
      price <= 0
    ) {
      return "Enter a valid product price.";
    }

    if (!form.images.length) {
      return "Add at least one product image.";
    }

    if (!form.colors.length) {
      return "Choose at least one product color.";
    }

    if (
      form.sizeType !== "none" &&
      !form.sizes.length
    ) {
      return "Choose at least one available size.";
    }

    /*
      INVENTORY VALIDATION

      If the product has sizes:
      every color + size needs inventory.

      If the product has NO sizes:
      every color needs inventory directly.
    */
    if (form.colors.length) {
      if (form.sizes.length) {
        for (const color of form.colors) {
          for (const size of form.sizes) {
            const key =
              `${color.id}__${size}`;

            const value =
              form.variantStock[key];

            if (
              value === "" ||
              value === undefined ||
              !Number.isInteger(
                Number(value)
              ) ||
              Number(value) < 0
            ) {
              return `Enter stock for ${color.name} — ${size}.`;
            }
          }
        }
      } else {
        for (const color of form.colors) {
          const value =
            form.variantStock[color.id];

          if (
            value === "" ||
            value === undefined ||
            !Number.isInteger(
              Number(value)
            ) ||
            Number(value) < 0
          ) {
            return `Enter inventory for ${color.name}.`;
          }
        }
      }
    }

    if (
      form.outfitCompatible &&
      form.outfitLayer === "none"
    ) {
      return "Choose an Outfit Builder layer.";
    }

    if (
      form.outfitCompatible &&
      !form.mannequinAsset
    ) {
      return "Add the transparent Outfit Builder image.";
    }

    if (
      form.customSizingEnabled &&
      !form.preOrderEnabled
    ) {
      return "Custom sizing is only available for pre-order products.";
    }

    if (
      form.preOrderEnabled &&
      !form.fulfillmentTime.trim()
    ) {
      return "Enter the expected fulfillment time for the pre-order.";
    }

    return "";
  }

  async function save() {
    const validationError =
      validate();

    setError("");
    setSuccess("");

    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setSaving(true);

      const variants = [];

      /*
        Products WITH colors and sizes.
      */
      if (
        form.colors.length &&
        form.sizes.length
      ) {
        form.colors.forEach((color) => {
          form.sizes.forEach((size) => {
            const key =
              `${color.id}__${size}`;

            const stock =
              Number(
                form.variantStock[key]
              ) || 0;

            variants.push({
              colorName: color.name,
              colorHex: color.hex,
              size,
              stock,
              initialStock: stock,
            });
          });
        });
      }

      /*
        Products WITH colors but WITHOUT sizes.

        This is for products such as:
        - Bags
        - Wallets
        - Accessories
        - Any other product where size is not required.

        Inventory is taken directly from:
        form.variantStock[color.id]
      */
      else if (form.colors.length) {
        form.colors.forEach((color) => {
          const stock =
            Number(
              form.variantStock[color.id]
            ) || 0;

          variants.push({
            colorName: color.name,
            colorHex: color.hex,
            size: null,
            stock,
            initialStock: stock,
          });
        });
      }

      const totalInventory =
        variants.length
          ? variants.reduce(
              (total, variant) =>
                total +
                Number(
                  variant.stock
                ),
              0
            )
          : 0;

      const response = await fetch(
        "/api/admin/products",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            name: form.name.trim(),

            category: form.category,

            price: Number(form.price),

            description:
              form.description.trim(),

            inventory:
              totalInventory,

            initialInventory:
              totalInventory,

            colors: form.colors,

            variants,

            style:
              form.style.trim(),

            occasion:
              form.occasion.trim(),

            images:
              form.images.map(
                (image) => image.src
              ),

            preOrderEnabled:
              form.preOrderEnabled,

            customSizingEnabled:
              form.customSizingEnabled,

            fulfillmentTime:
              form.preOrderEnabled
                ? form.fulfillmentTime.trim()
                : "",

            sizeType:
              form.sizeType,

            outfitCompatible:
              form.outfitCompatible,

            outfitLayer:
              form.outfitCompatible
                ? form.outfitLayer
                : "none",

            mannequinAsset:
              form.outfitCompatible
                ? form.mannequinAsset
                : "",
          }),
        }
      );

      const data =
        await response
          .json()
          .catch(() => null);

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Failed to create product."
        );
      }

      setSuccess(
        "Product created successfully."
      );

      setTimeout(() => {
        router.push(
          "/admin/products"
        );
        router.refresh();
      }, 600);
    } catch (err) {
      setError(
        err?.message ||
          "Something went wrong while creating the product."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#070707] text-white">
      <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8 md:py-14">

        <button
          type="button"
          onClick={() =>
            router.push(
              "/admin/products"
            )
          }
          className="mb-7 text-xs text-neutral-500 transition hover:text-white"
        >
          ← Back to Products
        </button>

        <div className="mb-9">
          <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-amber-400">
            STORE ADMIN
          </p>

          <h1 className="mt-2 text-4xl font-black tracking-tight md:text-6xl">
            Add Product
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-neutral-500">
            Create a complete product with
            real images, colors, sizes,
            inventory and Outfit Builder
            settings.
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-2xl border border-red-500/20 bg-red-500/5 px-5 py-4 text-sm text-red-300">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 px-5 py-4 text-sm text-emerald-300">
            {success}
          </div>
        )}

        <div className="space-y-6">

          {/* PRODUCT INFORMATION */}

          <section className="rounded-3xl border border-white/10 bg-neutral-950 p-6 md:p-8">
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-amber-400">
              01
            </p>

            <h2 className="mt-1 text-xl font-black">
              Product Information
            </h2>

            <div className="mt-7 space-y-5">

              <Field label="Product Name *">
                <input
                  value={form.name}
                  onChange={(e) =>
                    updateField(
                      "name",
                      e.target.value
                    )
                  }
                  placeholder="Product name"
                  className="input"
                />
              </Field>

              <Field label="Category *">
                {categoriesLoading ? (
                  <div className="input text-neutral-600">
                    Loading categories...
                  </div>
                ) : (
                  <select
                    value={
                      form.category
                    }
                    onChange={(e) =>
                      updateField(
                        "category",
                        e.target.value
                      )
                    }
                    className="input"
                  >
                    <option value="">
                      Select a category
                    </option>

                    {categories.map(
                      (category) => (
                        <option
                          key={
                            category.id
                          }
                          value={
                            category.id
                          }
                        >
                          {category.name}
                        </option>
                      )
                    )}
                  </select>
                )}
              </Field>

              <div className="grid gap-5 md:grid-cols-2">

                <Field label="Price (₦) *">
                  <input
                    value={
                      form.price
                    }
                    onChange={(e) =>
                      updateField(
                        "price",
                        e.target.value
                      )
                    }
                    type="number"
                    min="0"
                    step="1"
                    placeholder="0"
                    className="input"
                  />
                </Field>

                <Field label="Inventory">
                  <div className="input flex items-center justify-between">
                    <span>
                      {getTotalInventory()}
                    </span>

                    <span className="text-xs text-neutral-600">
                      calculated from variants
                    </span>
                  </div>
                </Field>

              </div>

              <Field label="Description">
                <textarea
                  value={
                    form.description
                  }
                  onChange={(e) =>
                    updateField(
                      "description",
                      e.target.value
                    )
                  }
                  rows={5}
                  placeholder="Describe the product..."
                  className="input resize-none"
                />
              </Field>

              <div className="grid gap-5 md:grid-cols-2">

                <Field label="Style">
                  <input
                    value={form.style}
                    onChange={(e) =>
                      updateField(
                        "style",
                        e.target.value
                      )
                    }
                    placeholder="Minimal, Classic, Streetwear..."
                    className="input"
                  />
                </Field>

                <Field label="Occasion">
                  <input
                    value={
                      form.occasion
                    }
                    onChange={(e) =>
                      updateField(
                        "occasion",
                        e.target.value
                      )
                    }
                    placeholder="Wedding, Casual, Formal..."
                    className="input"
                  />
                </Field>

              </div>

            </div>
          </section>

          {/* COLORS */}

          <section className="rounded-3xl border border-white/10 bg-neutral-950 p-6 md:p-8">

            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-amber-400">
              02
            </p>

            <h2 className="mt-1 text-xl font-black">
              Product Colors
            </h2>

            <p className="mt-2 max-w-2xl text-sm text-neutral-500">
              Choose the actual colors available
              for this product. Customers will see
              these real colors instead of generic
              text such as black or white.
            </p>

            <div className="mt-6">

              <p className="mb-3 text-xs font-bold uppercase tracking-wider text-neutral-400">
                Color Palette
              </p>

              <div className="grid grid-cols-6 gap-3 sm:grid-cols-8 md:grid-cols-12">

                {COLOR_PALETTE.map(
                  (color) => {
                    const selected =
                      form.colors.some(
                        (item) =>
                          item.hex.toLowerCase() ===
                          color.hex.toLowerCase()
                      );

                    return (
                      <button
                        key={
                          color.hex
                        }
                        type="button"
                        title={
                          color.name
                        }
                        onClick={() =>
                          addPaletteColor(
                            color
                          )
                        }
                        className={`group flex flex-col items-center gap-2 ${
                          selected
                            ? "opacity-100"
                            : "opacity-70 hover:opacity-100"
                        }`}
                      >
                        <span
                          className={`relative h-10 w-10 rounded-full border-2 transition ${
                            selected
                              ? "border-amber-400 scale-110"
                              : "border-white/20"
                          }`}
                          style={{
                            backgroundColor:
                              color.hex,
                          }}
                        >
                          {selected && (
                            <span className="absolute inset-0 flex items-center justify-center text-xs font-black text-white drop-shadow-[0_1px_3px_rgba(0,0,0,.9)]">
                              ✓
                            </span>
                          )}
                        </span>

                        <span className="max-w-[60px] truncate text-[9px] text-neutral-500">
                          {
                            color.name
                          }
                        </span>
                      </button>
                    );
                  }
                )}

                <label className="group flex cursor-pointer flex-col items-center gap-2 opacity-70 hover:opacity-100">

                  <span className="relative h-10 w-10 overflow-hidden rounded-full border-2 border-dashed border-white/20">

                    <input
                      type="color"
                      onChange={
                        addCustomColor
                      }
                      className="absolute inset-[-8px] h-14 w-14 cursor-pointer"
                    />

                  </span>

                  <span className="text-[9px] text-neutral-500">
                    Custom
                  </span>

                </label>

              </div>
            </div>

            {form.colors.length > 0 && (
              <div className="mt-8">

                <p className="mb-3 text-xs font-bold uppercase tracking-wider text-neutral-400">
                  Selected Colors
                </p>

                <div className="flex flex-wrap gap-3">

                  {form.colors.map(
                    (color) => (
                      <div
                        key={
                          color.id
                        }
                        className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black px-3 py-2"
                      >

                        <span
                          className="h-7 w-7 rounded-full border border-white/20"
                          style={{
                            backgroundColor:
                              color.hex,
                          }}
                        />

                        <div>
                          <p className="text-xs font-bold">
                            {
                              color.name
                            }
                          </p>

                          <p className="text-[9px] text-neutral-600">
                            {
                              color.hex
                            }
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            removeColor(
                              color.id
                            )
                          }
                          className="ml-1 text-xs text-red-300 hover:text-red-200"
                        >
                          ×
                        </button>

                      </div>
                    )
                  )}

                </div>
              </div>
            )}

          </section>

          {/* SIZES + INVENTORY */}

          <section className="rounded-3xl border border-white/10 bg-neutral-950 p-6 md:p-8">

            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-amber-400">
              03
            </p>

            <h2 className="mt-1 text-xl font-black">
              Sizes & Inventory
            </h2>

            <p className="mt-2 text-sm text-neutral-500">
              Stock is tracked separately for
              every color and size.
            </p>

            {!selectedCategory ? (
              <div className="mt-6 rounded-2xl border border-white/10 bg-black p-5 text-sm text-neutral-500">
                Choose a category first so we can
                determine the appropriate sizing
                system.
              </div>
            ) : (
              <div className="mt-6 space-y-6">

                <div className="rounded-2xl border border-white/10 bg-black p-5">

                  <p className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                    Size System
                  </p>

                  <p className="mt-2 text-sm text-white">
                    {footwear
                      ? "Footwear sizing — numeric sizes 1–100"
                      : belt
                      ? "Waist sizing — numeric sizes 1–100"
                      : clothing
                      ? "Clothing sizing — S, M, L, XL, XXL"
                      : "This category does not require standard sizing."}
                  </p>

                </div>

                {sizeOptions.length >
                  0 && (
                  <div>

                    <p className="mb-3 text-xs font-bold uppercase tracking-wider text-neutral-400">
                      Available Sizes
                    </p>

                    <div className="flex flex-wrap gap-2">

                      {sizeOptions.map(
                        (size) => {
                          const selected =
                            form.sizes.includes(
                              size
                            );

                          return (
                            <button
                              key={
                                size
                              }
                              type="button"
                              onClick={() =>
                                toggleSize(
                                  size
                                )
                              }
                              className={`min-w-14 rounded-xl border px-4 py-3 text-xs font-black transition ${
                                selected
                                  ? "border-amber-400 bg-amber-400 text-black"
                                  : "border-white/10 bg-black text-neutral-400 hover:border-white/30 hover:text-white"
                              }`}
                            >
                              {
                                size
                              }
                            </button>
                          );
                        }
                      )}

                    </div>

                  </div>
                )}

                {form.colors.length >
                  0 &&
                  form.sizes.length >
                    0 && (
                    <div>

                      <div className="mb-4">
                        <p className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                          Stock By Variant
                        </p>

                        <p className="mt-1 text-[11px] text-neutral-600">
                          Enter the number of
                          units available for
                          each color and size.
                        </p>
                      </div>

                      <div className="overflow-x-auto rounded-2xl border border-white/10">

                        <table className="w-full min-w-[650px] border-collapse">

                          <thead>
                            <tr className="border-b border-white/10 bg-black">

                              <th className="px-4 py-4 text-left text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                                Color
                              </th>

                              {form.sizes.map(
                                (size) => (
                                  <th
                                    key={
                                      size
                                    }
                                    className="px-3 py-4 text-center text-[10px] font-bold uppercase tracking-wider text-neutral-500"
                                  >
                                    {
                                      size
                                    }
                                  </th>
                                )
                              )}

                            </tr>
                          </thead>

                          <tbody>

                            {form.colors.map(
                              (color) => (
                                <tr
                                  key={
                                    color.id
                                  }
                                  className="border-b border-white/5 last:border-0"
                                >

                                  <td className="px-4 py-4">

                                    <div className="flex items-center gap-3">

                                      <span
                                        className="h-7 w-7 rounded-full border border-white/20"
                                        style={{
                                          backgroundColor:
                                            color.hex,
                                        }}
                                      />

                                      <span className="text-xs font-bold">
                                        {
                                          color.name
                                        }
                                      </span>

                                    </div>

                                  </td>

                                  {form.sizes.map(
                                    (size) => {
                                      const key =
                                        `${color.id}__${size}`;

                                      return (
                                        <td
                                          key={
                                            key
                                          }
                                          className="px-3 py-3"
                                        >
                                          <input
                                            type="number"
                                            min="0"
                                            step="1"
                                            value={
                                              form.variantStock[
                                                key
                                              ] ??
                                              ""
                                            }
                                            onChange={(
                                              e
                                            ) =>
                                              updateVariantStock(
                                                color.id,
                                                size,
                                                e
                                                  .target
                                                  .value
                                              )
                                            }
                                            className="w-20 rounded-xl border border-white/10 bg-black px-3 py-3 text-center text-sm text-white outline-none focus:border-amber-400/60"
                                          />
                                        </td>
                                      );
                                    }
                                  )}

                                </tr>
                              )
                            )}

                          </tbody>

                        </table>

                      </div>

                      <div className="mt-4 flex items-center justify-between rounded-2xl border border-white/10 bg-black px-5 py-4">

                        <span className="text-xs text-neutral-500">
                          Total inventory
                        </span>

                        <span className="text-lg font-black text-white">
                          {
                            getTotalInventory()
                          }
                        </span>

                      </div>

                    </div>
                  )}

                {form.colors.length > 0 &&
                  form.sizes.length === 0 && (
                    <div>

                      <div className="mb-4">
                        <p className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                          Inventory By Color
                        </p>

                        <p className="mt-1 text-[11px] text-neutral-600">
                          This product does not use
                          sizes. Enter the number of
                          units currently available
                          for each color.
                        </p>
                      </div>

                      <div className="space-y-3">

                        {form.colors.map(
                          (color) => (
                            <div
                              key={
                                color.id
                              }
                              className="flex items-center justify-between rounded-2xl border border-white/10 bg-black px-5 py-4"
                            >

                              <div className="flex items-center gap-3">

                                <span
                                  className="h-8 w-8 rounded-full border border-white/20"
                                  style={{
                                    backgroundColor:
                                      color.hex,
                                  }}
                                />

                                <div>
                                  <p className="text-sm font-bold">
                                    {
                                      color.name
                                    }
                                  </p>

                                  <p className="text-[9px] text-neutral-600">
                                    {
                                      color.hex
                                    }
                                  </p>
                                </div>

                              </div>

                              <input
                                type="number"
                                min="0"
                                step="1"
                                value={
                                  form.variantStock[
                                    color.id
                                  ] ?? ""
                                }
                                onChange={(
                                  e
                                ) =>
                                  updateVariantStock(
                                    color.id,
                                    null,
                                    e.target.value
                                  )
                                }
                                placeholder="0"
                                className="w-24 rounded-xl border border-white/10 bg-black px-3 py-3 text-center text-sm text-white outline-none focus:border-amber-400/60"
                              />

                            </div>
                          )
                        )}

                      </div>

                      <div className="mt-4 flex items-center justify-between rounded-2xl border border-white/10 bg-black px-5 py-4">

                        <span className="text-xs text-neutral-500">
                          Total inventory
                        </span>

                        <span className="text-lg font-black text-white">
                          {
                            getTotalInventory()
                          }
                        </span>

                      </div>

                    </div>
                  )}

              </div>
            )}

          </section>

          {/* PRE-ORDER / CUSTOM SIZING */}

          <section className="rounded-3xl border border-white/10 bg-neutral-950 p-6 md:p-8">

            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-amber-400">
              04
            </p>

            <h2 className="mt-1 text-xl font-black">
              Availability & Custom Orders
            </h2>

            <p className="mt-2 text-sm text-neutral-500">
              Control whether customers can
              purchase from available stock or
              place a made-to-order request.
            </p>

            <div className="mt-6 space-y-4">

              <label className="flex cursor-pointer items-center justify-between rounded-2xl border border-white/10 bg-black p-5">

                <div>
                  <p className="text-sm font-black">
                    Enable Pre-Order
                  </p>

                  <p className="mt-1 text-xs text-neutral-600">
                    Customers can purchase even
                    when the product is being made
                    or prepared.
                  </p>
                </div>

                <input
                  type="checkbox"
                  checked={
                    form.preOrderEnabled
                  }
                  onChange={(e) =>
                    updateField(
                      "preOrderEnabled",
                      e.target.checked
                    )
                  }
                  className="h-5 w-5 accent-amber-400"
                />

              </label>

              <label className="flex cursor-pointer items-center justify-between rounded-2xl border border-white/10 bg-black p-5">

                <div>
                  <p className="text-sm font-black">
                    Allow Custom Sizing
                  </p>

                  <p className="mt-1 text-xs text-neutral-600">
                    For UTHY made-to-order /
                    pre-order clothing. Customers
                    can submit their measurements.
                  </p>
                </div>

                <input
                  type="checkbox"
                  checked={
                    form.customSizingEnabled
                  }
                  onChange={(e) =>
                    updateField(
                      "customSizingEnabled",
                      e.target.checked
                    )
                  }
                  className="h-5 w-5 accent-amber-400"
                />

              </label>

              {form.preOrderEnabled && (
                <Field label="Expected Fulfillment Time">

                  <input
                    value={
                      form.fulfillmentTime
                    }
                    onChange={(e) =>
                      updateField(
                        "fulfillmentTime",
                        e.target.value
                      )
                    }
                    placeholder="e.g. 7–14 working days"
                    className="input"
                  />

                  <p className="mt-2 text-[11px] text-neutral-600">
                    This will be shown to customers
                    before they complete the order.
                  </p>

                </Field>
              )}

              {form.customSizingEnabled && (
                <div className="rounded-2xl border border-amber-400/20 bg-amber-400/[0.04] p-5">

                  <p className="text-sm font-black text-amber-300">
                    Custom sizing enabled
                  </p>

                  <p className="mt-2 text-xs leading-relaxed text-neutral-500">
                    When the customer chooses
                    custom sizing, the checkout
                    system should collect their
                    measurements and attach them
                    to the order so the UTHY admin
                    can see them when processing
                    the order.
                  </p>

                  {!form.preOrderEnabled && (
                    <p className="mt-3 text-xs font-bold text-red-300">
                      Custom sizing requires
                      Pre-Order to be enabled.
                    </p>
                  )}

                </div>
              )}

            </div>

          </section>

          {/* ALOMZIEE SIZE GUIDE */}

          {footwear && (
            <section className="rounded-3xl border border-white/10 bg-neutral-950 p-6 md:p-8">

              <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-amber-400">
                05
              </p>

              <h2 className="mt-1 text-xl font-black">
                Footwear Size Guide
              </h2>

              <p className="mt-2 text-sm text-neutral-500">
                Alomziee footwear uses numeric
                sizing. The storefront can use
                this product sizing information to
                display the appropriate size guide
                to customers.
              </p>

              <div className="mt-6 rounded-2xl border border-white/10 bg-black p-5">

                <div className="flex items-start gap-4">

                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-amber-400/20 bg-amber-400/[0.06] text-amber-400">
                    i
                  </div>

                  <div>
                    <p className="text-sm font-black">
                      Size guide
                    </p>

                    <p className="mt-1 text-xs leading-relaxed text-neutral-600">
                      The selected footwear sizes
                      will be shown to customers,
                      with the storefront size-guide
                      component available alongside
                      the size selector.
                    </p>
                  </div>

                </div>

              </div>

            </section>
          )}

          {/* IMAGES */}

          <section className="rounded-3xl border border-white/10 bg-neutral-950 p-6 md:p-8">

            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-amber-400">
              {footwear ? "06" : "05"}
            </p>

            <h2 className="mt-1 text-xl font-black">
              Product Images
            </h2>

            <p className="mt-2 text-sm text-neutral-500">
              Choose images directly from your
              computer. No image URL is required.
            </p>

            <input
              ref={imagePickerRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) =>
                handleImageFiles(
                  e.target.files
                )
              }
            />

            <button
              type="button"
              onClick={() =>
                imagePickerRef.current?.click()
              }
              disabled={uploading}
              className="mt-6 flex w-full flex-col items-center justify-center rounded-3xl border border-dashed border-white/15 bg-black px-6 py-12 text-center transition hover:border-amber-400/40 hover:bg-white/[0.02] disabled:opacity-50"
            >

              <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-400/20 bg-amber-400/[0.06] text-2xl text-amber-400">
                {uploading ? "…" : "+"}
              </span>

              <span className="mt-4 text-sm font-black">
                {uploading
                  ? "Processing image..."
                  : "Add product pictures"}
              </span>

              <span className="mt-2 text-xs text-neutral-600">
                Click to choose from your laptop
                · multiple images supported
              </span>

            </button>

            {form.images.length >
              0 && (
              <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">

                {form.images.map(
                  (image, index) => (
                    <div
                      key={
                        image.id
                      }
                      className="overflow-hidden rounded-2xl border border-white/10 bg-black"
                    >

                      <div className="aspect-square">
                        <img
                          src={
                            image.src
                          }
                          alt={
                            image.name
                          }
                          className="h-full w-full object-cover"
                        />
                      </div>

                      <div className="flex items-center justify-between gap-2 p-2">

                        <button
                          type="button"
                          onClick={() =>
                            moveImage(
                              index,
                              -1
                            )
                          }
                          disabled={
                            index ===
                            0
                          }
                          className="rounded-lg border border-white/10 px-2 py-1 text-xs disabled:opacity-20"
                        >
                          ←
                        </button>

                        <span className="max-w-[100px] truncate text-[9px] text-neutral-600">
                          {index ===
                          0
                            ? "Main image"
                            : image.name}
                        </span>

                        <button
                          type="button"
                          onClick={() =>
                            moveImage(
                              index,
                              1
                            )
                          }
                          disabled={
                            index ===
                            form.images
                              .length -
                              1
                          }
                          className="rounded-lg border border-white/10 px-2 py-1 text-xs disabled:opacity-20"
                        >
                          →
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            removeImage(
                              image.id
                            )
                          }
                          className="rounded-lg border border-red-500/20 px-2 py-1 text-xs text-red-300"
                        >
                          ×
                        </button>

                      </div>

                    </div>
                  )
                )}

              </div>
            )}

          </section>

          {/* OUTFIT BUILDER */}

          <section className="rounded-3xl border border-white/10 bg-neutral-950 p-6 md:p-8">

            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-amber-400">
              {footwear ? "07" : "06"}
            </p>

            <h2 className="mt-1 text-xl font-black">
              Outfit Builder
            </h2>

            <p className="mt-2 text-sm text-neutral-500">
              Optional. Make this product
              available to the digital mannequin.
            </p>

            <label className="mt-6 flex cursor-pointer items-center justify-between rounded-2xl border border-white/10 bg-black p-5">

              <div>
                <p className="text-sm font-black">
                  Compatible with Outfit Builder
                </p>

                <p className="mt-1 text-xs text-neutral-600">
                  Use this product as a layer in
                  the styling experience.
                </p>
              </div>

              <input
                type="checkbox"
                checked={
                  form.outfitCompatible
                }
                onChange={(e) =>
                  updateField(
                    "outfitCompatible",
                    e.target.checked
                  )
                }
                className="h-5 w-5 accent-amber-400"
              />

            </label>

            {form.outfitCompatible && (
              <div className="mt-5 space-y-5">

                <Field label="Builder Layer">

                  <select
                    value={
                      form.outfitLayer
                    }
                    onChange={(e) =>
                      updateField(
                        "outfitLayer",
                        e.target.value
                      )
                    }
                    className="input"
                  >

                    <option value="none">
                      Select layer
                    </option>

                    {outfitLayers.map(
                      (layer) => (
                        <option
                          key={
                            layer.value
                          }
                          value={
                            layer.value
                          }
                        >
                          {
                            layer.label
                          }
                        </option>
                      )
                    )}

                  </select>

                </Field>

                <input
                  ref={
                    mannequinPickerRef
                  }
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) =>
                    handleMannequinFile(
                      e.target.files?.[0]
                    )
                  }
                />

                <button
                  type="button"
                  onClick={() =>
                    mannequinPickerRef.current?.click()
                  }
                  disabled={
                    mannequinUploading
                  }
                  className="w-full rounded-2xl border border-dashed border-white/15 bg-black p-6 text-left hover:border-amber-400/40 disabled:opacity-50"
                >

                  <p className="text-sm font-black">
                    {mannequinUploading
                      ? "Processing..."
                      : "Choose Outfit Builder image"}
                  </p>

                  <p className="mt-1 text-xs text-neutral-600">
                    PNG/WebP with transparency
                    recommended.
                  </p>

                </button>

                {form.mannequinAsset && (
                  <div className="mt-4 overflow-hidden rounded-2xl border border-white/10 bg-black">

                    <img
                      src={
                        form.mannequinAsset
                      }
                      alt="Outfit Builder preview"
                      className="max-h-80 w-full object-contain"
                    />

                  </div>
                )}

              </div>
            )}

          </section>

          {/* ACTIONS */}

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">

            <button
              type="button"
              onClick={() =>
                router.push(
                  "/admin/products"
                )
              }
              className="rounded-2xl border border-white/10 px-6 py-4 text-sm font-bold text-neutral-400 hover:text-white"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={save}
              disabled={
                saving ||
                uploading ||
                mannequinUploading
              }
              className="rounded-2xl bg-amber-500 px-8 py-4 text-sm font-black text-black hover:bg-amber-400 disabled:opacity-50"
            >
              {saving
                ? "Creating Product..."
                : "Create Product"}
            </button>

          </div>

        </div>
      </div>

      <style jsx>{`
        .input {
          width: 100%;
          border-radius: 1rem;
          border: 1px solid
            rgba(255, 255, 255, 0.1);
          background: #000;
          padding: 1rem 1.25rem;
          color: #fff;
          outline: none;
          transition: 0.2s;
        }

        .input:focus {
          border-color:
            rgba(245, 158, 11, 0.6);
        }

        .input::placeholder {
          color: #525252;
        }
      `}</style>
    </main>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-neutral-400">
        {label}
      </label>

      {children}
    </div>
  );
}