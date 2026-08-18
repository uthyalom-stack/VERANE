"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export default function MediaPage() {
  const [images, setImages] = useState([]);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [message, setMessage] = useState("");
  const inputRef = useRef(null);

  /* -------------------------------------------------------
     LOAD MEDIA
  ------------------------------------------------------- */

  useEffect(() => {
    try {
      const stored = localStorage.getItem("verane_media");

      if (stored) {
        const parsed = JSON.parse(stored);

        if (Array.isArray(parsed)) {
          setImages(parsed);
        }
      }
    } catch (error) {
      console.error("Failed to load media:", error);
    }
  }, []);

  /* -------------------------------------------------------
     SAVE LOCAL MEDIA
  ------------------------------------------------------- */

  const persistImages = (updated) => {
    setImages(updated);

    try {
      localStorage.setItem("verane_media", JSON.stringify(updated));
    } catch (error) {
      console.error("Failed to save media locally:", error);
      setMessage("Storage limit reached. Try deleting unused images.");
    }
  };

  /* -------------------------------------------------------
     IMAGE PROCESSING
  ------------------------------------------------------- */

  const processFiles = async (files) => {
    if (!files.length) return;

    setUploading(true);
    setMessage("");

    const validFiles = files.filter((file) =>
      file.type.startsWith("image/")
    );

    if (!validFiles.length) {
      setMessage("Please select valid image files.");
      setUploading(false);
      return;
    }

    const newImages = [];

    for (const file of validFiles) {
      try {
        const result = await compressImage(file);

        newImages.push({
          id:
            typeof crypto !== "undefined" && crypto.randomUUID
              ? crypto.randomUUID()
              : `${Date.now()}-${Math.random()}`,
          src: result.src,
          name: file.name,
          size: file.size,
          width: result.width,
          height: result.height,
          type: file.type,
          createdAt: new Date().toISOString(),
        });
      } catch (error) {
        console.error("Image processing failed:", error);
      }
    }

    if (newImages.length) {
      persistImages([...newImages, ...images]);
      setMessage(
        `${newImages.length} image${
          newImages.length > 1 ? "s" : ""
        } added to your library.`
      );
    }

    setUploading(false);
  };

  const compressImage = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => {
        const img = new Image();

        img.onload = () => {
          try {
            const MAX_WIDTH = 1200;

            let width = img.width;
            let height = img.height;

            if (width > MAX_WIDTH) {
              height = Math.round((height / width) * MAX_WIDTH);
              width = MAX_WIDTH;
            }

            const canvas = document.createElement("canvas");

            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext("2d");

            if (!ctx) {
              reject(new Error("Canvas unavailable"));
              return;
            }

            ctx.drawImage(img, 0, 0, width, height);

            const compressed = canvas.toDataURL("image/jpeg", 0.72);

            resolve({
              src: compressed,
              width,
              height,
            });
          } catch (error) {
            reject(error);
          }
        };

        img.onerror = () => reject(new Error("Invalid image"));

        img.src = reader.result;
      };

      reader.onerror = () => reject(new Error("File could not be read"));

      reader.readAsDataURL(file);
    });
  };

  /* -------------------------------------------------------
     FILE INPUT
  ------------------------------------------------------- */

  const handleImage = async (e) => {
    const files = Array.from(e.target.files || []);

    await processFiles(files);

    e.target.value = "";
  };

  /* -------------------------------------------------------
     DRAG & DROP
  ------------------------------------------------------- */

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragActive(false);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    setDragActive(false);

    const files = Array.from(e.dataTransfer.files || []);

    await processFiles(files);
  };

  /* -------------------------------------------------------
     COPY IMAGE
  ------------------------------------------------------- */

  const copyImage = async (src) => {
    try {
      await navigator.clipboard.writeText(src);

      setMessage("Image data copied to clipboard.");

      setTimeout(() => {
        setMessage("");
      }, 2500);
    } catch (error) {
      console.error("Copy failed:", error);
      setMessage("Could not copy image data.");
    }
  };

  /* -------------------------------------------------------
     DOWNLOAD IMAGE
  ------------------------------------------------------- */

  const downloadImage = (image) => {
    const link = document.createElement("a");

    link.href = image.src;
    link.download = image.name || "verane-image.jpg";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  /* -------------------------------------------------------
     DELETE IMAGE
  ------------------------------------------------------- */

  const deleteImage = (id) => {
    const confirmed = window.confirm(
      "Delete this image from the media library?"
    );

    if (!confirmed) return;

    const updated = images.filter((img) => img.id !== id);

    persistImages(updated);

    if (selected?.id === id) {
      setSelected(null);
    }

    setMessage("Image removed.");
  };

  /* -------------------------------------------------------
     CLEAR LIBRARY
  ------------------------------------------------------- */

  const clearLibrary = () => {
    if (!images.length) return;

    const confirmed = window.confirm(
      "Delete every image in the media library? This cannot be undone."
    );

    if (!confirmed) return;

    persistImages([]);
    setSelected(null);
    setMessage("Media library cleared.");
  };

  /* -------------------------------------------------------
     DATABASE SAVE
  ------------------------------------------------------- */

  const save = async () => {
    try {
      setSaving(true);
      setMessage("");

      const response = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mediaLibrary: JSON.stringify(images),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save media library");
      }

      setSaved(true);
      setMessage("Media library saved successfully.");

      setTimeout(() => {
        setSaved(false);
      }, 3000);
    } catch (error) {
      console.error(error);
      setMessage("Could not save the media library.");
    } finally {
      setSaving(false);
    }
  };

  /* -------------------------------------------------------
     SEARCH
  ------------------------------------------------------- */

  const filteredImages = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return images;

    return images.filter((image) =>
      (image.name || "").toLowerCase().includes(query)
    );
  }, [images, search]);

  /* -------------------------------------------------------
     STATS
  ------------------------------------------------------- */

  const totalSize = useMemo(() => {
    const bytes = images.reduce(
      (total, image) => total + (image.size || 0),
      0
    );

    if (!bytes) return "0 KB";

    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }

    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }, [images]);

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="max-w-7xl mx-auto px-5 sm:px-8 py-10 sm:py-14">

        {/* HEADER */}
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mb-10">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <span className="w-2 h-2 rounded-full bg-amber-400" />

              <span className="text-[11px] uppercase tracking-[0.3em] text-neutral-500 font-semibold">
                VÉRANE / CONTENT
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl font-black tracking-tight">
              Media Library
            </h1>

            <p className="text-neutral-500 mt-3 max-w-xl">
              Your central image library for products, homepage sections,
              collections, branding and other visual content.
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => inputRef.current?.click()}
              className="bg-white text-black px-5 py-3 rounded-full text-sm font-bold hover:bg-neutral-200 transition"
            >
              + Add Media
            </button>

            {images.length > 0 && (
              <button
                onClick={save}
                disabled={saving}
                className="bg-amber-500 text-black px-5 py-3 rounded-full text-sm font-bold hover:bg-amber-400 transition disabled:opacity-50"
              >
                {saving
                  ? "Saving..."
                  : saved
                  ? "Saved ✓"
                  : "Save Changes"}
              </button>
            )}
          </div>
        </div>

        {/* STATS */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
          <div className="border border-white/10 bg-white/[0.025] rounded-2xl p-5">
            <p className="text-xs uppercase tracking-widest text-neutral-600">
              Assets
            </p>

            <p className="text-2xl font-black mt-2">
              {images.length}
            </p>
          </div>

          <div className="border border-white/10 bg-white/[0.025] rounded-2xl p-5">
            <p className="text-xs uppercase tracking-widest text-neutral-600">
              Storage
            </p>

            <p className="text-2xl font-black mt-2">
              {totalSize}
            </p>
          </div>

          <div className="border border-white/10 bg-white/[0.025] rounded-2xl p-5">
            <p className="text-xs uppercase tracking-widest text-neutral-600">
              Format
            </p>

            <p className="text-2xl font-black mt-2">
              JPEG
            </p>
          </div>

          <div className="border border-white/10 bg-white/[0.025] rounded-2xl p-5">
            <p className="text-xs uppercase tracking-widest text-neutral-600">
              Max Width
            </p>

            <p className="text-2xl font-black mt-2">
              1200px
            </p>
          </div>
        </div>

        {/* UPLOAD */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`
            relative border border-dashed rounded-3xl p-10 sm:p-14
            text-center cursor-pointer transition-all duration-300 mb-8
            ${
              dragActive
                ? "border-amber-400 bg-amber-400/[0.06]"
                : "border-white/10 bg-white/[0.015] hover:border-white/25 hover:bg-white/[0.025]"
            }
          `}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleImage}
            className="hidden"
          />

          <div className="w-14 h-14 mx-auto mb-5 rounded-2xl border border-white/10 bg-white/[0.04] flex items-center justify-center">
            <span className="text-2xl text-amber-400">
              {uploading ? "…" : "＋"}
            </span>
          </div>

          <h2 className="font-bold text-lg">
            {uploading ? "Processing images..." : "Upload images"}
          </h2>

          <p className="text-neutral-600 text-sm mt-2">
            Drag & drop images here or click to browse
          </p>

          <p className="text-[11px] text-neutral-700 mt-4 uppercase tracking-widest">
            JPG · PNG · WEBP · Auto optimized
          </p>
        </div>

        {/* MESSAGE */}
        {message && (
          <div className="mb-8 rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-4 flex items-center justify-between gap-4">
            <p className="text-sm text-neutral-300">
              {message}
            </p>

            <button
              onClick={() => setMessage("")}
              className="text-neutral-600 hover:text-white"
            >
              ×
            </button>
          </div>
        )}

        {/* TOOLBAR */}
        {images.length > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="font-bold text-xl">
                Library
              </h2>

              <p className="text-xs text-neutral-600 mt-1">
                {filteredImages.length} of {images.length} assets
              </p>
            </div>

            <div className="flex gap-3">
              <div className="relative">
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search media..."
                  className="w-full sm:w-64 bg-white/[0.04] border border-white/10 rounded-full px-5 py-3 text-sm outline-none placeholder:text-neutral-700 focus:border-amber-400/40"
                />
              </div>

              <button
                onClick={clearLibrary}
                className="border border-red-500/20 text-red-400 px-4 py-3 rounded-full text-xs font-bold hover:bg-red-500/10 transition"
              >
                Clear
              </button>
            </div>
          </div>
        )}

        {/* MEDIA GRID */}
        {filteredImages.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredImages.map((img) => (
              <div
                key={img.id}
                className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.025]"
              >
                <button
                  onClick={() => setSelected(img)}
                  className="block w-full text-left"
                >
                  <div className="aspect-square overflow-hidden bg-neutral-950">
                    <img
                      src={img.src}
                      alt={img.name || "VÉRANE media"}
                      className="w-full h-full object-cover transition duration-500 group-hover:scale-105"
                    />
                  </div>
                </button>

                {/* HOVER CONTROLS */}
                <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black via-black/80 to-transparent pt-12 opacity-0 group-hover:opacity-100 transition">
                  <div className="flex gap-2">
                    <button
                      onClick={() => copyImage(img.src)}
                      className="flex-1 bg-white text-black rounded-xl py-2 text-[11px] font-bold"
                    >
                      Copy
                    </button>

                    <button
                      onClick={() => downloadImage(img)}
                      className="bg-white/10 backdrop-blur text-white rounded-xl px-3 py-2 text-[11px] font-bold"
                    >
                      ↓
                    </button>

                    <button
                      onClick={() => deleteImage(img.id)}
                      className="bg-red-500/90 text-white rounded-xl px-3 py-2 text-[11px] font-bold"
                    >
                      ×
                    </button>
                  </div>
                </div>

                {/* FILE INFO */}
                <div className="p-3">
                  <p className="text-xs font-semibold truncate">
                    {img.name || "Untitled image"}
                  </p>

                  <p className="text-[10px] text-neutral-600 mt-1">
                    {img.width && img.height
                      ? `${img.width} × ${img.height}`
                      : "Image"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : images.length > 0 ? (
          <div className="text-center py-20 border border-white/10 rounded-3xl">
            <p className="text-neutral-500">
              No media matches "{search}".
            </p>

            <button
              onClick={() => setSearch("")}
              className="text-amber-400 text-sm font-semibold mt-3"
            >
              Clear search
            </button>
          </div>
        ) : (
          <div className="text-center py-20 border border-white/10 rounded-3xl bg-white/[0.015]">
            <div className="text-4xl mb-4 opacity-30">
              ◇
            </div>

            <h2 className="font-bold text-lg">
              Your media library is empty
            </h2>

            <p className="text-neutral-600 text-sm mt-2">
              Upload your first image to start building your visual library.
            </p>
          </div>
        )}
      </div>

      {/* IMAGE PREVIEW MODAL */}
      {selected && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-5"
          onClick={() => setSelected(null)}
        >
          <div
            className="relative max-w-5xl w-full max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSelected(null)}
              className="absolute -top-12 right-0 text-white/60 hover:text-white text-2xl"
            >
              ×
            </button>

            <div className="rounded-3xl overflow-hidden border border-white/10 bg-black">
              <img
                src={selected.src}
                alt={selected.name || "VÉRANE media"}
                className="max-h-[75vh] w-full object-contain"
              />
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-4">
              <div>
                <p className="font-semibold">
                  {selected.name || "Untitled image"}
                </p>

                <p className="text-xs text-neutral-600 mt-1">
                  {selected.width} × {selected.height}
                  {selected.size
                    ? ` · ${(selected.size / 1024).toFixed(0)} KB`
                    : ""}
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => copyImage(selected.src)}
                  className="bg-white text-black px-5 py-3 rounded-full text-xs font-bold"
                >
                  Copy Image Data
                </button>

                <button
                  onClick={() => downloadImage(selected)}
                  className="border border-white/10 px-5 py-3 rounded-full text-xs font-bold"
                >
                  Download
                </button>

                <button
                  onClick={() => {
                    deleteImage(selected.id);
                    setSelected(null);
                  }}
                  className="border border-red-500/20 text-red-400 px-5 py-3 rounded-full text-xs font-bold"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}