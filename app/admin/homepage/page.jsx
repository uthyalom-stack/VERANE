"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function HomepageSettings() {
  const router = useRouter();

  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);

  const [newSection, setNewSection] = useState({
    key: "",
    title: "",
    type: "text",
  });

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
      setLoading(true);
      setMessage("");

      const response = await fetch(
        "/api/admin/homepage",
        {
          cache: "no-store",
        }
      );

      if (!response.ok) {
        throw new Error(
          "Failed to load homepage settings"
        );
      }

      const data = await response.json();

      setSections(
        Array.isArray(data?.sections)
          ? data.sections
          : []
      );
    } catch (error) {
      console.error(
        "Failed to load homepage settings:",
        error
      );

      setMessage(
        "Could not load homepage settings."
      );
    } finally {
      setLoading(false);
    }
  }

  function updateSection(id, field, value) {
    setSections((current) =>
      current.map((section) =>
        (section.id || section.key) === id
          ? {
              ...section,
              [field]: value,
            }
          : section
      )
    );
  }

  function moveSection(index, direction) {
    const newIndex = index + direction;

    if (
      newIndex < 0 ||
      newIndex >= sections.length
    ) {
      return;
    }

    const newSections = [...sections];

    [
      newSections[index],
      newSections[newIndex],
    ] = [
      newSections[newIndex],
      newSections[index],
    ];

    setSections(
      newSections.map((section, position) => ({
        ...section,
        sortOrder: position,
      }))
    );
  }

  function addSection() {
    const rawKey = newSection.key.trim();

    if (!rawKey) {
      window.alert("Section key required.");
      return;
    }

    const key = rawKey
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-_]/g, "");

    if (!key) {
      window.alert(
        "Please enter a valid section key."
      );
      return;
    }

    const existingSection = sections.some(
      (section) => section.key === key
    );

    if (existingSection) {
      window.alert(
        "A section with this key already exists."
      );
      return;
    }

    const section = {
      key,
      title:
        newSection.title.trim() || rawKey,
      type: newSection.type || "text",
      enabled: true,
      sortOrder: sections.length,
      subtitle: "",
      description: "",
      image: "",
      mobileImage: "",
      buttonText: "",
      buttonLink: "",
      secondaryButtonText: "",
      secondaryButtonLink: "",
    };

    setSections((current) => [
      ...current,
      section,
    ]);

    setNewSection({
      key: "",
      title: "",
      type: "text",
    });

    setShowAddForm(false);
  }

  async function saveSections() {
    if (saving) return;

    try {
      setSaving(true);
      setMessage("");

      const response = await fetch(
        "/api/admin/homepage",
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            sections,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error || "Could not save."
        );
      }

      setSections(
        Array.isArray(data?.sections)
          ? data.sections
          : sections
      );

      setMessage("Saved successfully.");
    } catch (error) {
      console.error(
        "Failed to save homepage settings:",
        error
      );

      setMessage(
        error?.message || "Could not save."
      );
    } finally {
      setSaving(false);

      setTimeout(() => {
        setMessage("");
      }, 3000);
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black text-white">
        <p className="text-neutral-500">
          Loading homepage settings...
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white">

      <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8">

        {/* HEADER */}
        <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">

          <div>
            <button
              type="button"
              onClick={() =>
                router.push("/admin")
              }
              className="text-sm text-neutral-500 transition hover:text-white"
            >
              ← Back
            </button>

            <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.4em] text-amber-400">
              Site Management
            </p>

            <h1 className="mt-2 text-4xl font-black tracking-[-0.04em]">
              Homepage
            </h1>

            <p className="mt-2 text-sm text-neutral-500">
              Control the content and order of your
              homepage sections.
            </p>
          </div>

          <div className="flex gap-3">

            <button
              type="button"
              onClick={() =>
                setShowAddForm(
                  (current) => !current
                )
              }
              className="rounded-full border border-white/10 px-5 py-3 text-sm font-bold transition hover:border-white/20 hover:bg-white/[0.04]"
            >
              {showAddForm
                ? "Cancel"
                : "+ Add Section"}
            </button>

            <button
              type="button"
              onClick={saveSections}
              disabled={saving}
              className="rounded-full bg-amber-500 px-6 py-3 text-sm font-bold text-black transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving
                ? "Saving..."
                : "Save Changes"}
            </button>

          </div>

        </div>

        {/* STATUS MESSAGE */}
        {message && (
          <div
            className={`mb-6 rounded-2xl border px-5 py-4 text-sm ${
              message.toLowerCase().includes("could not")
                ? "border-red-500/20 bg-red-500/5 text-red-400"
                : "border-emerald-500/20 bg-emerald-500/5 text-emerald-400"
            }`}
          >
            {message}
          </div>
        )}

        {/* ADD SECTION */}
        {showAddForm && (
          <div className="mb-8 rounded-3xl border border-white/10 bg-neutral-950 p-6">

            <div className="mb-5">
              <h2 className="font-bold">
                Add Homepage Section
              </h2>

              <p className="mt-1 text-xs text-neutral-600">
                Create a new editable section for
                the homepage.
              </p>
            </div>

            <div className="grid gap-3 md:grid-cols-3">

              <input
                value={newSection.key}
                onChange={(event) =>
                  setNewSection((current) => ({
                    ...current,
                    key: event.target.value,
                  }))
                }
                className="rounded-xl border border-white/10 bg-black px-4 py-3 text-sm outline-none transition focus:border-amber-400/40"
                placeholder="Section key"
              />

              <input
                value={newSection.title}
                onChange={(event) =>
                  setNewSection((current) => ({
                    ...current,
                    title: event.target.value,
                  }))
                }
                className="rounded-xl border border-white/10 bg-black px-4 py-3 text-sm outline-none transition focus:border-amber-400/40"
                placeholder="Section title"
              />

              <button
                type="button"
                onClick={addSection}
                className="rounded-xl bg-white px-5 py-3 text-sm font-bold text-black transition hover:bg-neutral-200"
              >
                Add Section
              </button>

            </div>

          </div>
        )}

        {/* SECTIONS */}
        {sections.length === 0 ? (

          <div className="rounded-3xl border border-white/10 bg-neutral-950 py-24 text-center">

            <p className="font-semibold">
              No homepage sections found.
            </p>

            <p className="mt-2 text-sm text-neutral-600">
              Add your first section above.
            </p>

          </div>

        ) : (

          <div className="space-y-6">

            {sections.map(
              (section, index) => {

                const sectionId =
                  section.id || section.key;

                return (
                  <div
                    key={sectionId}
                    className="rounded-3xl border border-white/10 bg-neutral-950 p-6"
                  >

                    {/* SECTION HEADER */}
                    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

                      <div className="flex items-center gap-3">

                        <div className="flex gap-2">

                          <button
                            type="button"
                            onClick={() =>
                              moveSection(
                                index,
                                -1
                              )
                            }
                            disabled={
                              index === 0
                            }
                            aria-label="Move section up"
                            className="rounded-lg border border-white/10 px-3 py-1 text-neutral-400 transition hover:bg-white/[0.04] disabled:cursor-not-allowed disabled:opacity-30"
                          >
                            ↑
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              moveSection(
                                index,
                                1
                              )
                            }
                            disabled={
                              index ===
                              sections.length -
                                1
                            }
                            aria-label="Move section down"
                            className="rounded-lg border border-white/10 px-3 py-1 text-neutral-400 transition hover:bg-white/[0.04] disabled:cursor-not-allowed disabled:opacity-30"
                          >
                            ↓
                          </button>

                        </div>

                        <div>
                          <h2 className="font-bold">
                            {section.title ||
                              section.key}
                          </h2>

                          <p className="mt-1 text-[10px] uppercase tracking-wider text-neutral-600">
                            {section.key}
                            {" • "}
                            {section.type ||
                              "text"}
                          </p>
                        </div>

                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          updateSection(
                            sectionId,
                            "enabled",
                            !section.enabled
                          )
                        }
                        className={`rounded-lg px-4 py-2 text-xs font-bold transition ${
                          section.enabled
                            ? "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/15"
                            : "bg-white/5 text-neutral-500 hover:bg-white/10"
                        }`}
                      >
                        {section.enabled
                          ? "Enabled"
                          : "Disabled"}
                      </button>

                    </div>

                    {/* FIELDS */}
                    <div className="grid gap-4 md:grid-cols-2">

                      {/* TITLE */}
                      <div>
                        <label className="mb-1 block text-xs text-neutral-500">
                          Title
                        </label>

                        <input
                          value={
                            section.title || ""
                          }
                          onChange={(event) =>
                            updateSection(
                              sectionId,
                              "title",
                              event.target.value
                            )
                          }
                          className="w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-sm outline-none transition focus:border-amber-400/40"
                        />
                      </div>

                      {/* SUBTITLE */}
                      <div>
                        <label className="mb-1 block text-xs text-neutral-500">
                          Subtitle
                        </label>

                        <input
                          value={
                            section.subtitle || ""
                          }
                          onChange={(event) =>
                            updateSection(
                              sectionId,
                              "subtitle",
                              event.target.value
                            )
                          }
                          className="w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-sm outline-none transition focus:border-amber-400/40"
                        />
                      </div>

                      {/* DESCRIPTION */}
                      <div className="md:col-span-2">
                        <label className="mb-1 block text-xs text-neutral-500">
                          Description
                        </label>

                        <textarea
                          value={
                            section.description ||
                            ""
                          }
                          onChange={(event) =>
                            updateSection(
                              sectionId,
                              "description",
                              event.target.value
                            )
                          }
                          rows={3}
                          className="w-full resize-y rounded-xl border border-white/10 bg-black px-4 py-3 text-sm outline-none transition focus:border-amber-400/40"
                        />
                      </div>

                      {/* IMAGE */}
                      <div>
                        <label className="mb-1 block text-xs text-neutral-500">
                          Image URL
                        </label>

                        <input
                          value={
                            section.image || ""
                          }
                          onChange={(event) =>
                            updateSection(
                              sectionId,
                              "image",
                              event.target.value
                            )
                          }
                          className="w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-sm outline-none transition focus:border-amber-400/40"
                          placeholder="https://..."
                        />

                        {section.image && (
                          <div className="mt-3 overflow-hidden rounded-xl border border-white/10 bg-black">
                            <img
                              src={section.image}
                              alt=""
                              className="h-32 w-full object-cover"
                              onError={(event) => {
                                event.currentTarget.style.display =
                                  "none";
                              }}
                            />
                          </div>
                        )}
                      </div>

                      {/* MOBILE IMAGE */}
                      <div>
                        <label className="mb-1 block text-xs text-neutral-500">
                          Mobile Image URL
                        </label>

                        <input
                          value={
                            section.mobileImage ||
                            ""
                          }
                          onChange={(event) =>
                            updateSection(
                              sectionId,
                              "mobileImage",
                              event.target.value
                            )
                          }
                          className="w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-sm outline-none transition focus:border-amber-400/40"
                          placeholder="https://..."
                        />
                      </div>

                      {/* BUTTON TEXT */}
                      <div>
                        <label className="mb-1 block text-xs text-neutral-500">
                          Button Text
                        </label>

                        <input
                          value={
                            section.buttonText ||
                            ""
                          }
                          onChange={(event) =>
                            updateSection(
                              sectionId,
                              "buttonText",
                              event.target.value
                            )
                          }
                          className="w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-sm outline-none transition focus:border-amber-400/40"
                          placeholder="Shop Now"
                        />
                      </div>

                      {/* BUTTON LINK */}
                      <div>
                        <label className="mb-1 block text-xs text-neutral-500">
                          Button Link
                        </label>

                        <input
                          value={
                            section.buttonLink ||
                            ""
                          }
                          onChange={(event) =>
                            updateSection(
                              sectionId,
                              "buttonLink",
                              event.target.value
                            )
                          }
                          className="w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-sm outline-none transition focus:border-amber-400/40"
                          placeholder="/catalog"
                        />
                      </div>

                      {/* SECONDARY BUTTON TEXT */}
                      <div>
                        <label className="mb-1 block text-xs text-neutral-500">
                          Secondary Button Text
                        </label>

                        <input
                          value={
                            section.secondaryButtonText ||
                            ""
                          }
                          onChange={(event) =>
                            updateSection(
                              sectionId,
                              "secondaryButtonText",
                              event.target.value
                            )
                          }
                          className="w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-sm outline-none transition focus:border-amber-400/40"
                          placeholder="Explore Collection"
                        />
                      </div>

                      {/* SECONDARY BUTTON LINK */}
                      <div>
                        <label className="mb-1 block text-xs text-neutral-500">
                          Secondary Button Link
                        </label>

                        <input
                          value={
                            section.secondaryButtonLink ||
                            ""
                          }
                          onChange={(event) =>
                            updateSection(
                              sectionId,
                              "secondaryButtonLink",
                              event.target.value
                            )
                          }
                          className="w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-sm outline-none transition focus:border-amber-400/40"
                          placeholder="/catalog"
                        />
                      </div>

                    </div>

                  </div>
                );
              }
            )}

          </div>

        )}

      </div>

    </main>
  );
}