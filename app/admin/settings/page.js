"use client";

import { useEffect, useState } from "react";

type Settings = {
  siteName: string;
  tagline: string;
  logo: string;
  favicon: string;
  primaryColor: string;
  email: string;
  phone: string;
  whatsapp: string;
  instagram: string;
  facebook: string;
  tiktok: string;
  announcementEnabled: string;
  announcementText: string;
};

const DEFAULT_SETTINGS: Settings = {
  siteName: "",
  tagline: "",
  logo: "",
  favicon: "",
  primaryColor: "#f5b942",
  email: "",
  phone: "",
  whatsapp: "",
  instagram: "",
  facebook: "",
  tiktok: "",
  announcementEnabled: "false",
  announcementText: "",
};

function Field({
  label,
  description,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  description?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div className="space-y-2">
      <div>
        <label className="text-sm font-semibold text-white">{label}</label>
        {description && (
          <p className="mt-1 text-xs text-white/35">{description}</p>
        )}
      </div>

      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-white/[0.08] bg-white/[0.035] px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-white/20 hover:border-white/[0.14] focus:border-amber-400/50 focus:bg-white/[0.05] focus:ring-4 focus:ring-amber-400/[0.06]"
      />
    </div>
  );
}

function Section({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-[28px] border border-white/[0.08] bg-white/[0.025] shadow-2xl shadow-black/20">
      <div className="border-b border-white/[0.07] px-6 py-6 sm:px-8">
        <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.28em] text-amber-400/80">
          {eyebrow}
        </p>

        <h2 className="text-xl font-semibold tracking-tight text-white">
          {title}
        </h2>

        <p className="mt-1.5 max-w-xl text-sm leading-6 text-white/40">
          {description}
        </p>
      </div>

      <div className="space-y-6 px-6 py-7 sm:px-8">{children}</div>
    </section>
  );
}

