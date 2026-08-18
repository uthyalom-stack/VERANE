"use client";

import { useEffect, useState } from "react";

const DEFAULT_FOOTER = {
  footerText: "© 2026 VÉRANE. All rights reserved.",
  footerDescription: "",
  footerExploreTitle: "Explore",
  footerContactTitle: "Contact",
  footerSocialTitle: "Follow",
};

export default function FooterPage() {
  const [settings, setSettings] = useState(DEFAULT_FOOTER);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadFooter();
  }, []);

  async function loadFooter() {
    try {
      setLoading(true);

      const response = await fetch("/api/admin/settings");
      const data = await response.json();

      setSettings({
        ...DEFAULT_FOOTER,
        ...data,
      });
    } catch (error) {
      console.error("Failed to load footer:", error);
      setMessage("Failed to load footer settings.");
    } finally {
      setLoading(false);
    }
  }

  function updateSetting(key, value) {
    setSettings((current) => ({
      ...current,
      [key]: value,
    }));
  }

  async function saveFooter() {
    try {
      setSaving(true);
      setSaved(false);
      setMessage("");

      const response = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          footerText: settings.footerText || "",
          footerDescription: settings.footerDescription || "",
          footerExploreTitle:
            settings.footerExploreTitle || "",
          footerContactTitle:
            settings.footerContactTitle || "",
          footerSocialTitle:
            settings.footerSocialTitle || "",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error || "Failed to save footer."
        );
      }

      setSaved(true);
      setMessage("Footer settings saved successfully.");

      setTimeout(() => {
        setSaved(false);
      }, 3000);
    } catch (error) {
      console.error("Failed to save footer:", error);
      setMessage(
        error.message || "Failed to save footer settings."
      );
    } finally {
      setSaving(false);
    }
  }

  function resetDefaults() {
    if (
      !confirm(
        "Reset the footer text and section titles to their defaults?"
      )
    ) {
      return;
    }

    setSettings((current) => ({
      ...current,
      ...DEFAULT_FOOTER,
    }));

    setMessage(
      "Defaults restored. Save the footer to apply them."
    );
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-black text-white">
        <div className="mx-auto max-w-5xl px-5 py-16 sm:px-8">
          <div className="rounded-[28px] border border-white/[0.08] bg-white/[0.025] px-6 py-20 text-center text-sm text-white/30">
            Loading footer settings...
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-5xl px-5 py-10 sm:px-8 lg:px-10">

        {/* HEADER */}
        <header className="mb-10">
          <div className="mb-5 flex items-center gap-3">
            <span className="h-px w-10 bg-amber-400" />

            <span className="text-[10px] font-bold uppercase tracking-[0.35em] text-amber-400">
              VÉRANE / FOOTER
            </span>
          </div>

          <h1 className="text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">
            Footer
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-7 text-white/40">
            Control the content and section labels displayed
            throughout the bottom of your storefront.
          </p>
        </header>

        {/* MESSAGE */}
        {message && (
          <div className="mb-6 rounded-2xl border border-amber-400/20 bg-amber-400/[0.05] px-5 py-4 text-sm text-amber-300">
            {message}
          </div>
        )}

        {/* MAIN EDITOR */}
        <section className="overflow-hidden rounded-[28px] border border-white/[0.08] bg-white/[0.025]">

          <div className="border-b border-white/[0.06] px-6 py-5 sm:px-8">
            <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-amber-400/70">
              Footer Content
            </p>

            <h2 className="mt-2 text-xl font-semibold tracking-tight">
              Storefront footer
            </h2>
          </div>

          <div className="space-y-8 p-6 sm:p-8">

            {/* COPYRIGHT */}
            <div>
              <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">
                Copyright Text
              </label>

              <input
                value={settings.footerText || ""}
                onChange={(e) =>
                  updateSetting(
                    "footerText",
                    e.target.value
                  )
                }
                placeholder="© 2026 VÉRANE. All rights reserved."
                className="w-full rounded-2xl border border-white/[0.08] bg-black px-5 py-4 text-sm text-white outline-none transition placeholder:text-white/20 focus:border-amber-400/40"
              />

              <p className="mt-2 text-xs text-white/25">
                This appears at the very bottom of the
                storefront.
              </p>
            </div>

            {/* DESCRIPTION */}
            <div>
              <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">
                Footer Description
              </label>

              <textarea
                value={settings.footerDescription || ""}
                onChange={(e) =>
                  updateSetting(
                    "footerDescription",
                    e.target.value
                  )
                }
                rows={4}
                placeholder="Two brands. One expression."
                className="w-full resize-none rounded-2xl border border-white/[0.08] bg-black px-5 py-4 text-sm text-white outline-none transition placeholder:text-white/20 focus:border-amber-400/40"
              />

              <p className="mt-2 text-xs text-white/25">
                Optional supporting text underneath your brand
                name.
              </p>
            </div>

            {/* SECTION TITLES */}
            <div>
              <div className="mb-5">
                <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-amber-400/70">
                  Footer Sections
                </p>

                <p className="mt-2 text-sm text-white/30">
                  Change the titles displayed above each footer
                  column.
                </p>
              </div>

              <div className="grid gap-5 sm:grid-cols-3">

                <div>
                  <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.2em] text-white/30">
                    Explore
                  </label>

                  <input
                    value={
                      settings.footerExploreTitle || ""
                    }
                    onChange={(e) =>
                      updateSetting(
                        "footerExploreTitle",
                        e.target.value
                      )
                    }
                    placeholder="Explore"
                    className="w-full rounded-2xl border border-white/[0.08] bg-black px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/20 focus:border-amber-400/40"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.2em] text-white/30">
                    Contact
                  </label>

                  <input
                    value={
                      settings.footerContactTitle || ""
                    }
                    onChange={(e) =>
                      updateSetting(
                        "footerContactTitle",
                        e.target.value
                      )
                    }
                    placeholder="Contact"
                    className="w-full rounded-2xl border border-white/[0.08] bg-black px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/20 focus:border-amber-400/40"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.2em] text-white/30">
                    Social
                  </label>

                  <input
                    value={
                      settings.footerSocialTitle || ""
                    }
                    onChange={(e) =>
                      updateSetting(
                        "footerSocialTitle",
                        e.target.value
                      )
                    }
                    placeholder="Follow"
                    className="w-full rounded-2xl border border-white/[0.08] bg-black px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/20 focus:border-amber-400/40"
                  />
                </div>

              </div>
            </div>

            {/* PREVIEW */}
            <div>
              <div className="mb-4">
                <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-amber-400/70">
                  Preview
                </p>
              </div>

              <div className="overflow-hidden rounded-[24px] border border-white/[0.07] bg-neutral-950">

                <div className="grid grid-cols-2 gap-8 p-6 sm:grid-cols-4">

                  <div>
                    <p className="font-black text-amber-400">
                      VÉRANE
                    </p>

                    <p className="mt-2 text-xs leading-5 text-white/30">
                      {settings.footerDescription ||
                        settings.tagline ||
                        "Two Brands. One Expression."}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-bold text-white">
                      {settings.footerExploreTitle ||
                        "Explore"}
                    </p>

                    <div className="mt-3 space-y-2 text-xs text-white/30">
                      <p>Shop</p>
                      <p>Outfit Builder</p>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-bold text-white">
                      {settings.footerContactTitle ||
                        "Contact"}
                    </p>

                    <div className="mt-3 space-y-2 text-xs text-white/30">
                      <p>Email</p>
                      <p>Phone</p>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-bold text-white">
                      {settings.footerSocialTitle ||
                        "Follow"}
                    </p>

                    <div className="mt-3 space-y-2 text-xs text-white/30">
                      <p>Instagram</p>
                      <p>TikTok</p>
                    </div>
                  </div>

                </div>

                <div className="border-t border-white/[0.06] px-6 py-4 text-center text-[10px] text-white/20">
                  {settings.footerText ||
                    "© 2026 VÉRANE. All rights reserved."}
                </div>

              </div>
            </div>

            {/* ACTIONS */}
            <div className="flex flex-col gap-3 border-t border-white/[0.06] pt-6 sm:flex-row sm:items-center sm:justify-between">

              <button
                type="button"
                onClick={resetDefaults}
                className="w-fit text-[10px] font-bold uppercase tracking-[0.2em] text-white/30 transition hover:text-white"
              >
                Reset Defaults
              </button>

              <button
                type="button"
                onClick={saveFooter}
                disabled={saving}
                className="rounded-full bg-amber-400 px-7 py-3 text-xs font-bold text-black transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving
                  ? "Saving..."
                  : saved
                  ? "Saved ✓"
                  : "Save Footer"}
              </button>

            </div>
          </div>
        </section>

        {/* NOTE */}
        <section className="mt-8 rounded-[24px] border border-white/[0.06] bg-white/[0.02] p-6">
          <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-amber-400/60">
            Important
          </p>

          <p className="mt-3 text-sm leading-6 text-white/35">
            These settings are stored in your database. The
            storefront footer must read these values from the
            settings API for changes made here to appear
            automatically across the website.
          </p>
        </section>

      </div>
    </main>
  );
}