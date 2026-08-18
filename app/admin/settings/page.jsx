"use client";

import { useEffect, useMemo, useState } from "react";

const DEFAULT_SETTINGS = {
  siteName: "VÉRANE",
  tagline: "",
  primaryColor: "#f5b942",
  backgroundColor: "#070707",
  email: "",
  phone: "",
  whatsapp: "",
  instagram: "",
  facebook: "",
  tiktok: "",
  announcementEnabled: "false",
  announcementText: "",
};

export default function SettingsPage() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [originalSettings, setOriginalSettings] = useState(DEFAULT_SETTINGS);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [activeSection, setActiveSection] = useState("branding");

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/admin/settings");

      if (!response.ok) {
        throw new Error("Failed to load settings");
      }

      const data = await response.json();

      const merged = {
        ...DEFAULT_SETTINGS,
        ...(data || {}),
      };

      setSettings(merged);
      setOriginalSettings(merged);
    } catch (err) {
      console.error(err);
      setError("Unable to load site settings.");
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = (key, value) => {
    setSettings((prev) => ({
      ...prev,
      [key]: value,
    }));

    setSaved(false);
    setError("");
  };

  const save = async () => {
    try {
      setSaving(true);
      setSaved(false);
      setError("");

      const response = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(settings),
      });

      if (!response.ok) {
        throw new Error("Failed to save settings");
      }

      setOriginalSettings(settings);
      setSaved(true);

      setTimeout(() => {
        setSaved(false);
      }, 3000);
    } catch (err) {
      console.error(err);
      setError("Could not save your settings. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const resetChanges = () => {
    setSettings(originalSettings);
    setSaved(false);
    setError("");
  };

  const resetDefaults = () => {
    const confirmed = window.confirm(
      "Reset all settings on this page to the VÉRANE defaults?"
    );

    if (!confirmed) return;

    setSettings(DEFAULT_SETTINGS);
    setSaved(false);
    setError("");
  };

  const hasChanges = useMemo(() => {
    return JSON.stringify(settings) !== JSON.stringify(originalSettings);
  }, [settings, originalSettings]);

  if (loading) {
    return (
      <main className="min-h-screen bg-black text-white">
        <div className="max-w-6xl mx-auto px-5 py-20">
          <div className="animate-pulse">
            <div className="h-10 w-64 bg-white/5 rounded-xl mb-3" />
            <div className="h-4 w-96 max-w-full bg-white/5 rounded mb-12" />

            <div className="grid lg:grid-cols-[220px_1fr] gap-8">
              <div className="h-64 bg-white/[0.03] rounded-2xl" />
              <div className="h-[600px] bg-white/[0.03] rounded-2xl" />
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="max-w-6xl mx-auto px-5 sm:px-8 py-10 sm:py-14">

        {/* HEADER */}
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mb-10">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <span
                className="w-2 h-2 rounded-full"
                style={{
                  backgroundColor:
                    settings.primaryColor || "#f5b942",
                }}
              />

              <span className="text-[11px] uppercase tracking-[0.3em] text-neutral-500 font-semibold">
                VÉRANE / CONTROL CENTER
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl font-black tracking-tight">
              Site Settings
            </h1>

            <p className="text-neutral-500 mt-3 max-w-xl">
              Control your storefront identity, colors, contact information,
              social presence and global announcements.
            </p>
          </div>

          <div className="flex gap-3">
            {hasChanges && (
              <button
                type="button"
                onClick={resetChanges}
                className="px-5 py-3 rounded-full border border-white/10 text-sm font-bold text-neutral-400 hover:text-white hover:bg-white/5 transition"
              >
                Discard
              </button>
            )}

            <button
              type="button"
              onClick={save}
              disabled={saving || !hasChanges}
              className="px-6 py-3 rounded-full bg-amber-500 text-black text-sm font-black hover:bg-amber-400 transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {saving
                ? "Saving..."
                : saved
                ? "Saved ✓"
                : "Save Changes"}
            </button>
          </div>
        </div>

        {/* ERROR */}
        {error && (
          <div className="mb-8 border border-red-500/20 bg-red-500/[0.05] rounded-2xl px-5 py-4 flex items-center justify-between gap-4">
            <p className="text-sm text-red-300">
              {error}
            </p>

            <button
              type="button"
              onClick={() => setError("")}
              className="text-red-400 hover:text-white"
            >
              ×
            </button>
          </div>
        )}

        {/* SAVED MESSAGE */}
        {saved && (
          <div className="mb-8 border border-emerald-500/20 bg-emerald-500/[0.05] rounded-2xl px-5 py-4">
            <p className="text-sm text-emerald-300">
              Your VÉRANE settings have been saved successfully.
            </p>
          </div>
        )}

        <div className="grid lg:grid-cols-[220px_1fr] gap-8">

          {/* SIDEBAR */}
          <aside className="lg:sticky lg:top-8 lg:self-start">
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-2">

              <SettingsTab
                active={activeSection === "branding"}
                onClick={() => setActiveSection("branding")}
                title="Branding"
                description="Identity & colors"
              />

              <SettingsTab
                active={activeSection === "contact"}
                onClick={() => setActiveSection("contact")}
                title="Contact"
                description="Customer details"
              />

              <SettingsTab
                active={activeSection === "social"}
                onClick={() => setActiveSection("social")}
                title="Social"
                description="Social platforms"
              />

              <SettingsTab
                active={activeSection === "announcement"}
                onClick={() => setActiveSection("announcement")}
                title="Announcement"
                description="Storefront banner"
              />

              <SettingsTab
                active={activeSection === "preview"}
                onClick={() => setActiveSection("preview")}
                title="Preview"
                description="Live appearance"
              />
            </div>

            <button
              type="button"
              onClick={resetDefaults}
              className="w-full mt-3 px-4 py-3 rounded-2xl border border-white/10 text-xs font-bold text-neutral-600 hover:text-red-400 hover:border-red-500/20 transition"
            >
              Reset to Defaults
            </button>
          </aside>

          {/* CONTENT */}
          <section>

            {/* BRANDING */}
            {activeSection === "branding" && (
              <div className="space-y-6">

                <SectionHeader
                  eyebrow="IDENTITY"
                  title="Branding"
                  description="Define how your brand appears across the storefront."
                  color={settings.primaryColor}
                />

                <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-6 sm:p-8 space-y-7">

                  <Field
                    label="Site Name"
                    description="The main name displayed throughout your website."
                  >
                    <input
                      value={settings.siteName || ""}
                      onChange={(e) =>
                        updateSetting("siteName", e.target.value)
                      }
                      placeholder="VÉRANE"
                      className={inputClass}
                    />
                  </Field>

                  <Field
                    label="Tagline"
                    description="A short statement that represents the brand."
                  >
                    <input
                      value={settings.tagline || ""}
                      onChange={(e) =>
                        updateSetting("tagline", e.target.value)
                      }
                      placeholder="Luxury without compromise."
                      className={inputClass}
                    />
                  </Field>

                  <div className="grid sm:grid-cols-2 gap-5">

                    {/* PRIMARY COLOR */}
                    <ColorField
                      label="Primary Color"
                      description="Accents, buttons and highlights."
                      value={settings.primaryColor || "#f5b942"}
                      defaultValue="#f5b942"
                      onChange={(value) =>
                        updateSetting("primaryColor", value)
                      }
                    />

                    {/* BACKGROUND COLOR */}
                    <ColorField
                      label="Background Color"
                      description="Main storefront background."
                      value={settings.backgroundColor || "#070707"}
                      defaultValue="#070707"
                      onChange={(value) =>
                        updateSetting("backgroundColor", value)
                      }
                    />

                  </div>
                </div>
              </div>
            )}

            {/* CONTACT */}
            {activeSection === "contact" && (
              <div className="space-y-6">

                <SectionHeader
                  eyebrow="CUSTOMER ACCESS"
                  title="Contact Information"
                  description="Where customers can reach your business."
                  color={settings.primaryColor}
                />

                <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-6 sm:p-8 space-y-7">

                  <Field
                    label="Email Address"
                    description="Primary customer support email."
                  >
                    <input
                      type="email"
                      value={settings.email || ""}
                      onChange={(e) =>
                        updateSetting("email", e.target.value)
                      }
                      placeholder="hello@example.com"
                      className={inputClass}
                    />
                  </Field>

                  <Field
                    label="Phone Number"
                    description="Your main business phone number."
                  >
                    <input
                      type="tel"
                      value={settings.phone || ""}
                      onChange={(e) =>
                        updateSetting("phone", e.target.value)
                      }
                      placeholder="+234..."
                      className={inputClass}
                    />
                  </Field>

                  <Field
                    label="WhatsApp"
                    description="WhatsApp number customers can use to contact you."
                  >
                    <input
                      type="tel"
                      value={settings.whatsapp || ""}
                      onChange={(e) =>
                        updateSetting("whatsapp", e.target.value)
                      }
                      placeholder="+234..."
                      className={inputClass}
                    />
                  </Field>

                </div>
              </div>
            )}

            {/* SOCIAL */}
            {activeSection === "social" && (
              <div className="space-y-6">

                <SectionHeader
                  eyebrow="SOCIAL PRESENCE"
                  title="Social Media"
                  description="Connect your storefront to your social platforms."
                  color={settings.primaryColor}
                />

                <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-6 sm:p-8 space-y-7">

                  <SocialField
                    label="Instagram"
                    value={settings.instagram}
                    placeholder="https://instagram.com/..."
                    onChange={(value) =>
                      updateSetting("instagram", value)
                    }
                  />

                  <SocialField
                    label="Facebook"
                    value={settings.facebook}
                    placeholder="https://facebook.com/..."
                    onChange={(value) =>
                      updateSetting("facebook", value)
                    }
                  />

                  <SocialField
                    label="TikTok"
                    value={settings.tiktok}
                    placeholder="https://tiktok.com/@..."
                    onChange={(value) =>
                      updateSetting("tiktok", value)
                    }
                  />

                </div>
              </div>
            )}

            {/* ANNOUNCEMENT */}
            {activeSection === "announcement" && (
              <div className="space-y-6">

                <SectionHeader
                  eyebrow="STOREFRONT MESSAGE"
                  title="Announcement Bar"
                  description="Display a global announcement at the top of your storefront."
                  color={settings.primaryColor}
                />

                <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-6 sm:p-8 space-y-7">

                  <Field
                    label="Status"
                    description="Choose whether the announcement should be visible."
                  >
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() =>
                          updateSetting("announcementEnabled", "false")
                        }
                        className={`rounded-2xl border px-5 py-4 text-left transition ${
                          settings.announcementEnabled !== "true"
                            ? "border-white/20 bg-white/[0.06]"
                            : "border-white/10 bg-white/[0.02]"
                        }`}
                      >
                        <span className="block text-sm font-bold">
                          Disabled
                        </span>

                        <span className="block text-xs text-neutral-600 mt-1">
                          Hide announcement
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          updateSetting("announcementEnabled", "true")
                        }
                        className={`rounded-2xl border px-5 py-4 text-left transition ${
                          settings.announcementEnabled === "true"
                            ? "border-amber-400/40 bg-amber-400/[0.06]"
                            : "border-white/10 bg-white/[0.02]"
                        }`}
                      >
                        <span className="block text-sm font-bold">
                          Enabled
                        </span>

                        <span className="block text-xs text-neutral-600 mt-1">
                          Show announcement
                        </span>
                      </button>
                    </div>
                  </Field>

                  <Field
                    label="Announcement Text"
                    description="The message customers will see."
                  >
                    <textarea
                      value={settings.announcementText || ""}
                      onChange={(e) =>
                        updateSetting(
                          "announcementText",
                          e.target.value
                        )
                      }
                      placeholder="Free delivery on orders over ₦100,000."
                      rows={4}
                      maxLength={180}
                      className={`${inputClass} resize-none`}
                    />

                    <div className="text-right text-[10px] text-neutral-700 mt-2">
                      {(settings.announcementText || "").length}/180
                    </div>
                  </Field>

                  {settings.announcementEnabled === "true" &&
                    settings.announcementText && (
                      <div
                        className="rounded-xl px-5 py-3 text-center text-xs font-semibold"
                        style={{
                          backgroundColor:
                            settings.primaryColor || "#f5b942",
                          color: "#000",
                        }}
                      >
                        {settings.announcementText}
                      </div>
                    )}

                </div>
              </div>
            )}

            {/* PREVIEW */}
            {activeSection === "preview" && (
              <div className="space-y-6">

                <SectionHeader
                  eyebrow="LIVE PREVIEW"
                  title="Storefront Preview"
                  description="See how your current branding settings will feel on the storefront."
                  color={settings.primaryColor}
                />

                <div
                  className="rounded-3xl overflow-hidden border border-white/10 min-h-[600px]"
                  style={{
                    backgroundColor:
                      settings.backgroundColor || "#070707",
                  }}
                >

                  {/* PREVIEW NAV */}
                  <div className="border-b border-white/10 px-6 py-5 flex items-center justify-between">
                    <div
                      className="font-black text-xl tracking-tight"
                      style={{
                        color:
                          settings.primaryColor || "#f5b942",
                      }}
                    >
                      {settings.siteName || "VÉRANE"}
                    </div>

                    <div className="hidden sm:flex gap-5 text-[10px] uppercase tracking-widest text-neutral-500">
                      <span>Shop</span>
                      <span>Collections</span>
                      <span>About</span>
                    </div>

                    <div className="w-9 h-9 rounded-full border border-white/10" />
                  </div>

                  {/* ANNOUNCEMENT */}
                  {settings.announcementEnabled === "true" &&
                    settings.announcementText && (
                      <div
                        className="px-5 py-3 text-center text-xs font-bold"
                        style={{
                          backgroundColor:
                            settings.primaryColor || "#f5b942",
                          color: "#000",
                        }}
                      >
                        {settings.announcementText}
                      </div>
                    )}

                  {/* HERO */}
                  <div className="px-6 sm:px-12 py-20 sm:py-28 text-center">

                    <div className="text-[10px] uppercase tracking-[0.4em] text-neutral-600 mb-5">
                      ESTABLISHED / VÉRANE
                    </div>

                    <h2 className="text-5xl sm:text-7xl font-black tracking-tight">
                      {settings.siteName || "VÉRANE"}
                    </h2>

                    <p className="text-neutral-500 max-w-lg mx-auto mt-5">
                      {settings.tagline ||
                        "A premium expression of modern luxury."}
                    </p>

                    <button
                      type="button"
                      className="mt-8 px-7 py-4 rounded-full text-xs font-black uppercase tracking-widest"
                      style={{
                        backgroundColor:
                          settings.primaryColor || "#f5b942",
                        color: "#000",
                      }}
                    >
                      Explore Collection
                    </button>

                  </div>

                  {/* CONTACT PREVIEW */}
                  <div className="border-t border-white/10 px-6 sm:px-12 py-8 grid sm:grid-cols-3 gap-6 text-center">
                    <PreviewContact
                      label="Email"
                      value={settings.email || "Not configured"}
                    />

                    <PreviewContact
                      label="Phone"
                      value={settings.phone || "Not configured"}
                    />

                    <PreviewContact
                      label="WhatsApp"
                      value={settings.whatsapp || "Not configured"}
                    />
                  </div>
                </div>
              </div>
            )}

          </section>
        </div>
      </div>
    </main>
  );
}

