"use client";

import { useEffect, useState } from "react";

function createSection(index) {
  return { id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, title: "New Section", description: "", image: "", enabled: true, productIds: [], sortOrder: index };
}

function getImage(images) {
  if (!images) return "";
  try {
    const parsed = typeof images === "string" ? JSON.parse(images) : images;
    if (Array.isArray(parsed)) return parsed[0] || "";
    if (typeof parsed === "string") return parsed;
  } catch {
    return String(images).split(",").map((item) => item.trim()).filter(Boolean)[0] || "";
  }
  return "";
}

function formatPrice(price) {
  return `₦${Number(price || 0).toLocaleString("en-NG")}`;
}

export default function StorefrontAdminPage() {
  const [brand, setBrand] = useState("");
  const [heroImage, setHeroImage] = useState("");
  const [sections, setSections] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const brandName = brand === "UTHY_LUXURY" ? "UTHY LUXURY" : brand === "ALOMZIEE_FOOTIES" ? "ALOMZIEE FOOTIES" : "STORE";

  useEffect(() => { loadStorefront(); }, []);

  async function loadStorefront() {
    try {
      setLoading(true);
      setError("");
      const response = await fetch("/api/admin/storefront", { cache: "no-store", credentials: "include" });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error || "Failed to load store page.");
      setBrand(data?.brand || "");
      setHeroImage(data?.heroImage || "");
      setSections(Array.isArray(data?.sections) ? data.sections : []);
      setProducts(Array.isArray(data?.products) ? data.products : []);
    } catch (err) {
      console.error("Storefront loading error:", err);
      setError(err.message || "Failed to load store page.");
    } finally {
      setLoading(false);
    }
  }

  async function uploadImage(file, target) {
    if (!file) return;
    if (!file.type.startsWith("image/")) { setError("Please choose an image file."); return; }
    if (file.size > 10 * 1024 * 1024) { setError("Image must be smaller than 10MB."); return; }

    try {
      setUploading(target);
      setError("");
      setMessage("");
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/admin/upload", { method: "POST", credentials: "include", body: formData });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.url) throw new Error(data?.error || "Failed to upload image.");

      if (target === "hero") setHeroImage(data.url);
      else setSections((current) => current.map((section) => section.id === target ? { ...section, image: data.url } : section));

      setMessage("Image uploaded. Save the store page to publish it.");
    } catch (err) {
      console.error("Storefront image upload error:", err);
      setError(err.message || "Failed to upload image.");
    } finally {
      setUploading("");
    }
  }

  function addSection() {
    setSections((current) => [...current, createSection(current.length)]);
    setMessage("");
    setError("");
  }

  function updateSection(id, field, value) {
    setSections((current) => current.map((section) => section.id === id ? { ...section, [field]: value } : section));
    setMessage("");
  }

  function deleteSection(id) {
    if (!window.confirm("Remove this storefront section?")) return;
    setSections((current) => current.filter((section) => section.id !== id).map((section, index) => ({ ...section, sortOrder: index })));
  }

  function moveSection(index, direction) {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= sections.length) return;
    setSections((current) => {
      const copy = [...current];
      [copy[index], copy[newIndex]] = [copy[newIndex], copy[index]];
      return copy.map((section, i) => ({ ...section, sortOrder: i }));
    });
  }

  function toggleProduct(sectionId, productId) {
    setSections((current) => current.map((section) => {
      if (section.id !== sectionId) return section;
      const ids = Array.isArray(section.productIds) ? section.productIds : [];
      return { ...section, productIds: ids.includes(productId) ? ids.filter((id) => id !== productId) : [...ids, productId] };
    }));
    setMessage("");
  }

  async function saveStorefront() {
    try {
      setSaving(true);
      setMessage("");
      setError("");
      const cleanedSections = sections.map((section, index) => ({
        id: section.id,
        title: section.title?.trim() || "Untitled Section",
        description: section.description?.trim() || "",
        image: section.image?.trim() || "",
        enabled: section.enabled !== false,
        productIds: Array.isArray(section.productIds) ? section.productIds : [],
        sortOrder: index,
      }));

      const response = await fetch("/api/admin/storefront", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ heroImage, sections: cleanedSections }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error || "Failed to save store page.");
      setHeroImage(data?.heroImage || heroImage);
      setSections(Array.isArray(data?.sections) ? data.sections : cleanedSections);
      setMessage("Store page saved successfully.");
    } catch (err) {
      console.error("Storefront saving error:", err);
      setError(err.message || "Failed to save store page.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <main className="min-h-screen bg-[#050505] text-white flex items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-amber-400" /></main>;

  return (
    <main className="min-h-screen bg-[#050505] text-white">
      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-10">
        <header className="mb-10">
          <p className="text-[9px] font-bold uppercase tracking-[0.35em] text-amber-400">Store Management</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">{brandName}</h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-white/40">Build your brand landing page. Upload a hero image, create sections, and choose exactly which products appear in each section.</p>
        </header>

        {message && <div className="mb-6 rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.05] px-5 py-4 text-sm text-emerald-300">{message}</div>}
        {error && <div className="mb-6 rounded-2xl border border-red-500/20 bg-red-500/[0.05] px-5 py-4 text-sm text-red-400">{error}</div>}

        <section className="mb-8 rounded-[28px] border border-white/[0.08] bg-white/[0.025] p-6 sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div><p className="text-[9px] font-bold uppercase tracking-[0.3em] text-amber-400">Store Hero</p><h2 className="mt-2 text-2xl font-semibold">Main brand image</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-white/35">Choose the main image customers see at the top of your brand page.</p></div>
            <label className="cursor-pointer rounded-full bg-amber-400 px-6 py-3 text-center text-xs font-black uppercase tracking-[0.12em] text-black hover:bg-amber-300">{uploading === "hero" ? "Uploading..." : heroImage ? "Change Hero Image" : "Choose Hero Image"}<input type="file" accept="image/*" className="hidden" disabled={Boolean(uploading)} onChange={(event) => uploadImage(event.target.files?.[0], "hero")} /></label>
          </div>
          {heroImage && <div className="mt-6 overflow-hidden rounded-2xl border border-white/10 bg-black"><img src={heroImage} alt="Store hero" className="max-h-[420px] w-full object-cover" /></div>}
        </section>

        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-xl font-semibold">Store Sections</h2><p className="mt-1 text-xs text-white/30">Create sections and choose which products appear in each.</p></div><button type="button" onClick={addSection} className="rounded-full bg-amber-400 px-6 py-3 text-xs font-black uppercase tracking-[0.12em] text-black hover:bg-amber-300">+ Add Section</button></div>

        {sections.length === 0 && <div className="mb-8 rounded-[28px] border border-dashed border-white/10 px-6 py-20 text-center"><h3 className="text-xl font-semibold">No sections yet</h3><p className="mx-auto mt-2 max-w-md text-sm text-white/30">Create your first section.</p><button type="button" onClick={addSection} className="mt-6 rounded-full bg-white px-6 py-3 text-xs font-bold text-black">Create First Section</button></div>}

        <div className="space-y-8">
          {sections.map((section, sectionIndex) => {
            const selectedIds = Array.isArray(section.productIds) ? section.productIds : [];
            return (
              <section key={section.id} className="overflow-hidden rounded-[28px] border border-white/[0.08] bg-white/[0.025]">
                <div className="border-b border-white/[0.06] p-6 sm:p-8">
                  <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0 flex-1"><p className="text-[9px] font-bold uppercase tracking-[0.3em] text-amber-400/70">Section {sectionIndex + 1}</p><input value={section.title || ""} onChange={(event) => updateSection(section.id, "title", event.target.value)} placeholder="Section name" className="mt-4 w-full border-none bg-transparent text-3xl font-semibold tracking-[-0.03em] text-white outline-none placeholder:text-white/15" /><textarea value={section.description || ""} onChange={(event) => updateSection(section.id, "description", event.target.value)} placeholder="Section description..." rows={2} className="mt-3 w-full resize-none border-none bg-transparent text-sm leading-6 text-white/40 outline-none placeholder:text-white/15" /></div>
                    <div className="flex flex-wrap items-center gap-2"><button type="button" onClick={() => moveSection(sectionIndex, "up")} disabled={sectionIndex === 0} className="h-10 w-10 rounded-full border border-white/10 disabled:opacity-20">↑</button><button type="button" onClick={() => moveSection(sectionIndex, "down")} disabled={sectionIndex === sections.length - 1} className="h-10 w-10 rounded-full border border-white/10 disabled:opacity-20">↓</button><button type="button" onClick={() => updateSection(section.id, "enabled", !section.enabled)} className={`rounded-full px-5 py-2.5 text-[10px] font-black uppercase tracking-[0.12em] ${section.enabled !== false ? "bg-emerald-400 text-black" : "bg-white/10 text-white/40"}`}>{section.enabled !== false ? "Visible" : "Hidden"}</button><button type="button" onClick={() => deleteSection(section.id)} className="rounded-full border border-red-500/20 px-5 py-2.5 text-[10px] font-black uppercase tracking-[0.12em] text-red-400">Delete</button></div>
                  </div>

                  <div className="mt-6 rounded-2xl border border-white/[0.07] bg-black/30 p-4">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-[9px] font-bold uppercase tracking-[0.25em] text-white/40">Section Image</p><p className="mt-1 text-xs text-white/25">Upload directly from your device.</p></div><label className="cursor-pointer rounded-full border border-amber-400/30 px-5 py-2.5 text-[10px] font-black uppercase tracking-[0.12em] text-amber-400 hover:bg-amber-400/10">{uploading === section.id ? "Uploading..." : section.image ? "Change Image" : "Choose Image"}<input type="file" accept="image/*" className="hidden" disabled={Boolean(uploading)} onChange={(event) => uploadImage(event.target.files?.[0], section.id)} /></label></div>
                    {section.image && <div className="mt-4 overflow-hidden rounded-xl border border-white/10"><img src={section.image} alt={section.title || "Section"} className="max-h-[360px] w-full object-cover" /></div>}
                  </div>
                </div>

                <div className="p-6 sm:p-8"><div className="mb-5 flex items-center justify-between"><div><p className="text-[9px] font-bold uppercase tracking-[0.3em] text-white/40">Choose Products</p><p className="mt-1 text-xs text-white/30">Tap a product to add or remove it.</p></div><span className="rounded-full border border-amber-400/20 bg-amber-400/[0.05] px-4 py-2 text-xs text-amber-400">{selectedIds.length} selected</span></div>
                  {products.length === 0 ? <p className="rounded-2xl border border-dashed border-white/10 px-6 py-12 text-center text-sm text-white/30">No products are available for this store.</p> : <div className="grid max-h-[600px] grid-cols-1 gap-3 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3">{products.map((product) => { const selected = selectedIds.includes(product.id); const image = getImage(product.images); return <button key={product.id} type="button" onClick={() => toggleProduct(section.id, product.id)} className={`flex items-center gap-3 rounded-2xl border p-3 text-left ${selected ? "border-amber-400/40 bg-amber-400/[0.07]" : "border-white/[0.07] bg-black/30 hover:border-white/15"}`}><div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-white/[0.05]">{image ? <img src={image} alt={product.name || "Product"} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-white/15">V</div>}</div><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{product.name || "Unnamed Product"}</p><p className="mt-1 text-xs text-white/40">{formatPrice(product.price)}</p><p className="mt-1 truncate text-[9px] uppercase tracking-[0.15em] text-white/20">{product.category || "Uncategorized"}</p></div><span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[11px] font-black ${selected ? "border-amber-400 bg-amber-400 text-black" : "border-white/10 text-transparent"}`}>✓</span></button>; })}</div>}
                </div>
              </section>
            );
          })}
        </div>

        <div className="sticky bottom-4 z-30 mt-10"><div className="flex flex-col gap-3 rounded-2xl border border-white/[0.08] bg-[#0b0b0b]/95 p-3 shadow-2xl backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between"><div className="px-3"><p className="text-xs font-semibold">{sections.length} section{sections.length === 1 ? "" : "s"} configured</p><p className="mt-1 text-[10px] text-white/25">Save to publish your changes.</p></div><button type="button" onClick={saveStorefront} disabled={saving || Boolean(uploading)} className="rounded-full bg-amber-400 px-8 py-4 text-xs font-black uppercase tracking-[0.15em] text-black disabled:opacity-50">{saving ? "Saving..." : "Save Store Page"}</button></div></div>
      </div>
    </main>
  );
}
