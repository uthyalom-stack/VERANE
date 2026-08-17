"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const defaultSettings = {
  siteName: "VÉRANE",
  siteTagline: "",
  siteDescription: "",

  logo: "",
  favicon: "",

  primaryColor: "#f59e0b",
  secondaryColor: "#000000",
  accentColor: "#ffffff",

  heroTitle: "",
  heroSubtitle: "",
  heroImage: "",
  heroButtonText: "Shop Now",
  heroButtonLink: "/products",

  uthyEnabled: true,
  uthyName: "UTHY LUXURY",
  uthyDescription: "",
  uthyImage: "",

  alomzieeEnabled: true,
  alomzieeName: "ALOMZIEE FOOTIES",
  alomzieeDescription: "",
  alomzieeImage: "",

  announcementEnabled: false,
  announcementText: "",

  instagram: "",
  facebook: "",
  tiktok: "",
  whatsapp: "",
  email: "",
  phone: "",

  currency: "NGN",
  shippingEnabled: true,

  seoTitle: "",
  seoDescription: "",
  seoImage: "",
};

export default function SettingsPage() {
  const router = useRouter();

  const [settings, setSettings] = useState(defaultSettings);
  const [activeTab, setActiveTab] = useState("brand");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const auth = localStorage.getItem("adminAuth");

    if (auth !== "true") {
      router.replace("/admin/login");
      return;
    }

    loadSettings();
  }, [router]);

  async function loadSettings() {
    try {
      const response = await fetch("/api/admin/settings");
      const data = await response.json();

      if (response.ok) {
        setSettings({
          ...defaultSettings,
          ...data,
        });
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  function update(field, value) {
    setSettings((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function saveSettings() {
    setSaving(true);
    setMessage("");

    try {
      const response = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(settings),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to save");
      }

      setSettings({
        ...defaultSettings,
        ...data.settings,
      });

      setMessage("Settings saved successfully.");
    } catch (error) {
      console.error(error);
      setMessage("Could not save settings.");
    } finally {
      setSaving(false);

      setTimeout(() => {
        setMessage("");
      }, 3000);
    }
  }

  const tabs = [
    ["brand", "Brand"],
    ["homepage", "Homepage"],
    ["uthy", "UTHY LUXURY"],
    ["alomziee", "ALOMZIEE"],
    ["appearance", "Appearance"],
    ["social", "Social & Contact"],
    ["store", "Store"],
    ["seo", "SEO"],
  ];

  if (loading) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        <p className="text-neutral-500 text-sm">
          Loading settings...
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="max-w-7xl mx-auto px-5 sm:px-8 py-8 md:py-12">

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
              Site Settings
            </h1>

            <p className="text-neutral-500 mt-3">
              Control your entire storefront from here.
            </p>
          </div>

          <button
            onClick={saveSettings}
            disabled={saving}
            className="px-7 py-4 rounded-full bg-amber-500 text-black text-sm font-black hover:bg-amber-400 transition disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>

        {message && (
          <div className="mt-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-5 py-4 text-sm text-emerald-400">
            {message}
          </div>
        )}

        <div className="mt-10 flex flex-col lg:flex-row gap-8">

          <aside className="lg:w-56 shrink-0">
            <div className="lg:sticky lg:top-8 space-y-1">
              {tabs.map(([id, label]) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={`w-full text-left px-4 py-3 rounded-xl text-sm font-bold transition ${
                    activeTab === id
                      ? "bg-amber-500 text-black"
                      : "text-neutral-500 hover:text-white hover:bg-white/5"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </aside>

          <section className="flex-1">

            {activeTab === "brand" && (
              <Section title="Brand Identity">
                <Input
                  label="Site Name"
                  value={settings.siteName}
                  onChange={(v) => update("siteName", v)}
                />

                <Input
                  label="Tagline"
                  value={settings.siteTagline}
                  onChange={(v) => update("siteTagline", v)}
                />

                <Textarea
                  label="Site Description"
                  value={settings.siteDescription}
                  onChange={(v) => update("siteDescription", v)}
                />

                <Input
                  label="Logo URL"
                  value={settings.logo}
                  onChange={(v) => update("logo", v)}
                  placeholder="/images/logo.png"
                />

                <Input
                  label="Favicon URL"
                  value={settings.favicon}
                  onChange={(v) => update("favicon", v)}
                  placeholder="/favicon.ico"
                />
              </Section>
            )}

            {activeTab === "homepage" && (
              <Section title="Homepage">
                <Input
                  label="Hero Title"
                  value={settings.heroTitle}
                  onChange={(v) => update("heroTitle", v)}
                />

                <Textarea
                  label="Hero Subtitle"
                  value={settings.heroSubtitle}
                  onChange={(v) => update("heroSubtitle", v)}
                />

                <Input
                  label="Hero Image URL"
                  value={settings.heroImage}
                  onChange={(v) => update("heroImage", v)}
                />

                <div className="grid md:grid-cols-2 gap-5">
                  <Input
                    label="Button Text"
                    value={settings.heroButtonText}
                    onChange={(v) => update("heroButtonText", v)}
                  />

                  <Input
                    label="Button Link"
                    value={settings.heroButtonLink}
                    onChange={(v) => update("heroButtonLink", v)}
                  />
                </div>

                <div className="border-t border-white/10 pt-6">
                  <Toggle
                    label="Announcement Bar"
                    checked={settings.announcementEnabled}
                    onChange={(v) =>
                      update("announcementEnabled", v)
                    }
                  />

                  <Input
                    label="Announcement Text"
                    value={settings.announcementText}
                    onChange={(v) =>
                      update("announcementText", v)
                    }
                  />
                </div>
              </Section>
            )}

            {activeTab === "uthy" && (
              <Section title="UTHY LUXURY">
                <Toggle
                  label="Show UTHY LUXURY"
                  checked={settings.uthyEnabled}
                  onChange={(v) => update("uthyEnabled", v)}
                />

                <Input
                  label="Brand Name"
                  value={settings.uthyName}
                  onChange={(v) => update("uthyName", v)}
                />

                <Textarea
                  label="Description"
                  value={settings.uthyDescription}
                  onChange={(v) =>
                    update("uthyDescription", v)
                  }
                />

                <Input
                  label="Section Image URL"
                  value={settings.uthyImage}
                  onChange={(v) => update("uthyImage", v)}
                />
              </Section>
            )}

            {activeTab === "alomziee" && (
              <Section title="ALOMZIEE FOOTIES">
                <Toggle
                  label="Show ALOMZIEE FOOTIES"
                  checked={settings.alomzieeEnabled}
                  onChange={(v) =>
                    update("alomzieeEnabled", v)
                  }
                />

                <Input
                  label="Brand Name"
                  value={settings.alomzieeName}
                  onChange={(v) =>
                    update("alomzieeName", v)
                  }
                />

                <Textarea
                  label="Description"
                  value={settings.alomzieeDescription}
                  onChange={(v) =>
                    update("alomzieeDescription", v)
                  }
                />

                <Input
                  label="Section Image URL"
                  value={settings.alomzieeImage}
                  onChange={(v) =>
                    update("alomzieeImage", v)
                  }
                />
              </Section>
            )}

            {activeTab === "appearance" && (
              <Section title="Appearance">
                <div className="grid md:grid-cols-3 gap-5">
                  <ColorInput
                    label="Primary Color"
                    value={settings.primaryColor}
                    onChange={(v) =>
                      update("primaryColor", v)
                    }
                  />

                  <ColorInput
                    label="Secondary Color"
                    value={settings.secondaryColor}
                    onChange={(v) =>
                      update("secondaryColor", v)
                    }
                  />

                  <ColorInput
                    label="Accent Color"
                    value={settings.accentColor}
                    onChange={(v) =>
                      update("accentColor", v)
                    }
                  />
                </div>

                <div className="rounded-2xl border border-white/10 bg-black p-6">
                  <p className="text-xs uppercase tracking-wider text-neutral-600">
                    Preview
                  </p>

                  <div
                    className="mt-5 rounded-2xl p-8"
                    style={{
                      backgroundColor:
                        settings.secondaryColor,
                    }}
                  >
                    <p
                      className="text-3xl font-black"
                      style={{
                        color: settings.accentColor,
                      }}
                    >
                      {settings.siteName || "VÉRANE"}
                    </p>

                    <p
                      className="mt-2"
                      style={{
                        color: settings.primaryColor,
                      }}
                    >
                      {settings.siteTagline ||
                        "Your brand tagline"}
                    </p>
                  </div>
                </div>
              </Section>
            )}

            {activeTab === "social" && (
              <Section title="Social & Contact">
                <Input
                  label="Instagram"
                  value={settings.instagram}
                  onChange={(v) => update("instagram", v)}
                />

                <Input
                  label="Facebook"
                  value={settings.facebook}
                  onChange={(v) => update("facebook", v)}
                />

                <Input
                  label="TikTok"
                  value={settings.tiktok}
                  onChange={(v) => update("tiktok", v)}
                />

                <Input
                  label="WhatsApp"
                  value={settings.whatsapp}
                  onChange={(v) => update("whatsapp", v)}
                />

                <Input
                  label="Email"
                  value={settings.email}
                  onChange={(v) => update("email", v)}
                />

                <Input
                  label="Phone"
                  value={settings.phone}
                  onChange={(v) => update("phone", v)}
                />
              </Section>
            )}

            {activeTab === "store" && (
              <Section title="Store Configuration">
                <Select
                  label="Currency"
                  value={settings.currency}
                  onChange={(v) => update("currency", v)}
                  options={[
                    ["NGN", "Nigerian Naira (₦)"],
                    ["USD", "US Dollar ($)"],
                    ["GBP", "British Pound (£)"],
                    ["EUR", "Euro (€)"],
                  ]}
                />

                <Toggle
                  label="Enable Shipping"
                  checked={settings.shippingEnabled}
                  onChange={(v) =>
                    update("shippingEnabled", v)
                  }
                />
              </Section>
            )}

            {activeTab === "seo" && (
              <Section title="SEO">
                <Input
                  label="SEO Title"
                  value={settings.seoTitle}
                  onChange={(v) => update("seoTitle", v)}
                />

                <Textarea
                  label="SEO Description"
                  value={settings.seoDescription}
                  onChange={(v) =>
                    update("seoDescription", v)
                  }
                />

                <Input
                  label="SEO / Social Image URL"
                  value={settings.seoImage}
                  onChange={(v) =>
                    update("seoImage", v)
                  }
                />
              </Section>
            )}

          </section>
        </div>
      </div>
    </main>
  );
}

function Section({ title, children }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-neutral-950 p-6 md:p-8 space-y-6">
      <div>
        <h2 className="text-2xl font-black">{title}</h2>
        <div className="h-px bg-white/5 mt-5" />
      </div>

      {children}
    </div>
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

function Textarea({ label, value, onChange }) {
  return (
    <label className="block">
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

function Toggle({ label, checked, onChange }) {
  return (
    <div className="flex items-center justify-between gap-5 rounded-xl border border-white/10 bg-black p-4">
      <span className="text-sm font-bold">
        {label}
      </span>

      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative w-12 h-7 rounded-full transition ${
          checked
            ? "bg-amber-500"
            : "bg-neutral-700"
        }`}
      >
        <span
          className={`absolute top-1 w-5 h-5 rounded-full bg-white transition ${
            checked ? "left-6" : "left-1"
          }`}
        />
      </button>
    </div>
  );
}

function ColorInput({ label, value, onChange }) {
  return (
    <label className="block">
      <span className="block text-xs font-bold text-neutral-400 mb-2">
        {label}
      </span>

      <div className="flex gap-3">
        <input
          type="color"
          value={value || "#000000"}
          onChange={(e) => onChange(e.target.value)}
          className="h-12 w-14 rounded-lg border border-white/10 bg-black cursor-pointer"
        />

        <input
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 rounded-xl border border-white/10 bg-black px-4 text-sm text-white outline-none focus:border-amber-500/50"
        />
      </div>
    </label>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}) {
  return (
    <label className="block">
      <span className="block text-xs font-bold text-neutral-400 mb-2">
        {label}
      </span>

      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-sm text-white outline-none focus:border-amber-500/50"
      >
        {options.map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
    </label>
  );
}