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

  // Shipping
  shippingFee: "",
  freeShippingThreshold: "",

  // Announcement
  announcementEnabled: "false",
  announcementText: "",
};

export default function SettingsPage() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [originalSettings, setOriginalSettings] =
    useState(DEFAULT_SETTINGS);

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

      const response = await fetch("/api/admin/settings", {
        cache: "no-store",
      });

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

      const savedSettings = {
        ...settings,
      };

      setSettings(savedSettings);
      setOriginalSettings(savedSettings);
      setSaved(true);

      setTimeout(() => {
        setSaved(false);
      }, 3000);
    } catch (err) {
      console.error(err);
      setError(
        "Could not save your settings. Please try again."
      );
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

    setSettings({
      ...DEFAULT_SETTINGS,
    });

    setSaved(false);
    setError("");
  };

  const hasChanges = useMemo(() => {
    return (
      JSON.stringify(settings) !==
      JSON.stringify(originalSettings)
    );
  }, [settings, originalSettings]);

  if (loading) {
    return (
      <main className="min-h-screen bg-black text-white">
        <div className="mx-auto max-w-6xl px-5 py-20">
          <div className="animate-pulse">
            <div className="mb-3 h-10 w-64 rounded-xl bg-white/5" />

            <div className="mb-12 h-4 w-96 max-w-full rounded bg-white/5" />

            <div className="grid gap-8 lg:grid-cols-[220px_1fr]">
              <div className="h-72 rounded-2xl bg-white/[0.03]" />

              <div className="h-[650px] rounded-2xl bg-white/[0.03]" />
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-14">

        {/* HEADER */}
        <div className="mb-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-3 flex items-center gap-3">
              <span
                className="h-2 w-2 rounded-full"
                style={{
                  backgroundColor:
                    settings.primaryColor || "#f5b942",
                }}
              />

              <span className="text-[11px] font-semibold uppercase tracking-[0.3em] text-neutral-500">
                VÉRANE / CONTROL CENTER
              </span>
            </div>

            <h1 className="text-4xl font-black tracking-tight sm:text-5xl">
              Site Settings
            </h1>

            <p className="mt-3 max-w-xl text-sm leading-6 text-neutral-500">
              Control your storefront identity, colors, contact
              information, shipping, social presence and global
              announcements.
            </p>
          </div>

          <div className="flex gap-3">
            {hasChanges && (
              <button
                type="button"
                onClick={resetChanges}
                className="
                  rounded-full
                  border
                  border-white/10
                  px-5
                  py-3
                  text-sm
                  font-bold
                  text-neutral-400
                  transition
                  hover:bg-white/5
                  hover:text-white
                "
              >
                Discard
              </button>
            )}

            <button
              type="button"
              onClick={save}
              disabled={saving || !hasChanges}
              className="
                rounded-full
                bg-amber-500
                px-6
                py-3
                text-sm
                font-black
                text-black
                transition
                hover:bg-amber-400
                disabled:cursor-not-allowed
                disabled:opacity-40
              "
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
          <div className="mb-8 flex items-center justify-between gap-4 rounded-2xl border border-red-500/20 bg-red-500/[0.05] px-5 py-4">
            <p className="text-sm text-red-300">
              {error}
            </p>

            <button
              type="button"
              onClick={() => setError("")}
              className="text-xl text-red-400 transition hover:text-white"
            >
              ×
            </button>
          </div>
        )}

        {/* SAVED MESSAGE */}
        {saved && (
          <div className="mb-8 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.05] px-5 py-4">
            <p className="text-sm text-emerald-300">
              Your VÉRANE settings have been saved successfully.
            </p>
          </div>
        )}

        <div className="grid gap-8 lg:grid-cols-[220px_1fr]">

          {/* SIDEBAR */}
          <aside className="lg:sticky lg:top-8 lg:self-start">
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-2">

              <SettingsTab
                active={activeSection === "branding"}
                onClick={() =>
                  setActiveSection("branding")
                }
                title="Branding"
                description="Identity & colors"
              />

              <SettingsTab
                active={activeSection === "contact"}
                onClick={() =>
                  setActiveSection("contact")
                }
                title="Contact"
                description="Customer details"
              />

              <SettingsTab
                active={activeSection === "shipping"}
                onClick={() =>
                  setActiveSection("shipping")
                }
                title="Shipping"
                description="Delivery & shipping"
              />

              <SettingsTab
                active={activeSection === "social"}
                onClick={() =>
                  setActiveSection("social")
                }
                title="Social"
                description="Social platforms"
              />

              <SettingsTab
                active={activeSection === "announcement"}
                onClick={() =>
                  setActiveSection("announcement")
                }
                title="Announcement"
                description="Storefront banner"
              />

              <SettingsTab
                active={activeSection === "preview"}
                onClick={() =>
                  setActiveSection("preview")
                }
                title="Preview"
                description="Live appearance"
              />
            </div>

            <button
              type="button"
              onClick={resetDefaults}
              className="
                mt-3
                w-full
                rounded-2xl
                border
                border-white/10
                px-4
                py-3
                text-xs
                font-bold
                text-neutral-600
                transition
                hover:border-red-500/20
                hover:text-red-400
              "
            >
              Reset to Defaults
            </button>
          </aside>

          {/* CONTENT */}
          <section>

            {/* =====================================================
                BRANDING
            ===================================================== */}
            {activeSection === "branding" && (
              <div className="space-y-6">

                <SectionHeader
                  eyebrow="IDENTITY"
                  title="Branding"
                  description="Define how your brand appears across the storefront."
                  color={settings.primaryColor}
                />

                <div className="space-y-7 rounded-3xl border border-white/10 bg-white/[0.02] p-6 sm:p-8">

                  <Field
                    label="Site Name"
                    description="The main name displayed throughout your website."
                  >
                    <input
                      value={settings.siteName || ""}
                      onChange={(e) =>
                        updateSetting(
                          "siteName",
                          e.target.value
                        )
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
                        updateSetting(
                          "tagline",
                          e.target.value
                        )
                      }
                      placeholder="Luxury without compromise."
                      className={inputClass}
                    />
                  </Field>

                  <div className="grid gap-5 sm:grid-cols-2">

                    <ColorField
                      label="Primary Color"
                      description="Accents, buttons and highlights."
                      value={
                        settings.primaryColor ||
                        "#f5b942"
                      }
                      defaultValue="#f5b942"
                      onChange={(value) =>
                        updateSetting(
                          "primaryColor",
                          value
                        )
                      }
                    />

                    <ColorField
                      label="Background Color"
                      description="Main storefront background."
                      value={
                        settings.backgroundColor ||
                        "#070707"
                      }
                      defaultValue="#070707"
                      onChange={(value) =>
                        updateSetting(
                          "backgroundColor",
                          value
                        )
                      }
                    />

                  </div>
                </div>
              </div>
            )}

            {/* =====================================================
                CONTACT
            ===================================================== */}
            {activeSection === "contact" && (
              <div className="space-y-6">

                <SectionHeader
                  eyebrow="CUSTOMER ACCESS"
                  title="Contact Information"
                  description="Where customers can reach your business."
                  color={settings.primaryColor}
                />

                <div className="space-y-7 rounded-3xl border border-white/10 bg-white/[0.02] p-6 sm:p-8">

                  <Field
                    label="Email Address"
                    description="Primary customer support email."
                  >
                    <input
                      type="email"
                      value={settings.email || ""}
                      onChange={(e) =>
                        updateSetting(
                          "email",
                          e.target.value
                        )
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
                        updateSetting(
                          "phone",
                          e.target.value
                        )
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
                        updateSetting(
                          "whatsapp",
                          e.target.value
                        )
                      }
                      placeholder="+234..."
                      className={inputClass}
                    />
                  </Field>

                </div>
              </div>
            )}

            {/* =====================================================
                SHIPPING
            ===================================================== */}
            {activeSection === "shipping" && (
              <div className="space-y-6">

                <SectionHeader
                  eyebrow="DELIVERY & LOGISTICS"
                  title="Shipping"
                  description="Control your storefront's delivery pricing and free-shipping policy."
                  color={settings.primaryColor}
                />

                <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-6 sm:p-8">

                  <div className="grid gap-5 sm:grid-cols-2">

                    {/* FLAT SHIPPING FEE */}
                    <Field
                      label="Flat Shipping Fee"
                      description="The standard delivery charge applied to eligible orders."
                    >
                      <div className="relative">
                        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-neutral-500">
                          ₦
                        </span>

                        <input
                          value={
                            settings.shippingFee || ""
                          }
                          onChange={(e) =>
                            updateSetting(
                              "shippingFee",
                              e.target.value
                            )
                          }
                          type="number"
                          min="0"
                          step="1"
                          placeholder="5000"
                          className={`${inputClass} pl-9`}
                        />
                      </div>
                    </Field>

                    {/* FREE SHIPPING THRESHOLD */}
                    <Field
                      label="Free Shipping Threshold"
                      description="Orders at or above this amount receive free delivery."
                    >
                      <div className="relative">
                        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-neutral-500">
                          ₦
                        </span>

                        <input
                          value={
                            settings.freeShippingThreshold ||
                            ""
                          }
                          onChange={(e) =>
                            updateSetting(
                              "freeShippingThreshold",
                              e.target.value
                            )
                          }
                          type="number"
                          min="0"
                          step="1"
                          placeholder="100000"
                          className={`${inputClass} pl-9`}
                        />
                      </div>
                    </Field>

                  </div>

                  {/* SHIPPING PREVIEW */}
                  <div className="mt-7 rounded-2xl border border-white/10 bg-black/40 p-5">

                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.25em] text-neutral-600">
                          Shipping Preview
                        </p>

                        <p className="mt-2 text-sm font-medium text-neutral-300">
                          {settings.freeShippingThreshold
                            ? `Free delivery on orders of ${formatNaira(
                                settings.freeShippingThreshold
                              )} or more.`
                            : "No free-shipping threshold configured."}
                        </p>
                      </div>

                      <div className="hidden h-10 w-10 items-center justify-center rounded-full border border-white/10 text-neutral-500 sm:flex">
                        →
                      </div>
                    </div>

                    <div className="mt-5 grid grid-cols-2 gap-4 border-t border-white/10 pt-5">

                      <div>
                        <p className="text-[9px] uppercase tracking-[0.2em] text-neutral-700">
                          Standard Fee
                        </p>

                        <p className="mt-1 text-sm font-semibold text-white">
                          {settings.shippingFee
                            ? formatNaira(
                                settings.shippingFee
                              )
                            : "Not set"}
                        </p>
                      </div>

                      <div>
                        <p className="text-[9px] uppercase tracking-[0.2em] text-neutral-700">
                          Free Delivery
                        </p>

                        <p className="mt-1 text-sm font-semibold text-white">
                          {settings.freeShippingThreshold
                            ? formatNaira(
                                settings.freeShippingThreshold
                              )
                            : "Disabled"}
                        </p>
                      </div>

                    </div>
                  </div>

                  {/* SHIPPING INFORMATION */}
                  <div className="mt-5 rounded-2xl border border-white/5 bg-white/[0.015] p-5">
                    <div className="flex gap-4">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 text-xs text-neutral-500">
                        i
                      </div>

                      <div>
                        <p className="text-xs font-semibold text-neutral-300">
                          How shipping will work
                        </p>

                        <p className="mt-1 text-[11px] leading-5 text-neutral-600">
                          Customers will pay the flat shipping fee
                          unless their order reaches the configured
                          free-shipping threshold.
                        </p>
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            )}

            {/* =====================================================
                SOCIAL
            ===================================================== */}
            {activeSection === "social" && (
              <div className="space-y-6">

                <SectionHeader
                  eyebrow="SOCIAL PRESENCE"
                  title="Social Media"
                  description="Connect your storefront to your social platforms."
                  color={settings.primaryColor}
                />

                <div className="space-y-7 rounded-3xl border border-white/10 bg-white/[0.02] p-6 sm:p-8">

                  <SocialField
                    label="Instagram"
                    value={settings.instagram}
                    placeholder="https://instagram.com/..."
                    onChange={(value) =>
                      updateSetting(
                        "instagram",
                        value
                      )
                    }
                  />

                  <SocialField
                    label="Facebook"
                    value={settings.facebook}
                    placeholder="https://facebook.com/..."
                    onChange={(value) =>
                      updateSetting(
                        "facebook",
                        value
                      )
                    }
                  />

                  <SocialField
                    label="TikTok"
                    value={settings.tiktok}
                    placeholder="https://tiktok.com/@..."
                    onChange={(value) =>
                      updateSetting(
                        "tiktok",
                        value
                      )
                    }
                  />

                </div>
              </div>
            )}

            {/* =====================================================
                ANNOUNCEMENT
            ===================================================== */}
            {activeSection === "announcement" && (
              <div className="space-y-6">

                <SectionHeader
                  eyebrow="STOREFRONT MESSAGE"
                  title="Announcement Bar"
                  description="Display a global announcement at the top of your storefront."
                  color={settings.primaryColor}
                />

                <div className="space-y-7 rounded-3xl border border-white/10 bg-white/[0.02] p-6 sm:p-8">

                  <Field
                    label="Status"
                    description="Choose whether the announcement should be visible."
                  >
                    <div className="grid grid-cols-2 gap-3">

                      <button
                        type="button"
                        onClick={() =>
                          updateSetting(
                            "announcementEnabled",
                            "false"
                          )
                        }
                        className={`rounded-2xl border px-5 py-4 text-left transition ${
                          settings.announcementEnabled !==
                          "true"
                            ? "border-white/20 bg-white/[0.06]"
                            : "border-white/10 bg-white/[0.02]"
                        }`}
                      >
                        <span className="block text-sm font-bold">
                          Disabled
                        </span>

                        <span className="mt-1 block text-xs text-neutral-600">
                          Hide announcement
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          updateSetting(
                            "announcementEnabled",
                            "true"
                          )
                        }
                        className={`rounded-2xl border px-5 py-4 text-left transition ${
                          settings.announcementEnabled ===
                          "true"
                            ? "border-amber-400/40 bg-amber-400/[0.06]"
                            : "border-white/10 bg-white/[0.02]"
                        }`}
                      >
                        <span className="block text-sm font-bold">
                          Enabled
                        </span>

                        <span className="mt-1 block text-xs text-neutral-600">
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
                      value={
                        settings.announcementText || ""
                      }
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

                    <div className="mt-2 text-right text-[10px] text-neutral-700">
                      {
                        (settings.announcementText || "")
                          .length
                      }
                      /180
                    </div>
                  </Field>

                  {settings.announcementEnabled ===
                    "true" &&
                    settings.announcementText && (
                      <div
                        className="rounded-xl px-5 py-3 text-center text-xs font-semibold"
                        style={{
                          backgroundColor:
                            settings.primaryColor ||
                            "#f5b942",
                          color: "#000",
                        }}
                      >
                        {settings.announcementText}
                      </div>
                    )}

                </div>
              </div>
            )}

            {/* =====================================================
                PREVIEW
            ===================================================== */}
            {activeSection === "preview" && (
              <div className="space-y-6">

                <SectionHeader
                  eyebrow="LIVE PREVIEW"
                  title="Storefront Preview"
                  description="See how your current branding settings will feel on the storefront."
                  color={settings.primaryColor}
                />

                <div
                  className="min-h-[600px] overflow-hidden rounded-3xl border border-white/10"
                  style={{
                    backgroundColor:
                      settings.backgroundColor ||
                      "#070707",
                  }}
                >

                  {/* PREVIEW NAV */}
                  <div className="flex items-center justify-between border-b border-white/10 px-6 py-5">

                    <div
                      className="text-xl font-black tracking-tight"
                      style={{
                        color:
                          settings.primaryColor ||
                          "#f5b942",
                      }}
                    >
                      {settings.siteName ||
                        "VÉRANE"}
                    </div>

                    <div className="hidden gap-5 text-[10px] uppercase tracking-widest text-neutral-500 sm:flex">
                      <span>Shop</span>
                      <span>Collections</span>
                      <span>About</span>
                    </div>

                    <div className="h-9 w-9 rounded-full border border-white/10" />
                  </div>

                  {/* ANNOUNCEMENT */}
                  {settings.announcementEnabled ===
                    "true" &&
                    settings.announcementText && (
                      <div
                        className="px-5 py-3 text-center text-xs font-bold"
                        style={{
                          backgroundColor:
                            settings.primaryColor ||
                            "#f5b942",
                          color: "#000",
                        }}
                      >
                        {settings.announcementText}
                      </div>
                    )}

                  {/* HERO */}
                  <div className="px-6 py-20 text-center sm:px-12 sm:py-28">

                    <div className="mb-5 text-[10px] uppercase tracking-[0.4em] text-neutral-600">
                      ESTABLISHED / VÉRANE
                    </div>

                    <h2 className="text-5xl font-black tracking-tight sm:text-7xl">
                      {settings.siteName ||
                        "VÉRANE"}
                    </h2>

                    <p className="mx-auto mt-5 max-w-lg text-neutral-500">
                      {settings.tagline ||
                        "A premium expression of modern luxury."}
                    </p>

                    <button
                      type="button"
                      className="mt-8 rounded-full px-7 py-4 text-xs font-black uppercase tracking-widest"
                      style={{
                        backgroundColor:
                          settings.primaryColor ||
                          "#f5b942",
                        color: "#000",
                      }}
                    >
                      Explore Collection
                    </button>

                  </div>

                  {/* SHIPPING PREVIEW */}
                  {(settings.shippingFee ||
                    settings.freeShippingThreshold) && (
                    <div className="border-y border-white/10 px-6 py-6 sm:px-12">

                      <div className="grid gap-4 sm:grid-cols-2">

                        <div>
                          <p className="text-[9px] uppercase tracking-[0.25em] text-neutral-700">
                            Delivery
                          </p>

                          <p className="mt-2 text-xs text-neutral-500">
                            {settings.shippingFee
                              ? `${formatNaira(
                                  settings.shippingFee
                                )} standard delivery`
                              : "Shipping fee not configured"}
                          </p>
                        </div>

                        <div>
                          <p className="text-[9px] uppercase tracking-[0.25em] text-neutral-700">
                            Free Shipping
                          </p>

                          <p className="mt-2 text-xs text-neutral-500">
                            {settings.freeShippingThreshold
                              ? `Free on orders above ${formatNaira(
                                  settings.freeShippingThreshold
                                )}`
                              : "Not configured"}
                          </p>
                        </div>

                      </div>
                    </div>
                  )}

                  {/* CONTACT PREVIEW */}
                  <div className="grid gap-6 border-t border-white/10 px-6 py-8 text-center sm:grid-cols-3 sm:px-12">

                    <PreviewContact
                      label="Email"
                      value={
                        settings.email ||
                        "Not configured"
                      }
                    />

                    <PreviewContact
                      label="Phone"
                      value={
                        settings.phone ||
                        "Not configured"
                      }
                    />

                    <PreviewContact
                      label="WhatsApp"
                      value={
                        settings.whatsapp ||
                        "Not configured"
                      }
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
      className={`w-full rounded-xl px-4 py-3.5 text-left transition ${
        active
          ? "bg-white/[0.07] text-white"
          : "text-neutral-500 hover:bg-white/[0.03] hover:text-white"
      }`}
    >
      <span className="block text-sm font-bold">
        {title}
      </span>

      <span className="mt-1 block text-[10px] text-neutral-600">
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
        className="mb-3 text-[10px] font-bold uppercase tracking-[0.3em]"
        style={{
          color: color || "#f5b942",
        }}
      >
        {eyebrow}
      </div>

      <h2 className="text-2xl font-black sm:text-3xl">
        {title}
      </h2>

      <p className="mt-2 text-sm text-neutral-600">
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
      <label className="mb-1.5 block text-sm font-bold text-white">
        {label}
      </label>

      {description && (
        <p className="mb-3 text-xs text-neutral-600">
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

      <div className="mb-4 flex items-start justify-between gap-4">

        <div>
          <label className="block text-sm font-bold text-white">
            {label}
          </label>

          <p className="mt-1 text-[11px] text-neutral-600">
            {description}
          </p>
        </div>

        <div
          className="h-10 w-10 shrink-0 rounded-xl border border-white/10"
          style={{
            backgroundColor: value,
          }}
        />
      </div>

      <div className="flex items-center gap-3">

        <input
          type="color"
          value={value}
          onChange={(e) =>
            onChange(e.target.value)
          }
          className="h-11 w-14 cursor-pointer rounded-xl border border-white/10 bg-neutral-950 p-1"
        />

        <input
          type="text"
          value={value}
          maxLength={7}
          onChange={(e) =>
            onChange(e.target.value)
          }
          className="
            h-11
            min-w-0
            flex-1
            rounded-xl
            border
            border-white/10
            bg-neutral-950
            px-3
            text-xs
            font-mono
            uppercase
            text-white
            outline-none
            focus:border-amber-400/50
          "
        />

        <button
          type="button"
          onClick={() =>
            onChange(defaultValue)
          }
          className="
            h-11
            rounded-xl
            border
            border-white/10
            px-3
            text-[10px]
            font-bold
            text-neutral-500
            transition
            hover:text-white
          "
        >
          Reset
        </button>

      </div>

      <div className="mt-4 flex items-center gap-2">
        <span
          className="h-1.5 w-1.5 rounded-full"
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
        onChange={(e) =>
          onChange(e.target.value)
        }
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

      <p className="mt-2 truncate text-xs text-neutral-500">
        {value}
      </p>
    </div>
  );
}

function formatNaira(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "₦0";
  }

  return `₦${number.toLocaleString("en-NG", {
    maximumFractionDigits: 0,
  })}`;
}

const inputClass = `
  w-full
  rounded-xl
  border
  border-white/10
  bg-black/50
  px-4
  py-3.5
  text-sm
  text-white
  outline-none
  transition
  placeholder:text-neutral-700
  focus:border-amber-400/40
  focus:bg-white/[0.02]
`;