"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const outfitLayers = [
  { value: "top", label: "Top" },
  { value: "bottom", label: "Bottom" },
  { value: "feet", label: "Feet" },
  { value: "waist", label: "Waist" },
  { value: "hand", label: "Hand" },
];

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
    inventory: "0",
    colors: "",
    style: "",
    occasion: "",
    images: [],
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
        throw new Error(data?.error || "Unable to load categories.");
      }

      const available = Array.isArray(data)
        ? data.filter((category) => category.enabled !== false)
        : [];

      setCategories(available);
      setForm((current) => ({
        ...current,
        category: current.category || available[0]?.id || "",
      }));
    } catch (err) {
      setError(err?.message || "Unable to load categories.");
    } finally {
      setCategoriesLoading(false);
    }
  }

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
    setError("");
  }

  async function handleImageFiles(fileList) {
    const files = Array.from(fileList || []).filter((file) =>
      file.type.startsWith("image/")
    );

    if (!files.length) return;

    try {
      setUploading(true);
      setError("");

      const processed = [];
      for (const file of files) {
        const src = await compressImage(file);
        processed.push({ id: makeId(), name: file.name, src });
      }

      setForm((current) => ({
        ...current,
        images: [...current.images, ...processed],
      }));
    } catch (err) {
      setError(err?.message || "One or more images could not be processed.");
    } finally {
      setUploading(false);
    }
  }

  async function handleMannequinFile(file) {
    if (!file || !file.type.startsWith("image/")) return;

    try {
      setMannequinUploading(true);
      const src = await compressImage(file, 1800);
      updateField("mannequinAsset", src);
    } catch (err) {
      setError(err?.message || "Could not process the Outfit Builder image.");
    } finally {
      setMannequinUploading(false);
    }
  }

  function removeImage(id) {
    setForm((current) => ({
      ...current,
      images: current.images.filter((image) => image.id !== id),
    }));
  }

  function moveImage(index, direction) {
    setForm((current) => {
      const next = [...current.images];
      const target = index + direction;
      if (target < 0 || target >= next.length) return current;
      [next[index], next[target]] = [next[target], next[index]];
      return { ...current, images: next };
    });
  }

  function validate() {
    if (!form.name.trim()) return "Product name is required.";
    if (!form.category) return "Choose a category.";
    if (!categories.length) return "Create a category before adding a product.";

    const price = Number(form.price);
    if (!Number.isFinite(price) || price <= 0) return "Enter a valid product price.";

    const inventory = Number(form.inventory);
    if (!Number.isInteger(inventory) || inventory < 0) return "Enter a valid inventory quantity.";

    if (!form.images.length) return "Add at least one product image.";

    if (form.outfitCompatible && form.outfitLayer === "none") {
      return "Choose an Outfit Builder layer.";
    }

    if (form.outfitCompatible && !form.mannequinAsset) {
      return "Add the transparent Outfit Builder image.";
    }

    return "";
  }

  async function save() {
    const validationError = validate();
    setError("");
    setSuccess("");

    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setSaving(true);

      const response = await fetch("/api/admin/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: form.name.trim(),
          category: form.category,
          price: Number(form.price),
          description: form.description.trim(),
          inventory: Number(form.inventory),
          colors: form.colors
            .split(",")
            .map((value) => value.trim())
            .filter(Boolean),
          style: form.style.trim(),
          occasion: form.occasion.trim(),
          images: form.images.map((image) => image.src),
          outfitCompatible: form.outfitCompatible,
          outfitLayer: form.outfitCompatible ? form.outfitLayer : "none",
          mannequinAsset: form.outfitCompatible ? form.mannequinAsset : "",
        }),
      });

      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.error || "Failed to create product.");
      }

      setSuccess("Product created successfully.");
      setTimeout(() => {
        router.push("/admin/products");
        router.refresh();
      }, 600);
    } catch (err) {
      setError(err?.message || "Something went wrong while creating the product.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#070707] text-white">
      <div className="mx-auto max-w-5xl px-5 py-10 sm:px-8 md:py-14">
        <button
          type="button"
          onClick={() => router.push("/admin/products")}
          className="mb-7 text-xs text-neutral-500 hover:text-white"
        >
          ← Back to Products
        </button>

        <div className="mb-9">
          <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-amber-400">STORE ADMIN</p>
          <h1 className="mt-2 text-4xl font-black tracking-tight md:text-6xl">Add Product</h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-neutral-500">
            Create a complete product with real images, inventory and Outfit Builder settings.
          </p>
        </div>

        {error && <div className="mb-6 rounded-2xl border border-red-500/20 bg-red-500/5 px-5 py-4 text-sm text-red-300">{error}</div>}
        {success && <div className="mb-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 px-5 py-4 text-sm text-emerald-300">{success}</div>}

        <div className="space-y-6">
          <section className="rounded-3xl border border-white/10 bg-neutral-950 p-6 md:p-8">
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-amber-400">01</p>
            <h2 className="mt-1 text-xl font-black">Product Information</h2>

            <div className="mt-7 space-y-5">
              <Field label="Product Name *">
                <input value={form.name} onChange={(e) => updateField("name", e.target.value)} placeholder="Product name" className="input" />
              </Field>

              <Field label="Category *">
                {categoriesLoading ? (
                  <div className="input text-neutral-600">Loading categories...</div>
                ) : (
                  <select value={form.category} onChange={(e) => updateField("category", e.target.value)} className="input">
                    <option value="">Select a category</option>
                    {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                  </select>
                )}
              </Field>

              <div className="grid gap-5 md:grid-cols-2">
                <Field label="Price (₦) *">
                  <input value={form.price} onChange={(e) => updateField("price", e.target.value)} type="number" min="0" step="1" placeholder="0" className="input" />
                </Field>
                <Field label="Inventory">
                  <input value={form.inventory} onChange={(e) => updateField("inventory", e.target.value)} type="number" min="0" step="1" className="input" />
                </Field>
              </div>

              <Field label="Description">
                <textarea value={form.description} onChange={(e) => updateField("description", e.target.value)} rows={5} placeholder="Describe the product..." className="input resize-none" />
              </Field>

              <div className="grid gap-5 md:grid-cols-2">
                <Field label="Style"><input value={form.style} onChange={(e) => updateField("style", e.target.value)} placeholder="Minimal, Classic, Streetwear..." className="input" /></Field>
                <Field label="Occasion"><input value={form.occasion} onChange={(e) => updateField("occasion", e.target.value)} placeholder="Wedding, Casual, Formal..." className="input" /></Field>
              </div>

              <Field label="Colors">
                <input value={form.colors} onChange={(e) => updateField("colors", e.target.value)} placeholder="Black, White, Gold" className="input" />
                <p className="mt-2 text-[11px] text-neutral-600">Separate multiple colors with commas.</p>
              </Field>
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-neutral-950 p-6 md:p-8">
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-amber-400">02</p>
            <h2 className="mt-1 text-xl font-black">Product Images</h2>
            <p className="mt-2 text-sm text-neutral-500">Choose images directly from your computer. No image URL is required.</p>

            <input ref={imagePickerRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleImageFiles(e.target.files)} />

            <button type="button" onClick={() => imagePickerRef.current?.click()} disabled={uploading} className="mt-6 flex w-full flex-col items-center justify-center rounded-3xl border border-dashed border-white/15 bg-black px-6 py-12 text-center transition hover:border-amber-400/40 hover:bg-white/[0.02] disabled:opacity-50">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-400/20 bg-amber-400/[0.06] text-2xl text-amber-400">{uploading ? "…" : "+"}</span>
              <span className="mt-4 text-sm font-black">{uploading ? "Processing image..." : "Add product pictures"}</span>
              <span className="mt-2 text-xs text-neutral-600">Click to choose from your laptop · multiple images supported</span>
            </button>

            {form.images.length > 0 && (
              <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
                {form.images.map((image, index) => (
                  <div key={image.id} className="overflow-hidden rounded-2xl border border-white/10 bg-black">
                    <div className="aspect-square"><img src={image.src} alt={image.name} className="h-full w-full object-cover" /></div>
                    <div className="flex items-center justify-between gap-2 p-2">
                      <button type="button" onClick={() => moveImage(index, -1)} disabled={index === 0} className="rounded-lg border border-white/10 px-2 py-1 text-xs disabled:opacity-20">←</button>
                      <span className="max-w-[100px] truncate text-[9px] text-neutral-600">{index === 0 ? "Main image" : image.name}</span>
                      <button type="button" onClick={() => moveImage(index, 1)} disabled={index === form.images.length - 1} className="rounded-lg border border-white/10 px-2 py-1 text-xs disabled:opacity-20">→</button>
                      <button type="button" onClick={() => removeImage(image.id)} className="rounded-lg border border-red-500/20 px-2 py-1 text-xs text-red-300">×</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-3xl border border-white/10 bg-neutral-950 p-6 md:p-8">
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-amber-400">03</p>
            <h2 className="mt-1 text-xl font-black">Outfit Builder</h2>
            <p className="mt-2 text-sm text-neutral-500">Optional. Make this product available to the digital mannequin.</p>

            <label className="mt-6 flex cursor-pointer items-center justify-between rounded-2xl border border-white/10 bg-black p-5">
              <div><p className="text-sm font-black">Compatible with Outfit Builder</p><p className="mt-1 text-xs text-neutral-600">Use this product as a layer in the styling experience.</p></div>
              <input type="checkbox" checked={form.outfitCompatible} onChange={(e) => updateField("outfitCompatible", e.target.checked)} className="h-5 w-5 accent-amber-400" />
            </label>

            {form.outfitCompatible && (
              <div className="mt-5 space-y-5">
                <Field label="Builder Layer">
                  <select value={form.outfitLayer} onChange={(e) => updateField("outfitLayer", e.target.value)} className="input">
                    <option value="none">Select layer</option>
                    {outfitLayers.map((layer) => <option key={layer.value} value={layer.value}>{layer.label}</option>)}
                  </select>
                </Field>

                <input ref={mannequinPickerRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleMannequinFile(e.target.files?.[0])} />
                <button type="button" onClick={() => mannequinPickerRef.current?.click()} disabled={mannequinUploading} className="w-full rounded-2xl border border-dashed border-white/15 bg-black p-6 text-left hover:border-amber-400/40 disabled:opacity-50">
                  <p className="text-sm font-black">{mannequinUploading ? "Processing..." : "Choose Outfit Builder image"}</p>
                  <p className="mt-1 text-xs text-neutral-600">PNG/WebP with transparency recommended.</p>
                </button>

                {form.mannequinAsset && <div className="mt-4 overflow-hidden rounded-2xl border border-white/10 bg-black"><img src={form.mannequinAsset} alt="Outfit Builder preview" className="max-h-80 w-full object-contain" /></div>}
              </div>
            )}
          </section>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button type="button" onClick={() => router.push("/admin/products")} className="rounded-2xl border border-white/10 px-6 py-4 text-sm font-bold text-neutral-400 hover:text-white">Cancel</button>
            <button type="button" onClick={save} disabled={saving || uploading || mannequinUploading} className="rounded-2xl bg-amber-500 px-8 py-4 text-sm font-black text-black hover:bg-amber-400 disabled:opacity-50">{saving ? "Creating Product..." : "Create Product"}</button>
          </div>
        </div>
      </div>

      <style jsx>{`.input{width:100%;border-radius:1rem;border:1px solid rgba(255,255,255,.1);background:#000;padding:1rem 1.25rem;color:#fff;outline:none;transition:.2s}.input:focus{border-color:rgba(245,158,11,.6)}.input::placeholder{color:#525252}`}</style>
    </main>
  );
}

function Field({ label, children }) {
  return <div><label className="mb-2 block text-xs font-bold uppercase tracking-wider text-neutral-400">{label}</label>{children}</div>;
}
