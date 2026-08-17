"use client";

import { useEffect, useState } from "react";

const DEFAULT_PAGES = [
  {
    id: "about",
    title: "About VÉRANE",
    slug: "about",
    description:
      "Discover the story, philosophy and identity behind VÉRANE.",
    status: "published",
    featured: true,
  },
  {
    id: "contact",
    title: "Contact",
    slug: "contact",
    description:
      "Get in touch with VÉRANE for enquiries, orders and collaborations.",
    status: "published",
    featured: false,
  },
  {
    id: "faq",
    title: "Frequently Asked Questions",
    slug: "faq",
    description:
      "Answers to common questions about products, orders, delivery and more.",
    status: "published",
    featured: false,
  },
  {
    id: "shipping",
    title: "Shipping & Delivery",
    slug: "shipping",
    description:
      "Everything customers need to know about delivery and fulfilment.",
    status: "draft",
    featured: false,
  },
];

export default function PagesManagement() {
  const [pages, setPages] = useState(DEFAULT_PAGES);
  const [selectedPage, setSelectedPage] = useState(null);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const [newTitle, setNewTitle] = useState("");
  const [newSlug, setNewSlug] = useState("");

  useEffect(() => {
    try {
      const stored = localStorage.getItem("verane_pages");

      if (stored) {
        const parsed = JSON.parse(stored);

        if (Array.isArray(parsed)) {
          setPages(parsed);
        }
      }
    } catch (error) {
      console.error("Pages loading error:", error);
    }
  }, []);

  function updatePage(id, key, value) {
    setPages((current) =>
      current.map((page) =>
        page.id === id
          ? {
              ...page,
              [key]: value,
            }
          : page
      )
    );

    setSaved(false);
    setError("");
  }

  function createPage() {
    const title = newTitle.trim();
    const slug = newSlug
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");

    if (!title || !slug) {
      setError("Enter a page title and URL slug.");
      return;
    }

    const slugExists = pages.some(
      (page) => page.slug === slug
    );

    if (slugExists) {
      setError("A page with this URL already exists.");
      return;
    }

    const newPage = {
      id: `page-${Date.now()}`,
      title,
      slug,
      description: "",
      status: "draft",
      featured: false,
    };

    setPages((current) => [...current, newPage]);

    setNewTitle("");
    setNewSlug("");
    setSelectedPage(newPage.id);
    setSaved(false);
    setError("");
  }

  function deletePage(id) {
    const page = pages.find((item) => item.id === id);

    if (!page) {
      return;
    }

    const confirmed = window.confirm(
      `Delete "${page.title}"? This cannot be undone.`
    );

    if (!confirmed) {
      return;
    }

    setPages((current) =>
      current.filter((item) => item.id !== id)
    );

    if (selectedPage === id) {
      setSelectedPage(null);
    }

    setSaved(false);
  }

  function savePages() {
    try {
      setSaving(true);
      setError("");

      localStorage.setItem(
        "verane_pages",
        JSON.stringify(pages)
      );

      setSaved(true);

      setTimeout(() => {
        setSaved(false);
      }, 3000);
    } catch (error) {
      console.error("Pages saving error:", error);
      setError("Unable to save page settings.");
    } finally {
      setSaving(false);
    }
  }

  const filteredPages = pages.filter((page) => {
    const query = search.toLowerCase();

    return (
      page.title.toLowerCase().includes(query) ||
      page.slug.toLowerCase().includes(query) ||
      page.description.toLowerCase().includes(query)
    );
  });

  const publishedCount = pages.filter(
    (page) => page.status === "published"
  ).length;

  const draftCount = pages.filter(
    (page) => page.status === "draft"
  ).length;

  return (
    <main className="min-h-screen bg-black px-5 pb-32 pt-10 text-white sm:px-8 lg:px-10">
      <div className="mx-auto max-w-6xl">

        {/* HEADER */}
        <header className="mb-10">
          <div className="flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">

            <div>
              <div className="mb-4 flex items-center gap-3">
                <span className="h-px w-9 bg-amber-400" />

                <span className="text-[10px] font-bold uppercase tracking-[0.32em] text-amber-400">
                  Content / Pages
                </span>
              </div>

              <h1 className="text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">
                Pages
              </h1>

              <p className="mt-3 max-w-xl text-sm leading-6 text-white/40 sm:text-base">
                Manage the informational pages that complete
                the VÉRANE experience.
              </p>
            </div>

            {/* STATS */}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">

              <Stat
                label="Total"
                value={pages.length}
              />

              <Stat
                label="Published"
                value={publishedCount}
              />

              <Stat
                label="Drafts"
                value={draftCount}
              />

            </div>

          </div>
        </header>

        {/* ERROR */}
        {error && (
          <div className="mb-6 flex items-center justify-between gap-4 rounded-2xl border border-red-400/20 bg-red-400/[0.06] px-5 py-4">
            <p className="text-sm text-red-300">
              {error}
            </p>

            <button
              onClick={() => setError("")}
              className="text-xs font-semibold text-white/40 transition hover:text-white"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* CREATE PAGE */}
        <section className="mb-6 overflow-hidden rounded-[28px] border border-white/[0.08] bg-white/[0.025]">

          <div className="border-b border-white/[0.07] px-6 py-6 sm:px-8">
            <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-amber-400/70">
              Create
            </p>

            <h2 className="mt-2 text-xl font-semibold">
              Create New Page
            </h2>

            <p className="mt-1 text-sm text-white/35">
              Create a new page for information, campaigns or
              brand storytelling.
            </p>
          </div>

          <div className="grid gap-4 p-6 md:grid-cols-[1fr_1fr_auto] md:items-end sm:p-8">

            <div>
              <label className="mb-2 block text-[9px] font-bold uppercase tracking-[0.2em] text-white/30">
                Page Title
              </label>

              <input
                value={newTitle}
                onChange={(e) =>
                  setNewTitle(e.target.value)
                }
                placeholder="Our Story"
                className="w-full rounded-xl border border-white/[0.08] bg-black/40 px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-white/20 focus:border-amber-400/40"
              />
            </div>

            <div>
              <label className="mb-2 block text-[9px] font-bold uppercase tracking-[0.2em] text-white/30">
                URL Slug
              </label>

              <div className="flex overflow-hidden rounded-xl border border-white/[0.08] bg-black/40 focus-within:border-amber-400/40">
                <span className="flex items-center border-r border-white/[0.06] px-3 text-sm text-white/20">
                  /
                </span>

                <input
                  value={newSlug}
                  onChange={(e) =>
                    setNewSlug(e.target.value)
                  }
                  placeholder="our-story"
                  className="min-w-0 flex-1 bg-transparent px-3 py-3.5 text-sm text-white outline-none placeholder:text-white/20"
                />
              </div>
            </div>

            <button
              onClick={createPage}
              className="rounded-xl bg-white px-6 py-3.5 text-xs font-bold text-black transition hover:bg-white/80"
            >
              Create Page
            </button>

          </div>
        </section>

        {/* PAGE MANAGEMENT */}
        <div className="grid gap-6 lg:grid-cols-[360px_1fr]">

          {/* LIST */}
          <section className="overflow-hidden rounded-[28px] border border-white/[0.08] bg-white/[0.025]">

            <div className="border-b border-white/[0.07] p-5">

              <div className="mb-4">
                <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-amber-400/70">
                  Library
                </p>

                <h2 className="mt-2 text-lg font-semibold">
                  All Pages
                </h2>
              </div>

              <div className="relative">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/20">
                  ⌕
                </span>

                <input
                  value={search}
                  onChange={(e) =>
                    setSearch(e.target.value)
                  }
                  placeholder="Search pages..."
                  className="w-full rounded-xl border border-white/[0.08] bg-black/40 py-3 pl-10 pr-4 text-xs text-white outline-none transition placeholder:text-white/20 focus:border-amber-400/40"
                />
              </div>

            </div>

            <div className="max-h-[620px] overflow-y-auto">

              {filteredPages.length === 0 ? (
                <div className="px-6 py-12 text-center">
                  <p className="text-sm text-white/30">
                    No pages found.
                  </p>
                </div>
              ) : (
                filteredPages.map((page) => (
                  <button
                    key={page.id}
                    onClick={() =>
                      setSelectedPage(page.id)
                    }
                    className={`w-full border-b border-white/[0.06] p-5 text-left transition ${
                      selectedPage === page.id
                        ? "bg-amber-400/[0.06]"
                        : "hover:bg-white/[0.025]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-semibold">
                            {page.title}
                          </p>

                          {page.featured && (
                            <span className="text-[9px] text-amber-400">
                              ★
                            </span>
                          )}
                        </div>

                        <p className="mt-1 truncate text-xs text-white/25">
                          /{page.slug}
                        </p>
                      </div>

                      <span
                        className={`mt-0.5 shrink-0 rounded-full px-2.5 py-1 text-[8px] font-bold uppercase tracking-[0.15em] ${
                          page.status === "published"
                            ? "bg-emerald-400/[0.08] text-emerald-300"
                            : "bg-white/[0.05] text-white/30"
                        }`}
                      >
                        {page.status}
                      </span>

                    </div>
                  </button>
                ))
              )}

            </div>
          </section>

          {/* EDITOR */}
          <section className="overflow-hidden rounded-[28px] border border-white/[0.08] bg-white/[0.025]">

            {!selectedPage ? (
              <div className="flex min-h-[500px] items-center justify-center p-10 text-center">

                <div className="max-w-sm">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.025] text-xl">
                    ✦
                  </div>

                  <h2 className="mt-5 text-lg font-semibold">
                    Select a page
                  </h2>

                  <p className="mt-2 text-sm leading-6 text-white/30">
                    Choose a page from the library to edit its
                    content and settings.
                  </p>
                </div>

              </div>
            ) : (
              <PageEditor
                page={pages.find(
                  (item) => item.id === selectedPage
                )}
                onChange={updatePage}
                onDelete={deletePage}
              />
            )}

          </section>

        </div>

        {/* SAVE BAR */}
        <div className="sticky bottom-4 z-20 mt-8">
          <div className="flex flex-col gap-4 rounded-[24px] border border-white/[0.08] bg-black/80 p-4 shadow-2xl shadow-black/50 backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between sm:p-5">

            <div>
              <p className="text-sm font-semibold">
                {saved
                  ? "Pages saved"
                  : "Page configuration"}
              </p>

              <p className="mt-1 text-xs text-white/30">
                {saved
                  ? "Your page settings have been saved."
                  : "Save your page changes when you're finished."}
              </p>
            </div>

            <button
              onClick={savePages}
              disabled={saving}
              className="rounded-full bg-amber-400 px-7 py-3.5 text-sm font-bold text-black transition hover:bg-amber-300 hover:shadow-[0_0_30px_rgba(245,185,66,0.15)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving
                ? "Saving..."
                : saved
                  ? "Saved ✓"
                  : "Save Pages"}
            </button>

          </div>
        </div>

      </div>
    </main>
  );
}

function PageEditor({
  page,
  onChange,
  onDelete,
}) {
  if (!page) {
    return null;
  }

  return (
    <div>

      <div className="border-b border-white/[0.07] px-6 py-6 sm:px-8">

        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">

          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-amber-400/70">
              Page Editor
            </p>

            <h2 className="mt-2 text-xl font-semibold">
              {page.title}
            </h2>

            <p className="mt-1 text-xs text-white/30">
              /{page.slug}
            </p>
          </div>

          <button
            onClick={() => onDelete(page.id)}
            className="self-start rounded-xl border border-red-400/10 bg-red-400/[0.03] px-4 py-2.5 text-[9px] font-bold uppercase tracking-[0.15em] text-red-300/70 transition hover:border-red-400/20 hover:bg-red-400/[0.06] hover:text-red-300"
          >
            Delete Page
          </button>

        </div>

      </div>

      <div className="space-y-7 p-6 sm:p-8">

        {/* TITLE */}
        <div>
          <label className="text-sm font-semibold">
            Page Title
          </label>

          <input
            value={page.title}
            onChange={(e) =>
              onChange(
                page.id,
                "title",
                e.target.value
              )
            }
            className="mt-3 w-full rounded-2xl border border-white/[0.08] bg-black/40 px-4 py-3.5 text-sm text-white outline-none transition focus:border-amber-400/40"
          />
        </div>

        {/* SLUG */}
        <div>
          <label className="text-sm font-semibold">
            URL
          </label>

          <div className="mt-3 flex overflow-hidden rounded-2xl border border-white/[0.08] bg-black/40 focus-within:border-amber-400/40">
            <span className="flex items-center border-r border-white/[0.06] px-4 text-sm text-white/20">
              /
            </span>

            <input
              value={page.slug}
              onChange={(e) =>
                onChange(
                  page.id,
                  "slug",
                  e.target.value
                    .toLowerCase()
                    .replace(/\s+/g, "-")
                    .replace(/[^a-z0-9-]/g, "")
                )
              }
              className="min-w-0 flex-1 bg-transparent px-4 py-3.5 text-sm text-white outline-none"
            />
          </div>
        </div>

        {/* DESCRIPTION */}
        <div>
          <label className="text-sm font-semibold">
            Page Description
          </label>

          <p className="mt-1 text-xs text-white/30">
            A short description used to identify the purpose
            of this page inside the admin.
          </p>

          <textarea
            value={page.description}
            onChange={(e) =>
              onChange(
                page.id,
                "description",
                e.target.value
              )
            }
            rows={5}
            className="mt-3 w-full resize-none rounded-2xl border border-white/[0.08] bg-black/40 px-4 py-3.5 text-sm leading-6 text-white outline-none transition focus:border-amber-400/40"
          />
        </div>

        {/* STATUS */}
        <div>
          <label className="text-sm font-semibold">
            Publication Status
          </label>

          <div className="mt-3 grid grid-cols-2 gap-3">

            <button
              onClick={() =>
                onChange(
                  page.id,
                  "status",
                  "published"
                )
              }
              className={`rounded-2xl border px-4 py-4 text-left transition ${
                page.status === "published"
                  ? "border-emerald-400/20 bg-emerald-400/[0.06]"
                  : "border-white/[0.08] bg-black/20"
              }`}
            >
              <p
                className={`text-sm font-semibold ${
                  page.status === "published"
                    ? "text-emerald-300"
                    : "text-white"
                }`}
              >
                Published
              </p>

              <p className="mt-1 text-[10px] text-white/30">
                Visible to customers
              </p>
            </button>

            <button
              onClick={() =>
                onChange(
                  page.id,
                  "status",
                  "draft"
                )
              }
              className={`rounded-2xl border px-4 py-4 text-left transition ${
                page.status === "draft"
                  ? "border-amber-400/20 bg-amber-400/[0.06]"
                  : "border-white/[0.08] bg-black/20"
              }`}
            >
              <p
                className={`text-sm font-semibold ${
                  page.status === "draft"
                    ? "text-amber-300"
                    : "text-white"
                }`}
              >
                Draft
              </p>

              <p className="mt-1 text-[10px] text-white/30">
                Keep hidden for now
              </p>
            </button>

          </div>
        </div>

        {/* FEATURED */}
        <div className="flex items-center justify-between gap-5 rounded-2xl border border-white/[0.07] bg-black/30 p-4">

          <div>
            <p className="text-sm font-semibold">
              Feature this page
            </p>

            <p className="mt-1 text-xs text-white/30">
              Mark this page as important for future
              navigation or promotional areas.
            </p>
          </div>

          <button
            onClick={() =>
              onChange(
                page.id,
                "featured",
                !page.featured
              )
            }
            className={`relative h-7 w-12 shrink-0 rounded-full transition ${
              page.featured
                ? "bg-amber-400"
                : "bg-white/10"
            }`}
          >
            <span
              className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${
                page.featured
                  ? "left-6"
                  : "left-1"
              }`}
            />
          </button>

        </div>

        {/* CONTENT PLACEHOLDER */}
        <div className="rounded-2xl border border-dashed border-white/[0.08] bg-white/[0.015] p-5">

          <div className="flex gap-4">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-amber-400/10 bg-amber-400/[0.04] text-sm text-amber-400">
              ✦
            </div>

            <div>
              <p className="text-sm font-semibold">
                Full page builder comes next
              </p>

              <p className="mt-1 text-xs leading-5 text-white/30">
                This is where we'll eventually give you full
                control over the actual page content — sections,
                text, images, buttons, layouts and premium
                editorial blocks.
              </p>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] px-4 py-3 text-center">
      <p className="text-lg font-semibold">
        {value}
      </p>

      <p className="mt-1 text-[8px] font-bold uppercase tracking-[0.2em] text-white/25">
        {label}
      </p>
    </div>
  );
}