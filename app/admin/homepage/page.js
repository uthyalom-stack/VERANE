"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function HomepageSettings() {
  const router = useRouter();

  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const auth = localStorage.getItem("adminAuth");

    if (auth !== "true") {
      router.replace("/admin/login");
      return;
    }

    loadSections();
  }, [router]);

  async function loadSections() {
    try {
      const response = await fetch("/api/admin/homepage");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to load homepage");
      }

      setSections(data.sections || []);
    } catch (error) {
      console.error(error);
      setMessage("Could not load homepage settings.");
    } finally {
      setLoading(false);
    }
  }

  function updateSection(id, field, value) {
    setSections((current) =>
      current.map((section) =>
        section.id === id
          ? { ...section, [field]: value }
          : section
      )
    );
  }

  async function saveSections() {
    setSaving(true);
    setMessage("");

    try {
      const response = await fetch("/api/admin/homepage", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sections,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to save");
      }

      setSections(data.sections || sections);
      setMessage("Homepage saved successfully.");
    } catch (error) {
      console.error(error);
      setMessage("Could not save homepage.");
    } finally {
      setSaving(false);

      setTimeout(() => {
        setMessage("");
      }, 3000);
    }
  }

  function moveSection(index, direction) {
    const newSections = [...sections];
    const newIndex = index + direction;

    if (newIndex < 0 || newIndex >= newSections.length) {
      return;
    }

    [newSections[index], newSections[newIndex]] = [
      newSections[newIndex],
      newSections[index],
    ];

    setSections(
      newSections.map((section, i) => ({
        ...section,
        sortOrder: i,
      }))
    );
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        <p className="text-neutral-500">Loading homepage...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="max-w-6xl mx-auto px-5 sm:px-8 py-8 md:py-12">

        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          <div>
            <button
              onClick={() => router.push("/admin")}
              className="text-neutral-500 hover:text-white text-sm mb-5"
            >
              ← Back to Dashboard
            </button>

            <p className="text-amber-400 text-[10px] font-bold uppercase tracking-[0.35em]">
              VÉRANE ADMIN
            </p>

            <h1 className="text-4xl md:text-6xl font-black tracking-tight mt-3">
              Homepage
            </h1>

            <p className="text-neutral-500 mt-3">
              Control every section of your homepage.
            </p>
          </div>

          <button
            onClick={saveSections}
            disabled={saving}
            className="px-7 py-4 rounded-full bg-amber-500 text-black text-sm font-black hover:bg-amber-400 transition disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Homepage"}
          </button>
        </div>

        {message && (
          <div className="mt-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-5 py-4 text-sm text-emerald-400">
            {message}
          </div>
        )}

        <div className="mt-10 space-y-6">
          {sections.map((section, index) => (
            <div
              key={section.id}
              className={`rounded-3xl border p-6 md:p-8 transition ${
                section.enabled
                  ? "border-white/10 bg-neutral-950"
                  : "border-white/5 bg-neutral-950/50 opacity-60"
              }`}
            >
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5">

                <div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-neutral-600 font-bold">
                      #{index + 1}
                    </span>

                    <h2 className="text-xl md:text-2xl font-black">
                      {section.key}
                    </h2>
                  </div>

                  <p className="text-xs text-neutral-600 mt-2 uppercase tracking-wider">
                    Homepage Section
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => moveSection(index, -1)}
                    disabled={index === 0}
                    className="px-3 py-2 rounded-lg border border-white/10 text-neutral-400 hover:text-white disabled:opacity-20"
                  >
                    ↑
                  </button>

                  <button
                    type="button"
                    onClick={() => moveSection(index, 1)}
                    disabled={index === sections.length - 1}
                    className="px-3 py-2 rounded-lg border border-white/10 text-neutral-400 hover:text-white disabled:opacity-20"
                  >
                    ↓
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      updateSection(
                        section.id,
                        "enabled",
                        !section.enabled
                      )
                    }
                    className={`px-4 py-2 rounded-lg text-xs font-bold ${
                      section.enabled
                        ? "bg-emerald-500/10 text-emerald-400"
                        : "bg-white/5 text-neutral-500"
                    }`}
                  >
                    {section.enabled ? "Enabled" : "Disabled"}
                  </button>
                </div>
              </div>

              <div className="h-px bg-white/5 my-7" />

              <div className="grid md:grid-cols-2 gap-5">

                <Input
                  label="Title"
                  value={section.title}
                  onChange={(value) =>
                    updateSection(section.id, "title", value)
                  }
                />

                <Input
                  label="Subtitle"
                  value={section.subtitle}
                  onChange={(value) =>
                    updateSection(section.id, "subtitle", value)
                  }
                />

                <Textarea
                  label="Description"
                  value={section.description}
                  onChange={(value) =>
                    updateSection(
                      section.id,
                      "description",
                      value
                    )
                  }
                />

                <div className="space-y-5">
                  <Input
                    label="Desktop Image URL"
                    value={section.image}
                    onChange={(value) =>
                      updateSection(
                        section.id,
                        "image",
                        value
                      )
                    }
                    placeholder="/images/homepage.jpg"
                  />

                  <Input
                    label="Mobile Image URL"
                    value={section.mobileImage}
                    onChange={(value) =>
                      updateSection(
                        section.id,
                        "mobileImage",
                        value
                      )
                    }
                    placeholder="/images/homepage-mobile.jpg"
                  />
                </div>

                <Input
                  label="Button Text"
                  value={section.buttonText}
                  onChange={(value) =>
                    updateSection(
                      section.id,
                      "buttonText",
                      value
                    )
                  }
                />

                <Input
                  label="Button Link"
                  value={section.buttonLink}
                  onChange={(value) =>
                    updateSection(
                      section.id,
                      "buttonLink",
                      value
                    )
                  }
                />

                <Input
                  label="Secondary Button Text"
                  value={section.secondaryButtonText}
                  onChange={(value) =>
                    updateSection(
                      section.id,
                      "secondaryButtonText",
                      value
                    )
                  }
                />

                <Input
                  label="Secondary Button Link"
                  value={section.secondaryButtonLink}
                  onChange={(value) =>
                    updateSection(
                      section.id,
                      "secondaryButtonLink",
                      value
                    )
                  }
                />
              </div>
            </div>
          ))}
        </div>

        {sections.length === 0 && (
          <div className="mt-10 rounded-3xl border border-white/10 bg-neutral-950 p-10 text-center">
            <p className="text-neutral-500">
              No homepage sections found.
            </p>
          </div>
        )}

        <div className="mt-8 flex justify-end">
          <button
            onClick={saveSections}
            disabled={saving}
            className="px-7 py-4 rounded-full bg-amber-500 text-black text-sm font-black hover:bg-amber-400 transition disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Homepage"}
          </button>
        </div>
      </div>
    </main>
  );
}

function Input({
  label,
  value,
  onChange,
  placeholder = "",
}) {
  return (
    <label className="block">
      <span className="block text-xs font-bold text-neutral-400 mb-2">
        {label}
      </span>

      <input
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-sm text-white outline-none focus:border-amber-500/50"
      />
    </label>
  );
}

function Textarea({
  label,
  value,
  onChange,
}) {
  return (
    <label className="block md:col-span-2">
      <span className="block text-xs font-bold text-neutral-400 mb-2">
        {label}
      </span>

      <textarea
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        rows={4}
        className="w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-sm text-white outline-none focus:border-amber-500/50 resize-none"
      />
    </label>
  );
}