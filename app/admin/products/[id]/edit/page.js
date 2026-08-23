"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

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

const defaultColorHex = "#000000";

export default function EditProductPage() {
  const { id } = useParams();
  const router = useRouter();

  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [mannequinUploading, setMannequinUploading] =
    useState(false);

  useEffect(() => {
    if (!id) return;

    const loadProduct = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await fetch("/api/products", {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Failed to load products.");
        }

        const products = await response.json();

        const product = products.find(
          (item) => String(item.id) === String(id)
        );

        if (!product) {
          setError("Product not found.");
          setLoading(false);
          return;
        }

        let parsedImages = [];

        if (Array.isArray(product.images)) {
          parsedImages = product.images;
        } else if (typeof product.images === "string") {
          try {
            const parsed = JSON.parse(product.images);
            parsedImages = Array.isArray(parsed) ? parsed : [];
          } catch {
            parsedImages = [];
          }
        }

        /*
         * NEW COLOR SYSTEM
         *
         * ProductColor:
         * {
         *   id,
         *   name,
         *   hex
         * }
         */

        let productColors = Array.isArray(
          product.productColors
        )
          ? product.productColors
              .map((color) => ({
                id: color.id,
                name:
                  typeof color.name === "string"
                    ? color.name
                    : "",
                hex:
                  typeof color.hex === "string"
                    ? color.hex
                    : defaultColorHex,
              }))
              .filter((color) => color.name)
          : [];

        /*
         * Fallback for old products.
         */

        if (!productColors.length) {
          let oldColors = [];

          if (Array.isArray(product.colors)) {
            oldColors = product.colors;
          } else if (
            typeof product.colors === "string"
          ) {
            try {
              const parsed = JSON.parse(product.colors);

              if (Array.isArray(parsed)) {
                oldColors = parsed;
              }
            } catch {
              oldColors = product.colors
                .split(",")
                .map((color) => color.trim())
                .filter(Boolean);
            }
          }

          if (oldColors.length) {
            productColors = oldColors.map(
              (color) => {
                if (
                  color &&
                  typeof color === "object"
                ) {
                  return {
                    id: color.id || null,
                    name: color.name || "",
                    hex:
                      color.hex ||
                      defaultColorHex,
                  };
                }

                return {
                  id: null,
                  name: String(color),
                  hex: defaultColorHex,
                };
              }
            );
          }
        }

        /*
         * NEW VARIANT SYSTEM
         */

        const rawVariants = Array.isArray(
          product.variants
        )
          ? product.variants
          : [];

        const variants = rawVariants.map(
          (variant) => {
            const colorIndex =
              productColors.findIndex(
                (color) =>
                  color.id === variant.colorId
              );

            return {
              colorIndex:
                colorIndex >= 0
                  ? colorIndex
                  : 0,
              size:
                typeof variant.size === "string"
                  ? variant.size
                  : "",
              stock:
                Number.isInteger(variant.stock)
                  ? variant.stock
                  : 0,
              initialStock:
                Number.isInteger(
                  variant.initialStock
                )
                  ? variant.initialStock
                  : Number.isInteger(
                      variant.stock
                    )
                  ? variant.stock
                  : 0,
            };
          }
        );

        /*
         * If old product has colors but no variants,
         * create one stock row per color.
         */

        if (
          !variants.length &&
          productColors.length
        ) {
          productColors.forEach(
            (_, colorIndex) => {
              variants.push({
                colorIndex,
                size: "",
                stock: 0,
                initialStock: 0,
              });
            }
          );
        }

        /*
         * If absolutely no colors exist,
         * start with one color.
         */

        if (!productColors.length) {
          productColors = [
            {
              id: null,
              name: "Black",
              hex: "#000000",
            },
          ];

          variants.push({
            colorIndex: 0,
            size: "",
            stock:
              Number(product.inventory) || 0,
            initialStock:
              Number(product.initialInventory) ||
              Number(product.inventory) ||
              0,
          });
        }

        setForm({
          name: product.name || "",
          brand:
            product.brand || "UTHY_LUXURY",
          category:
            product.category || "shirts",
          price: product.price ?? "",
          description:
            product.description || "",
          colors: productColors,
          variants,
          style: product.style || "",
          occasion: product.occasion || "",
          outfitLayer:
            product.outfitLayer || "none",
          outfitCompatible: Boolean(
            product.outfitCompatible
          ),
          mannequinAsset:
            product.mannequinAsset || "",
          images: parsedImages,
          preOrderEnabled: Boolean(
            product.preOrderEnabled
          ),
          customSizingEnabled: Boolean(
            product.customSizingEnabled
          ),
          fulfillmentTime:
            product.fulfillmentTime || "",
          sizeType: product.sizeType || "",
        });
      } catch (err) {
        console.error(
          "Load product error:",
          err
        );

        setError(
          err.message ||
            "Unable to load this product."
        );
      } finally {
        setLoading(false);
      }
    };

    loadProduct();
  }, [id]);

  function compressImage(
    file,
    maxWidth = 1800
  ) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onerror = () =>
        reject(
          new Error("Could not read image.")
        );

      reader.onload = () => {
        const image = new Image();

        image.onerror = () =>
          reject(
            new Error("Invalid image file.")
          );

        image.onload = () => {
          let width = image.naturalWidth;
          let height = image.naturalHeight;

          if (width > maxWidth) {
            height = Math.round(
              (height / width) * maxWidth
            );

            width = maxWidth;
          }

          const canvas =
            document.createElement("canvas");

          canvas.width = width;
          canvas.height = height;

          const context =
            canvas.getContext("2d");

          if (!context) {
            reject(
              new Error(
                "Image processing is unavailable."
              )
            );
            return;
          }

          context.drawImage(
            image,
            0,
            0,
            width,
            height
          );

          resolve(
            canvas.toDataURL(
              "image/webp",
              0.82
            )
          );
        };

        image.src = reader.result;
      };

      reader.readAsDataURL(file);
    });
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
      setError("");

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

  const updateField = (
    field,
    value
  ) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleBrandChange = (
    brand
  ) => {
    setForm((prev) => ({
      ...prev,
      brand,
      category:
        categories[brand]?.[0]?.value ||
        "",
    }));
  };

  const handleOutfitToggle = (
    checked
  ) => {
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

  const updateColor = (
    index,
    field,
    value
  ) => {
    setForm((prev) => ({
      ...prev,
      colors: prev.colors.map(
        (color, colorIndex) =>
          colorIndex === index
            ? {
                ...color,
                [field]: value,
              }
            : color
      ),
    }));
  };

  const addColor = () => {
    setForm((prev) => {
      const newColorIndex =
        prev.colors.length;

      return {
        ...prev,

        colors: [
          ...prev.colors,
          {
            id: null,
            name: "",
            hex: "#000000",
          },
        ],

        variants: [
          ...prev.variants,
          {
            colorIndex:
              newColorIndex,
            size: "",
            stock: 0,
            initialStock: 0,
          },
        ],
      };
    });
  };

  const removeColor = (
    colorIndex
  ) => {
    if (form.colors.length <= 1) {
      setError(
        "A product must have at least one color."
      );
      return;
    }

    setForm((prev) => {
      const colors =
        prev.colors.filter(
          (_, index) =>
            index !== colorIndex
        );

      const variants =
        prev.variants
          .filter(
            (variant) =>
              variant.colorIndex !==
              colorIndex
          )
          .map((variant) => ({
            ...variant,
            colorIndex:
              variant.colorIndex >
              colorIndex
                ? variant.colorIndex - 1
                : variant.colorIndex,
          }));

      return {
        ...prev,
        colors,
        variants,
      };
    });
  };

  const updateVariant = (
    variantIndex,
    field,
    value
  ) => {
    setForm((prev) => ({
      ...prev,

      variants: prev.variants.map(
        (variant, index) =>
          index === variantIndex
            ? {
                ...variant,
                [field]: value,
              }
            : variant
      ),
    }));
  };

  const addVariant = (
    colorIndex
  ) => {
    setForm((prev) => ({
      ...prev,

      variants: [
        ...prev.variants,
        {
          colorIndex,
          size: "",
          stock: 0,
          initialStock: 0,
        },
      ],
    }));
  };

  const removeVariant = (
    variantIndex
  ) => {
    setForm((prev) => {
      const variants =
        prev.variants.filter(
          (_, index) =>
            index !== variantIndex
        );

      return {
        ...prev,
        variants,
      };
    });
  };

  const validate = () => {
    if (!form.name.trim()) {
      return "Product name is required.";
    }

    const price = Number(form.price);

    if (
      !form.price ||
      Number.isNaN(price) ||
      price <= 0
    ) {
      return "Enter a valid product price.";
    }

    if (!form.colors.length) {
      return "At least one product color is required.";
    }

    for (
      let index = 0;
      index < form.colors.length;
      index++
    ) {
      const color = form.colors[index];

      if (!color.name.trim()) {
        return `Color ${index + 1} needs a name.`;
      }

      if (
        !/^#[0-9A-Fa-f]{6}$/.test(
          color.hex
        )
      ) {
        return `Enter a valid hex code for ${color.name}.`;
      }

      const hasVariant =
        form.variants.some(
          (variant) =>
            variant.colorIndex === index
        );

      if (!hasVariant) {
        return `Inventory is missing for ${color.name}.`;
      }
    }

    for (
      let index = 0;
      index < form.variants.length;
      index++
    ) {
      const variant =
        form.variants[index];

      const stock = Number(
        variant.stock
      );

      const initialStock =
        Number(
          variant.initialStock
        );

      if (
        !Number.isInteger(stock) ||
        stock < 0
      ) {
        return `Variant ${index + 1} has invalid stock.`;
      }

      if (
        !Number.isInteger(
          initialStock
        ) ||
        initialStock < 0
      ) {
        return `Variant ${index + 1} has invalid initial stock.`;
      }
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

    const validationError =
      validate();

    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setSaving(true);

      const cleanColors =
        form.colors.map(
          (color) => ({
            name: color.name.trim(),
            hex: color.hex.trim(),
          })
        );

      const cleanVariants =
        form.variants.map(
          (variant) => ({
            colorIndex:
              Number(variant.colorIndex),

            size:
              typeof variant.size ===
              "string"
                ? variant.size.trim()
                : "",

            stock:
              Number(variant.stock),

            initialStock:
              Number(
                variant.initialStock
              ),
          })
        );

      const response = await fetch(
        `/api/products/${id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            name: form.name.trim(),

            category:
              form.category,

            price:
              Number(form.price),

            description:
              form.description.trim(),

            colors:
              cleanColors,

            variants:
              cleanVariants,

            images:
              form.images,

            style:
              form.style.trim(),

            occasion:
              form.occasion.trim(),

            outfitLayer:
              form.outfitCompatible
                ? form.outfitLayer
                : "none",

            outfitCompatible:
              form.outfitCompatible,

            mannequinAsset:
              form.mannequinAsset,

            preOrderEnabled:
              form.preOrderEnabled,

            customSizingEnabled:
              form.customSizingEnabled,

            fulfillmentTime:
              form.fulfillmentTime.trim(),

            sizeType:
              form.sizeType.trim(),
          }),
        }
      );

      const data =
        await response.json().catch(
          () => null
        );

      if (!response.ok) {
        throw new Error(
          data?.error ||
            data?.message ||
            "Failed to update product."
        );
      }

      setSuccess(
        "Product updated successfully."
      );

      setTimeout(() => {
        router.push(
          "/admin/products"
        );

        router.refresh();
      }, 700);
    } catch (err) {
      console.error(
        "Update product error:",
        err
      );

      setError(
        err.message ||
          "Something went wrong while updating the product."
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-amber-500 text-[10px] font-bold uppercase tracking-[0.4em]">
            VÉRANE
          </p>

          <p className="text-neutral-500 text-sm mt-3">
            Loading product...
          </p>
        </div>
      </main>
    );
  }

  if (!form) {
    return (
      <main className="min-h-screen bg-black text-white">
        <div className="max-w-3xl mx-auto px-5 py-20 text-center">
          <p className="text-amber-500 text-[10px] font-bold uppercase tracking-[0.4em]">
            VÉRANE ADMIN
          </p>

          <h1 className="text-3xl font-black mt-3">
            Product Not Found
          </h1>

          <p className="text-neutral-500 mt-3">
            {error ||
              "This product could not be found."}
          </p>

          <button
            onClick={() =>
              router.push(
                "/admin/products"
              )
            }
            className="mt-7 bg-amber-500 text-black px-6 py-3 rounded-full text-sm font-bold"
          >
            ← Back to Products
          </button>
        </div>
      </main>
    );
  }

  const brandCategories =
    categories[form.brand] || [];

  const totalInventory =
    form.variants.reduce(
      (total, variant) =>
        total +
        Number(variant.stock || 0),
      0
    );

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="max-w-5xl mx-auto px-5 sm:px-8 py-10 md:py-16">
        {/* HEADER */}

        <div className="mb-10">
          <button
            type="button"
            onClick={() =>
              router.push(
                "/admin/products"
              )
            }
            className="inline-flex items-center gap-2 text-xs text-neutral-500 hover:text-white transition mb-6"
          >
            ← Back to Products
          </button>

          <div>
            <p className="text-amber-400 text-[10px] font-bold uppercase tracking-[0.35em] mb-3">
              VÉRANE ADMIN
            </p>

            <h1 className="text-4xl md:text-6xl font-black tracking-tight">
              Edit Product
            </h1>

            <p className="text-neutral-500 mt-3 max-w-xl">
              Update product information,
              colors, sizes, inventory, and
              Outfit Builder settings.
            </p>
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
                Update the information
                customers see.
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
                    updateField(
                      "name",
                      e.target.value
                    )
                  }
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
                      handleBrandChange(
                        e.target.value
                      )
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
                      updateField(
                        "category",
                        e.target.value
                      )
                    }
                    className="w-full bg-black border border-white/10 rounded-2xl px-5 py-4 text-white outline-none focus:border-amber-500/60"
                  >
                    {brandCategories.map(
                      (category) => (
                        <option
                          key={
                            category.value
                          }
                          value={
                            category.value
                          }
                        >
                          {category.label}
                        </option>
                      )
                    )}
                  </select>
                </div>
              </div>

              {/* PRICE */}

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
                      updateField(
                        "price",
                        e.target.value
                      )
                    }
                    type="number"
                    min="0"
                    step="1"
                    className="w-full bg-black border border-white/10 rounded-2xl pl-10 pr-5 py-4 text-white outline-none focus:border-amber-500/60"
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
                  className="w-full bg-black border border-white/10 rounded-2xl px-5 py-4 text-white outline-none focus:border-amber-500/60 resize-none"
                />

                <p className="text-[11px] text-neutral-600 mt-2">
                  {
                    form.description
                      .length
                  }{" "}
                  characters
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
                      updateField(
                        "style",
                        e.target.value
                      )
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
            </div>
          </section>

          {/* COLORS + INVENTORY */}

          <section className="rounded-3xl border border-white/10 bg-neutral-950 p-6 md:p-8">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-7">
              <div>
                <p className="text-amber-400 text-[10px] font-bold uppercase tracking-[0.25em]">
                  02
                </p>

                <h2 className="text-xl font-bold mt-1">
                  Colors & Inventory
                </h2>

                <p className="text-sm text-neutral-500 mt-1">
                  Manage each color, size,
                  and stock quantity.
                </p>
              </div>

              <div className="rounded-2xl bg-black border border-white/10 px-5 py-3">
                <p className="text-[10px] uppercase tracking-wider text-neutral-500">
                  Total Available
                </p>

                <p className="text-xl font-black text-amber-400">
                  {totalInventory}
                </p>
              </div>
            </div>

            <div className="space-y-6">
              {form.colors.map(
                (color, colorIndex) => {
                  const colorVariants =
                    form.variants
                      .map(
                        (
                          variant,
                          variantIndex
                        ) => ({
                          ...variant,
                          variantIndex,
                        })
                      )
                      .filter(
                        (variant) =>
                          variant.colorIndex ===
                          colorIndex
                      );

                  return (
                    <div
                      key={`color-${colorIndex}`}
                      className="rounded-3xl border border-white/10 bg-black p-5 md:p-6"
                    >
                      {/* COLOR HEADER */}

                      <div className="flex items-center justify-between gap-4 mb-5">
                        <div className="flex items-center gap-3">
                          <span
                            className="w-8 h-8 rounded-full border border-white/20 shrink-0"
                            style={{
                              backgroundColor:
                                color.hex,
                            }}
                          />

                          <div>
                            <p className="text-xs uppercase tracking-wider text-neutral-500">
                              Color{" "}
                              {colorIndex +
                                1}
                            </p>

                            <p className="font-bold">
                              {color.name ||
                                "Unnamed Color"}
                            </p>
                          </div>
                        </div>

                        {form.colors.length >
                          1 && (
                          <button
                            type="button"
                            onClick={() =>
                              removeColor(
                                colorIndex
                              )
                            }
                            className="text-xs text-red-400 hover:text-red-300"
                          >
                            Remove
                          </button>
                        )}
                      </div>

                      {/* COLOR NAME + HEX */}

                      <div className="grid md:grid-cols-2 gap-4 mb-6">
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500 mb-2">
                            Color Name
                          </label>

                          <input
                            value={
                              color.name
                            }
                            onChange={(e) =>
                              updateColor(
                                colorIndex,
                                "name",
                                e.target
                                  .value
                              )
                            }
                            placeholder="Black"
                            className="w-full bg-neutral-950 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white outline-none focus:border-amber-500/60"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500 mb-2">
                            Hex Color
                          </label>

                          <div className="flex gap-2">
                            <input
                              type="color"
                              value={
                                /^#[0-9A-Fa-f]{6}$/.test(
                                  color.hex
                                )
                                  ? color.hex
                                  : "#000000"
                              }
                              onChange={(e) =>
                                updateColor(
                                  colorIndex,
                                  "hex",
                                  e.target
                                    .value
                                )
                              }
                              className="w-14 h-12 bg-neutral-950 border border-white/10 rounded-xl p-1 cursor-pointer"
                            />

                            <input
                              value={
                                color.hex
                              }
                              onChange={(e) =>
                                updateColor(
                                  colorIndex,
                                  "hex",
                                  e.target
                                    .value
                                )
                              }
                              placeholder="#000000"
                              className="flex-1 bg-neutral-950 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white outline-none focus:border-amber-500/60"
                            />
                          </div>
                        </div>
                      </div>

                      {/* VARIANTS */}

                      <div className="border-t border-white/10 pt-5">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <p className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                              Stock Variants
                            </p>

                            <p className="text-[11px] text-neutral-600 mt-1">
                              Leave size empty for
                              products without sizes.
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              addVariant(
                                colorIndex
                              )
                            }
                            className="text-xs font-bold text-amber-400 hover:text-amber-300"
                          >
                            + Add Variant
                          </button>
                        </div>

                        <div className="space-y-3">
                          {colorVariants.map(
                            (
                              variant
                            ) => (
                              <div
                                key={
                                  variant.variantIndex
                                }
                                className="grid grid-cols-[1fr_1fr_1fr_auto] gap-3 items-end"
                              >
                                <div>
                                  <label className="block text-[10px] uppercase tracking-wider text-neutral-600 mb-2">
                                    Size
                                  </label>

                                  <input
                                    value={
                                      variant.size
                                    }
                                    onChange={(
                                      e
                                    ) =>
                                      updateVariant(
                                        variant.variantIndex,
                                        "size",
                                        e.target
                                          .value
                                      )
                                    }
                                    placeholder="M"
                                    className="w-full bg-neutral-950 border border-white/10 rounded-xl px-3 py-3 text-sm text-white outline-none focus:border-amber-500/60"
                                  />
                                </div>

                                <div>
                                  <label className="block text-[10px] uppercase tracking-wider text-neutral-600 mb-2">
                                    Available
                                  </label>

                                  <input
                                    type="number"
                                    min="0"
                                    step="1"
                                    value={
                                      variant.stock
                                    }
                                    onChange={(
                                      e
                                    ) =>
                                      updateVariant(
                                        variant.variantIndex,
                                        "stock",
                                        e.target
                                          .value
                                      )
                                    }
                                    className="w-full bg-neutral-950 border border-white/10 rounded-xl px-3 py-3 text-sm text-white outline-none focus:border-amber-500/60"
                                  />
                                </div>

                                <div>
                                  <label className="block text-[10px] uppercase tracking-wider text-neutral-600 mb-2">
                                    Initial
                                  </label>

                                  <input
                                    type="number"
                                    min="0"
                                    step="1"
                                    value={
                                      variant.initialStock
                                    }
                                    onChange={(
                                      e
                                    ) =>
                                      updateVariant(
                                        variant.variantIndex,
                                        "initialStock",
                                        e.target
                                          .value
                                      )
                                    }
                                    className="w-full bg-neutral-950 border border-white/10 rounded-xl px-3 py-3 text-sm text-white outline-none focus:border-amber-500/60"
                                  />
                                </div>

                                <button
                                  type="button"
                                  onClick={() =>
                                    removeVariant(
                                      variant.variantIndex
                                    )
                                  }
                                  className="h-11 w-11 rounded-xl border border-white/10 text-neutral-500 hover:text-red-400 hover:border-red-500/20"
                                >
                                  ×
                                </button>
                              </div>
                            )
                          )}

                          {!colorVariants.length && (
                            <div className="rounded-2xl border border-dashed border-white/10 p-5 text-center">
                              <p className="text-xs text-neutral-600">
                                No inventory
                                variant yet.
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                }
              )}
            </div>

            <button
              type="button"
              onClick={addColor}
              className="mt-6 w-full rounded-2xl border border-dashed border-white/15 py-4 text-sm font-bold text-neutral-400 hover:text-white hover:border-amber-400/40 transition"
            >
              + Add Another Color
            </button>
          </section>

          {/* IMAGES */}

          <section className="rounded-3xl border border-white/10 bg-neutral-950 p-6 md:p-8">
            <div className="mb-7">
              <p className="text-amber-400 text-[10px] font-bold uppercase tracking-[0.25em]">
                03
              </p>

              <h2 className="text-xl font-bold mt-1">
                Product Images
              </h2>

              <p className="text-sm text-neutral-500 mt-1">
                Existing product images are
                preserved.
              </p>
            </div>

            {form.images.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {form.images.map(
                  (image, index) => (
                    <div
                      key={`${image}-${index}`}
                      className="aspect-square rounded-2xl overflow-hidden border border-white/10 bg-black"
                    >
                      <img
                        src={image}
                        alt={`Product image ${
                          index + 1
                        }`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )
                )}
              </div>
            ) : (
              <div className="border border-dashed border-white/10 rounded-2xl p-10 text-center">
                <p className="text-sm text-neutral-500">
                  No product images found.
                </p>
              </div>
            )}
          </section>

          {/* OUTFIT BUILDER */}

          <section className="rounded-3xl border border-white/10 bg-neutral-950 p-6 md:p-8">
            <div className="mb-7">
              <p className="text-amber-400 text-[10px] font-bold uppercase tracking-[0.25em]">
                04
              </p>

              <h2 className="text-xl font-bold mt-1">
                Outfit Builder
              </h2>

              <p className="text-sm text-neutral-500 mt-1">
                Update how this product works
                inside the Outfit Builder.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black p-5">
              <label className="flex items-start gap-4 cursor-pointer">
                <input
                  type="checkbox"
                  checked={
                    form.outfitCompatible
                  }
                  onChange={(e) =>
                    handleOutfitToggle(
                      e.target.checked
                    )
                  }
                  className="mt-1 w-4 h-4 accent-amber-500"
                />

                <div>
                  <p className="font-semibold">
                    Make this product Outfit
                    Builder compatible
                  </p>

                  <p className="text-xs text-neutral-500 mt-1">
                    Customers can use this
                    piece when creating a
                    complete look.
                  </p>
                </div>
              </label>

              {form.outfitCompatible && (
                <div className="mt-6 pt-6 border-t border-white/10">
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2">
                    Outfit Layer
                  </label>

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
                    className="w-full bg-neutral-950 border border-white/10 rounded-2xl px-5 py-4 text-white outline-none focus:border-amber-500/60"
                  >
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
                          {layer.label}
                        </option>
                      )
                    )}
                  </select>

                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    id="mannequin-image"
                    onChange={(e) =>
                      handleMannequinFile(
                        e.target.files?.[0]
                      )
                    }
                  />

                  <label
                    htmlFor="mannequin-image"
                    className="mt-5 block cursor-pointer rounded-2xl border border-dashed border-white/15 bg-black p-6 hover:border-amber-400/40 transition"
                  >
                    <p className="text-sm font-bold">
                      {mannequinUploading
                        ? "Processing image..."
                        : "Choose Outfit Builder image"}
                    </p>

                    <p className="mt-1 text-xs text-neutral-600">
                      Use a transparent
                      PNG/WebP showing the
                      product positioned for
                      the mannequin.
                    </p>
                  </label>

                  {form.mannequinAsset && (
                    <div className="mt-4 overflow-hidden rounded-2xl border border-white/10 bg-black">
                      <img
                        src={
                          form.mannequinAsset
                        }
                        alt="Outfit Builder preview"
                        className="max-h-96 w-full object-contain"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>

          {/* SAVE */}

          <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
            <button
              type="button"
              onClick={() =>
                router.push(
                  "/admin/products"
                )
              }
              className="px-7 py-4 rounded-full border border-white/10 text-sm font-bold text-center hover:bg-white/5 transition"
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
                ? "Saving Changes..."
                : "Save Changes →"}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}