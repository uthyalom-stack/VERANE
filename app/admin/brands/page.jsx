"use client";

import { useEffect, useState } from "react";

const defaultBrands = {
  UTHY_LUXURY: {
    name: "UTHY LUXURY",
    tagline: "Clothed Differently.",
    description:
      "Custom shirts, tailored trousers, hoodies and traditional pieces crafted to give your wardrobe its own identity.",
    image: "",
  },
  ALOMZIEE_FOOTIES: {
    name: "ALOMZIEE FOOTIES",
    tagline: "From the Ground Up.",
    description:
      "Handmade footwear and accessories built with character — shoes, sandals, slides, boots, belts and bags.",
    image: "",
  },
};

export default function BrandsPage() {
  const [settings, setSettings] = useState({});
  const [brands, setBrands] = useState(defaultBrands);
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState(null);

  useEffect(() => {
    loadBrands();
  }, []);

  async function loadBrands() {
    try {
      const response = await fetch("/api/admin/settings", {
        cache: "no-store",
      });

      const data = await response.json();

      setSettings(data || {});

      if (data?.brandData) {
        try {
          const parsed = JSON.parse(data.brandData);

          setBrands({
            ...defaultBrands,
            ...parsed,
          });
        } catch (error) {
          console.error("Failed to parse brand data:", error);
        }
      }
    } catch (error) {
      console.error("Failed to load brands:", error);
    }
  }

  function updateBrand(brandKey, field, value) {
    setBrands((current) => ({
      ...current,
      [brandKey]: {
        ...current[brandKey],
        [field]: value,
      },
    }));
  }

  async function uploadBrandImage(brandKey, file) {
    if (!file) return;

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
      "image/avif",
    ];

    if (!allowedTypes.includes(file.type)) {
      window.alert(
        "Only JPG, PNG, WEBP, GIF and AVIF images are allowed."
      );
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      window.alert("Image must be smaller than 10MB.");
      return;
    }

    try {
      setUploading(brandKey);

      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/admin/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok || !data?.success || !data?.url) {
        throw new Error(
          data?.error || "Failed to upload image."
        );
      }

      updateBrand(brandKey, "image", data.url);
    } catch (error) {
      console.error("Brand image upload failed:", error);

      window.alert(
        error?.message || "Failed to upload image."
      );
    } finally {
      setUploading(null);
    }
  }

  async function save() {
    try {
      const response = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...settings,
          brandData: JSON.stringify(brands),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error || "Failed to save brands."
        );
      }

      setSaved(true);

      setTimeout(() => {
        setSaved(false);
      }, 3000);
    } catch (error) {
      console.error("Failed to save brands:", error);

      window.alert(
        error?.message || "Failed to save brands."
      );
    }
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-4xl px-5 py-12">

        <div className="mb-10">
          <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.35em] text-amber-400">
            VÉRANE / BRANDS
          </p>

          <h1 className="mb-2 text-4xl font-black tracking-tight">
            Brands
          </h1>

          <p className="text-neutral-500">
            Manage UTHY LUXURY and ALOMZIEE FOOTIES.
          </p>
        </div>

        {Object.entries(brands).map(([key, brand]) => (
          <div
            key={key}
            className="mb-8 rounded-3xl border border-white/10 bg-neutral-950 p-7"
          >
            <h2 className="mb-5 text-2xl font-black text-amber-500">
              {brand.name}
            </h2>

            <div className="space-y-5">

              <div>
                <label className="mb-2 block text-xs font-bold text-neutral-400">
                  Brand Name
                </label>

                <input
                  value={brand.name || ""}
                  onChange={(event) =>
                    updateBrand(
                      key,
                      "name",
                      event.target.value
                    )
                  }
                  className="w-full rounded-xl border border-white/10 bg-black px-5 py-3 text-white outline-none transition focus:border-amber-400/40"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-bold text-neutral-400">
                  Tagline
                </label>

                <input
                  value={brand.tagline || ""}
                  onChange={(event) =>
                    updateBrand(
                      key,
                      "tagline",
                      event.target.value
                    )
                  }
                  className="w-full rounded-xl border border-white/10 bg-black px-5 py-3 text-white outline-none transition focus:border-amber-400/40"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-bold text-neutral-400">
                  Description
                </label>

                <textarea
                  value={brand.description || ""}
                  onChange={(event) =>
                    updateBrand(
                      key,
                      "description",
                      event.target.value
                    )
                  }
                  rows={4}
                  className="w-full resize-y rounded-xl border border-white/10 bg-black px-5 py-3 text-white outline-none transition focus:border-amber-400/40"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-bold text-neutral-400">
                  Brand Image
                </label>

                <div className="rounded-2xl border border-white/10 bg-black p-4">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center">

                    <div className="flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-neutral-950">
                      {brand.image ? (
                        <img
                          src={brand.image}
                          alt={brand.name || "Brand"}
                          className="h-full w-full object-cover"
                          onError={(event) => {
                            event.currentTarget.style.display = "none";
                          }}
                        />
                      ) : (
                        <span className="text-xs text-neutral-600">
                          No image
                        </span>
                      )}
                    </div>

                    <div className="flex-1">

                      <label
                        htmlFor={`brand-image-${key}`}
                        className="inline-flex cursor-pointer rounded-full bg-white px-5 py-3 text-sm font-bold text-black transition hover:bg-neutral-200"
                      >
                        {uploading === key
                          ? "Uploading..."
                          : brand.image
                          ? "Change Image"
                          : "Choose Image"}
                      </label>

                      <input
                        id={`brand-image-${key}`}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
                        className="hidden"
                        disabled={uploading === key}
                        onChange={(event) => {
                          const file = event.target.files?.[0];

                          if (file) {
                            uploadBrandImage(key, file);
                          }

                          event.target.value = "";
                        }}
                      />

                      <p className="mt-3 text-xs leading-5 text-neutral-600">
                        Pick an image directly from your device.
                        Maximum size: 10MB.
                      </p>

                      {brand.image && (
                        <button
                          type="button"
                          onClick={() =>
                            updateBrand(key, "image", "")
                          }
                          className="mt-3 text-xs font-bold text-red-400/70 transition hover:text-red-400"
                        >
                          Remove image
                        </button>
                      )}

                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        ))}

        <button
          type="button"
          onClick={save}
          className="w-full rounded-full bg-amber-500 px-6 py-4 font-bold text-black transition hover:bg-amber-400"
        >
          {saved ? "Saved ✓" : "Save Brands"}
        </button>

      </div>
    </main>
  );
}