/* =========================================================
   COMPONENTS
========================================================= */

function SettingsTab({
  active,
  onClick,
  title,
  description,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left rounded-xl px-4 py-3.5 transition ${
        active
          ? "bg-white/[0.07] text-white"
          : "text-neutral-500 hover:text-white hover:bg-white/[0.03]"
      }`}
    >
      <span className="block text-sm font-bold">
        {title}
      </span>

      <span className="block text-[10px] text-neutral-600 mt-1">
        {description}
      </span>
    </button>
  );
}

function SectionHeader({
  eyebrow,
  title,
  description,
  color,
}) {
  return (
    <div>
      <div
        className="text-[10px] uppercase tracking-[0.3em] font-bold mb-3"
        style={{
          color: color || "#f5b942",
        }}
      >
        {eyebrow}
      </div>

      <h2 className="text-2xl sm:text-3xl font-black">
        {title}
      </h2>

      <p className="text-sm text-neutral-600 mt-2">
        {description}
      </p>
    </div>
  );
}

function Field({
  label,
  description,
  children,
}) {
  return (
    <div>
      <label className="block text-sm font-bold text-white mb-1.5">
        {label}
      </label>

      {description && (
        <p className="text-xs text-neutral-600 mb-3">
          {description}
        </p>
      )}

      {children}
    </div>
  );
}

function ColorField({
  label,
  description,
  value,
  defaultValue,
  onChange,
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/30 p-5">

      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <label className="block text-sm font-bold text-white">
            {label}
          </label>

          <p className="text-[11px] text-neutral-600 mt-1">
            {description}
          </p>
        </div>

        <div
          className="w-10 h-10 rounded-xl border border-white/10 shrink-0"
          style={{
            backgroundColor: value,
          }}
        />
      </div>

      <div className="flex items-center gap-3">

        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-14 h-11 bg-neutral-950 border border-white/10 rounded-xl cursor-pointer p-1"
        />

        <input
          type="text"
          value={value}
          maxLength={7}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 min-w-0 h-11 bg-neutral-950 border border-white/10 rounded-xl px-3 text-xs font-mono text-white uppercase outline-none focus:border-amber-400/50"
        />

        <button
          type="button"
          onClick={() => onChange(defaultValue)}
          className="h-11 px-3 rounded-xl border border-white/10 text-[10px] font-bold text-neutral-500 hover:text-white transition"
        >
          Reset
        </button>
      </div>

      <div className="flex items-center gap-2 mt-4">
        <span
          className="w-1.5 h-1.5 rounded-full"
          style={{
            backgroundColor: value,
          }}
        />

        <span className="text-[10px] font-mono text-neutral-600">
          {value}
        </span>
      </div>
    </div>
  );
}

function SocialField({
  label,
  value,
  placeholder,
  onChange,
}) {
  return (
    <Field
      label={label}
      description={`Your ${label} profile URL.`}
    >
      <input
        type="url"
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={inputClass}
      />
    </Field>
  );
}

function PreviewContact({
  label,
  value,
}) {
  return (
    <div>
      <p className="text-[9px] uppercase tracking-[0.25em] text-neutral-700">
        {label}
      </p>

      <p className="text-xs text-neutral-500 mt-2 truncate">
        {value}
      </p>
    </div>
  );
}

const inputClass =
  "w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-neutral-700 focus:border-amber-400/40 focus:bg-white/[0.02]";