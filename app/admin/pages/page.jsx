"use client";

import { useEffect, useState } from "react";

const DEFAULT_PAGES = [
  {
    key: "about",
    name: "About Page",
    label: "ABOUT",
    description: "Tell customers about your brand and story.",
    content: "",
  },
  {
    key: "contact",
    name: "Contact Page",
    label: "CONTACT",
    description: "Provide customers with ways to reach your brand.",
    content: "",
  },
  {
    key: "faq",
    name: "FAQ Page",
    label: "FAQ",
    description: "Answer common questions about your products and services.",
    content: "",
  },
];

export default function PagesManagement() {
  const [pages, setPages] = useState(DEFAULT_PAGES);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadPages();
  }, []);

  async function loadPages() {
    try {
      setLoading(true);

      const response = await fetch("/api/admin/settings");
      const data = await response.json();

      if (data.pageContent) {
        try {
          const storedPages = JSON.parse(data.pageContent);

          if (Array.isArray(storedPages)) {
            setPages(
              DEFAULT_PAGES.map((defaultPage) => {
                const storedPage = storedPages.find(
                  (page) => page.key === defaultPage.key
                );

                return {
                  ...defaultPage,
                  ...(storedPage || {}),
                };
              })
            );
          }
        } catch (error) {
          console.error("Invalid saved page content:", error);
        }
      }
    } catch (error) {
      console.error("Failed to load pages:", error);
      setMessage("Failed to load page settings.");
    } finally {
      setLoading(false);
    }
  }

  function updatePage(key, value) {
    setPages((currentPages) =>
      currentPages.map((page) =>
        page.key === key
          ? {
              ...page,
              content: value,
            }
          : page
      )
    );
  }

  async function savePages() {
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
          pageContent: JSON.stringify(
            pages.map((page) => ({
              key: page.key,
              name: page.name,
              content: page.content,
            }))
          ),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error || "Failed to save pages."
        );
      }

      setSaved(true);
      setMessage("Page content saved successfully.");

      setTimeout(() => {
        setSaved(false);
      }, 3000);
    } catch (error) {
      console.error("Failed to save pages:", error);

      setMessage(
        error.message || "Failed to save page content."
      );
    } finally {
      setSaving(false);
    }
  }

  function resetPages() {
    if (
      !confirm(
        "Reset all page content? This will clear the saved About, Contact and FAQ content."
      )
    ) {
      return;
    }

    setPages(DEFAULT_PAGES);
    setMessage(
      "Pages have been reset. Save the pages to apply the reset."
    );
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-black text-white">
        <div className="mx-auto max-w-5xl px-5 py-16 sm:px-8">
          <div className="rounded-[28px] border border-white/[0.08] bg-white/[0.025] px-6 py-20 text-center text-sm text-white/30">
            Loading pages...
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
              VÉRANE / PAGES
            </span>
          </div>

          <h1 className="text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">
            Pages
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-7 text-white/40">
            Create and manage the content customers see on
            your informational pages.
          </p>
        </header>

        {/* STATUS */}
        {message && (
          <div className="mb-6 rounded-2xl border border-amber-400/20 bg-amber-400/[0.05] px-5 py-4 text-sm text-amber-300">
            {message}
          </div>
        )}

        {/* PAGE EDITORS */}
        <div className="space-y-5">

          {pages.map((page, index) => (
            <section
              key={page.key}
              className="overflow-hidden rounded-[28px] border border-white/[0.08] bg-white/[0.025]"
            >
              {/* CARD HEADER */}
              <div className="flex flex-col gap-4 border-b border-white/[0.06] px-6 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8">

                <div className="flex items-center gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/[0.08] bg-black text-sm font-bold text-amber-400">
                    {String(index + 1).padStart(2, "0")}
                  </div>

                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-amber-400/70">
                      {page.label}
                    </p>

                    <h2 className="mt-1 text-xl font-semibold tracking-tight">
                      {page.name}
                    </h2>
                  </div>
                </div>

                <span className="w-fit rounded-full border border-white/[0.07] bg-black px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.2em] text-white/30">
                  /{page.key}
                </span>

              </div>

              {/* EDITOR */}
              <div className="p-6 sm:p-8">

                <p className="mb-4 text-sm leading-6 text-white/30">
                  {page.description}
                </p>

                <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">
                  Page Content
                </label>

                <textarea
                  value={page.content || ""}
                  onChange={(event) =>
                    updatePage(
                      page.key,
                      event.target.value
                    )
                  }
                  rows={9}
                  placeholder={`Write your ${page.name.replace(
                    " Page",
                    ""
                  )} content here...`}
                  className="w-full resize-y rounded-2xl border border-white/[0.08] bg-black px-5 py-4 text-sm leading-7 text-white outline-none transition placeholder:text-white/20 focus:border-amber-400/40"
                />

                <p className="mt-3 text-xs text-white/20">
                  Plain text is supported. You can write your
                  content naturally and save it here.
                </p>

              </div>
            </section>
          ))}

        </div>

        {/* ACTION BAR */}
        <section className="mt-8 rounded-[28px] border border-white/[0.08] bg-white/[0.025] p-6 sm:p-7">

          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">

            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-amber-400/70">
                Page Management
              </p>

              <p className="mt-2 text-sm text-white/35">
                Save all page changes to your database.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">

              <button
                type="button"
                onClick={resetPages}
                className="rounded-full border border-white/[0.08] px-6 py-3 text-xs font-bold text-white/40 transition hover:border-white/20 hover:text-white"
              >
                Reset
              </button>

              <button
                type="button"
                onClick={savePages}
                disabled={saving}
                className="rounded-full bg-amber-400 px-7 py-3 text-xs font-bold text-black transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving
                  ? "Saving..."
                  : saved
                  ? "Saved ✓"
                  : "Save Pages"}
              </button>

            </div>

          </div>

        </section>

        {/* IMPORTANT NOTE */}
        <section className="mt-8 rounded-[24px] border border-amber-400/10 bg-amber-400/[0.025] p-6">

          <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-amber-400/60">
            Important
          </p>

          <p className="mt-3 text-sm leading-6 text-white/35">
            This admin panel stores the About, Contact and FAQ
            content in your existing SiteSetting database. The
            actual storefront pages still need to read these
            settings for your changes to appear publicly.
          </p>

        </section>

      </div>
    </main>
  );
}