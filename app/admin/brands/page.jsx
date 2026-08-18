"use client";
import { useState, useEffect } from "react";

const defaultBrands = {
  UTHY_LUXURY: {
    name: "UTHY LUXURY",
    tagline: "Clothed Differently.",
    description: "Custom shirts, tailored trousers, hoodies and traditional pieces crafted to give your wardrobe its own identity.",
    image: "",
  },
  ALOMZIEE_FOOTIES: {
    name: "ALOMZIEE FOOTIES",
    tagline: "From the Ground Up.",
    description: "Handmade footwear and accessories built with character — shoes, sandals, slides, boots, belts and bags.",
    image: "",
  },
};

export default function BrandsPage() {
  const [settings, setSettings] = useState({});
  const [brands, setBrands] = useState(defaultBrands);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/admin/settings").then(r => r.json()).then(data => {
      setSettings(data);
      if (data.brandData) {
        try {
          setBrands(JSON.parse(data.brandData));
        } catch {}
      }
    });
  }, []);

  const updateBrand = (brandKey, field, value) => {
    setBrands(prev => ({
      ...prev,
      [brandKey]: { ...prev[brandKey], [field]: value },
    }));
  };

  const save = async () => {
    await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...settings, brandData: JSON.stringify(brands) }),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="max-w-4xl mx-auto px-5 py-12">
        <h1 className="text-4xl font-black mb-2">Brands</h1>
        <p className="text-neutral-500 mb-10">Manage UTHY LUXURY and ALOMZIEE FOOTIES.</p>

        {Object.entries(brands).map(([key, brand]) => (
          <div key={key} className="bg-neutral-950 border border-white/10 rounded-3xl p-7 mb-8">
            <h2 className="text-2xl font-black text-amber-500 mb-5">{brand.name}</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-neutral-400 mb-2">Brand Name</label>
                <input value={brand.name} onChange={e => updateBrand(key, "name", e.target.value)} className="w-full bg-black border border-white/10 rounded-xl px-5 py-3 text-white" />
              </div>
              <div>
                <label className="block text-xs font-bold text-neutral-400 mb-2">Tagline</label>
                <input value={brand.tagline} onChange={e => updateBrand(key, "tagline", e.target.value)} className="w-full bg-black border border-white/10 rounded-xl px-5 py-3 text-white" />
              </div>
              <div>
                <label className="block text-xs font-bold text-neutral-400 mb-2">Description</label>
                <textarea value={brand.description} onChange={e => updateBrand(key, "description", e.target.value)} rows={3} className="w-full bg-black border border-white/10 rounded-xl px-5 py-3 text-white" />
              </div>
              <div>
                <label className="block text-xs font-bold text-neutral-400 mb-2">Brand Image URL</label>
                <input value={brand.image} onChange={e => updateBrand(key, "image", e.target.value)} className="w-full bg-black border border-white/10 rounded-xl px-5 py-3 text-white" placeholder="https://..." />
              </div>
            </div>
          </div>
        ))}

        <button onClick={save} className="w-full bg-amber-500 text-black px-6 py-4 rounded-full font-bold">
          {saved ? "Saved ✓" : "Save Brands"}
        </button>
      </div>
    </main>
  );
}