export default function SettingsPage() {
  const [settings, setSettings] =
    useState<Settings>(DEFAULT_SETTINGS);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    const loadSettings = async () => {
      try {
        const response = await fetch("/api/admin/settings", {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Failed to load settings");
        }

        const data = await response.json();

        if (mounted) {
          setSettings({
            ...DEFAULT_SETTINGS,
            ...data,
          });
        }
      } catch (err) {
        console.error(err);

        if (mounted) {
          setError("Unable to load your site settings.");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadSettings();

    return () => {
      mounted = false;
    };
  }, []);

  const updateSetting = (key: keyof Settings, value: string) => {
    setSettings((current) => ({
      ...current,
      [key]: value,
    }));

    setSaved(false);
    setError("");
  };

  const save = async () => {
    setSaving(true);
    setSaved(false);
    setError("");

    try {
      const response = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(settings),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to save settings");
      }

      if (data.settings) {
        setSettings({
          ...DEFAULT_SETTINGS,
          ...data.settings,
        });
      }

      setSaved(true);

      window.setTimeout(() => {
        setSaved(false);
      }, 3000);
    } catch (err) {
      console.error(err);
      setError("Your settings could not be saved. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] bg-black px-5 py-12 text-white">
        <div className="mx-auto max-w-5xl animate-pulse">
          <div className="mb-10">
            <div className="h-3 w-24 rounded-full bg-white/10" />
            <div className="mt-4 h-10 w-72 rounded-xl bg-white/10" />
            <div className="mt-3 h-4 w-96 max-w-full rounded-full bg-white/5" />
          </div>

          <div className="space-y-6">
            <div className="h-80 rounded-[28px] bg-white/[0.04]" />
            <div className="h-96 rounded-[28px] bg-white/[0.04]" />
            <div className="h-72 rounded-[28px] bg-white/[0.04]" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black px-4 pb-32 pt-8 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <header className="mb-10">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="mb-4 flex items-center gap-3">
                <span className="h-px w-8 bg-amber-400/70" />
                <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-amber-400">
                  Control Center
                </span>
              </div>

              <h1 className="text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">
                Site Settings
              </h1>

              <p className="mt-3 max-w-xl text-sm leading-6 text-white/40 sm:text-base">
                Control the identity, communication and visual presence of
                your entire storefront from one place.
              </p>
            </div>

            <div className="hidden rounded-full border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/40 sm:block">
              Global Configuration
            </div>
          </div>
        </header>

        {/* Error */}
        {error && (
          <div className="mb-6 flex items-center justify-between gap-4 rounded-2xl border border-red-400/20 bg-red-400/[0.06] px-5 py-4">
            <p className="text-sm text-red-300">{error}</p>

            <button
              onClick={() => setError("")}
              className="text-xs font-semibold text-white/50 transition hover:text-white"
            >
              Dismiss
            </button>
          </div>
        )}

        <div className="space-y-6">
          {/* Brand Identity */}
          <Section
            eyebrow="01 / Identity"
            title="Brand Identity"
            description="Define how your brand appears throughout the storefront."
          >
            <div className="grid gap-6 md:grid-cols-2">
              <Field
                label="Site Name"
                description="The main name displayed across your website."
                value={settings.siteName}
                onChange={(value) => updateSetting("siteName", value)}
                placeholder="VÉRANE"
              />

              <Field
                label="Tagline"
                description="Your short brand statement."
                value={settings.tagline}
                onChange={(value) => updateSetting("tagline", value)}
                placeholder="Two Brands. One Expression."
              />
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <Field
                label="Logo"
                description="Enter the URL of your primary logo."
                value={settings.logo}
                onChange={(value) => updateSetting("logo", value)}
                placeholder="https://..."
              />

              <Field
                label="Favicon"
                description="Small icon shown in browser tabs."
                value={settings.favicon}
                onChange={(value) => updateSetting("favicon", value)}
                placeholder="https://..."
              />
            </div>

            <div>
              <div className="mb-3">
                <label className="text-sm font-semibold text-white">
                  Primary Brand Color
                </label>
                <p className="mt-1 text-xs text-white/35">
                  Accent color used throughout your storefront and admin.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={settings.primaryColor || "#f5b942"}
                  onChange={(e) =>
                    updateSetting("primaryColor", e.target.value)
                  }
                  className="h-12 w-16 cursor-pointer rounded-xl border border-white/10 bg-transparent p-1"
                />

                <input
                  value={settings.primaryColor || ""}
                  onChange={(e) =>
                    updateSetting("primaryColor", e.target.value)
                  }
                  placeholder="#f5b942"
                  className="w-full max-w-xs rounded-2xl border border-white/[0.08] bg-white/[0.035] px-4 py-3.5 text-sm uppercase text-white outline-none transition placeholder:text-white/20 focus:border-amber-400/50 focus:ring-4 focus:ring-amber-400/[0.06]"
                />

                <div
                  className="hidden h-12 w-12 rounded-xl border border-white/10 sm:block"
                  style={{
                    backgroundColor:
                      settings.primaryColor || "#f5b942",
                  }}
                />
              </div>
            </div>
          </Section>

          {/* Contact */}
          <Section
            eyebrow="02 / Contact"
            title="Contact Information"
            description="Manage the contact details customers see when they need to reach your brand."
          >
            <div className="grid gap-6 md:grid-cols-2">
              <Field
                label="Email Address"
                type="email"
                value={settings.email}
                onChange={(value) => updateSetting("email", value)}
                placeholder="hello@yourbrand.com"
              />

              <Field
                label="Phone Number"
                value={settings.phone}
                onChange={(value) => updateSetting("phone", value)}
                placeholder="+234..."
              />

              <Field
                label="WhatsApp"
                value={settings.whatsapp}
                onChange={(value) => updateSetting("whatsapp", value)}
                placeholder="+234..."
              />
            </div>
          </Section>

          {/* Social */}
          <Section
            eyebrow="03 / Social"
            title="Social Presence"
            description="Connect your social platforms so customers can move seamlessly between your storefront and community."
          >
            <Field
              label="Instagram"
              value={settings.instagram}
              onChange={(value) => updateSetting("instagram", value)}
              placeholder="https://instagram.com/..."
            />

            <Field
              label="Facebook"
              value={settings.facebook}
              onChange={(value) => updateSetting("facebook", value)}
              placeholder="https://facebook.com/..."
            />

            <Field
              label="TikTok"
              value={settings.tiktok}
              onChange={(value) => updateSetting("tiktok", value)}
              placeholder="https://tiktok.com/@..."
            />
          </Section>

          {/* Announcement */}
          <Section
            eyebrow="04 / Storefront"
            title="Announcement Bar"
            description="Create a message that appears across the storefront for promotions, launches or important updates."
          >
            <div>
              <label className="text-sm font-semibold text-white">
                Status
              </label>

              <select
                value={settings.announcementEnabled}
                onChange={(e) =>
                  updateSetting(
                    "announcementEnabled",
                    e.target.value
                  )
                }
                className="mt-2 w-full rounded-2xl border border-white/[0.08] bg-white/[0.035] px-4 py-3.5 text-sm text-white outline-none transition focus:border-amber-400/50 focus:ring-4 focus:ring-amber-400/[0.06]"
              >
                <option value="false" className="bg-neutral-950">
                  Disabled
                </option>
                <option value="true" className="bg-neutral-950">
                  Enabled
                </option>
              </select>
            </div>

            <div>
              <label className="text-sm font-semibold text-white">
                Announcement Message
              </label>

              <textarea
                value={settings.announcementText}
                onChange={(e) =>
                  updateSetting(
                    "announcementText",
                    e.target.value
                  )
                }
                rows={3}
                placeholder="Free delivery on orders over..."
                className="mt-2 w-full resize-none rounded-2xl border border-white/[0.08] bg-white/[0.035] px-4 py-3.5 text-sm leading-6 text-white outline-none transition placeholder:text-white/20 hover:border-white/[0.14] focus:border-amber-400/50 focus:bg-white/[0.05] focus:ring-4 focus:ring-amber-400/[0.06]"
              />
            </div>

            {settings.announcementEnabled === "true" &&
              settings.announcementText && (
                <div className="rounded-2xl border border-amber-400/20 bg-amber-400/[0.04] p-4">
                  <p className="mb-2 text-[9px] font-bold uppercase tracking-[0.25em] text-amber-400/70">
                    Live Preview
                  </p>

                  <p className="text-sm text-white/80">
                    {settings.announcementText}
                  </p>
                </div>
              )}
          </Section>
        </div>

        {/* Save bar */}
        <div className="sticky bottom-4 z-20 mt-8">
          <div className="flex flex-col gap-4 rounded-[24px] border border-white/[0.08] bg-black/80 p-4 shadow-2xl shadow-black/50 backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <div>
              <p className="text-sm font-semibold text-white">
                {saved ? "Changes saved" : "Unsaved changes"}
              </p>

              <p className="mt-1 text-xs text-white/35">
                {saved
                  ? "Your storefront settings are now up to date."
                  : "Save your changes when you're ready."}
              </p>
            </div>

            <button
              onClick={save}
              disabled={saving}
              className="group relative overflow-hidden rounded-full bg-amber-400 px-7 py-3.5 text-sm font-bold text-black transition hover:bg-amber-300 hover:shadow-[0_0_35px_rgba(245,185,66,0.15)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span className="relative z-10">
                {saving
                  ? "Saving..."
                  : saved
                    ? "Saved ✓"
                    : "Save Changes"}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}