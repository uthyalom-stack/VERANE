"use client";

import { useEffect, useState } from "react";

export default function BrandPickupSettingsPage() {
  const [pickupData, setPickupData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetchPickupData();
  }, []);

  async function fetchPickupData() {
    try {
      setLoading(true);
      setError("");
      const res = await fetch("/api/admin/pickup-settings", {
        cache: "no-store",
        credentials: "include",
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setPickupData(data);
      } else {
        setError(data.error || "Pickup settings are restricted to brand administrators.");
      }
    } catch (err) {
      console.error(err);
      setError("Failed to load pickup settings.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(payload) {
    setSaving(true);
    setMsg("");
    setError("");
    try {
      const res = await fetch("/api/admin/pickup-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMsg("Pickup settings updated successfully!");
        fetchPickupData();
      } else {
        setError(data.error || "Failed to update pickup settings.");
      }
    } catch (err) {
      console.error(err);
      setError("An error occurred while saving.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        <p className="text-xs font-mono text-neutral-500 animate-pulse">Loading pickup configuration...</p>
      </main>
    );
  }

  if (!pickupData) {
    return (
      <main className="min-h-screen bg-black text-white p-10">
        <div className="max-w-xl mx-auto p-6 rounded-2xl border border-red-500/20 bg-red-500/10 text-red-300 text-sm font-bold">
          {error || "Unable to load brand pickup settings. Brand admin session required."}
        </div>
      </main>
    );
  }

  const role = pickupData.role;
  const brandName = role === "UTHY" ? "UTHY LUXURY" : "ALOMZIEE FOOTIES";
  const prefix = role === "UTHY" ? "uthy" : "alomziee";

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <header className="mb-10">
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-amber-400">Atelier Operations</p>
          <h1 className="mt-2 text-3xl font-black">{brandName} Customer Pickup</h1>
          <p className="mt-2 text-sm text-neutral-400">
            Configure physical atelier pickup address, lead times, operating days of the week, immediate pickup toggle, and collection instructions.
          </p>
        </header>

        {msg && <div className="mb-6 p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-xs text-emerald-300 font-bold">{msg}</div>}
        {error && <div className="mb-6 p-4 rounded-xl border border-red-500/20 bg-red-500/10 text-xs text-red-300 font-bold">{error}</div>}

        <BrandPickupForm
          brandName={brandName}
          prefix={prefix}
          initialAddress={pickupData.pickupAddress || ""}
          initialImmediate={Boolean(pickupData.immediatePickupEnabled)}
          initialInstructions={pickupData.pickupInstructions || ""}
          initialLeadDays={pickupData.leadDays || 2}
          initialAllowedDays={pickupData.allowedDaysOfWeek || ["MON", "TUE", "WED", "THU", "FRI", "SAT"]}
          onSave={handleSave}
          saving={saving}
        />
      </div>
    </main>
  );
}

function BrandPickupForm({
  brandName,
  prefix,
  initialAddress,
  initialImmediate,
  initialInstructions,
  initialLeadDays,
  initialAllowedDays,
  onSave,
  saving,
}) {
  const [address, setAddress] = useState(initialAddress || "");
  const [immediate, setImmediate] = useState(Boolean(initialImmediate));
  const [instructions, setInstructions] = useState(initialInstructions || "");
  const [leadDays, setLeadDays] = useState(Number(initialLeadDays || 2));
  const [allowedDays, setAllowedDays] = useState(
    Array.isArray(initialAllowedDays) ? initialAllowedDays : ["MON", "TUE", "WED", "THU", "FRI", "SAT"]
  );

  const allDays = [
    { code: "MON", label: "Monday" },
    { code: "TUE", label: "Tuesday" },
    { code: "WED", label: "Wednesday" },
    { code: "THU", label: "Thursday" },
    { code: "FRI", label: "Friday" },
    { code: "SAT", label: "Saturday" },
    { code: "SUN", label: "Sunday" },
  ];

  function toggleDay(code) {
    if (allowedDays.includes(code)) {
      if (allowedDays.length <= 1) return; // Keep at least one day
      setAllowedDays(allowedDays.filter((d) => d !== code));
    } else {
      setAllowedDays([...allowedDays, code]);
    }
  }

  const inputClass = "w-full rounded-xl border border-white/10 bg-neutral-900 px-4 py-3 text-sm text-white outline-none focus:border-amber-400/50";

  return (
    <div className="space-y-6 rounded-3xl border border-white/10 bg-white/[0.02] p-6 sm:p-8">
      <div>
        <label className="block text-sm font-bold text-white mb-1">Pickup Location Address</label>
        <p className="text-xs text-neutral-500 mb-3">The full physical address where customers will pick up their orders.</p>
        <textarea
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          rows={3}
          placeholder="Enter pickup address..."
          className={`${inputClass} resize-none`}
        />
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-bold text-white mb-1">Normal Pickup Lead Time (Days)</label>
          <p className="text-xs text-neutral-500 mb-3">Number of days after order before normal pickup choices start (default 2 days).</p>
          <input
            type="number"
            min="1"
            max="14"
            value={leadDays}
            onChange={(e) => setLeadDays(Math.max(1, Number(e.target.value)))}
            className={inputClass}
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-white mb-1">Immediate Pickup Availability</label>
          <p className="text-xs text-neutral-500 mb-3">When enabled, customers can request same-day / immediate pickup at checkout.</p>
          <div className="flex items-center gap-3 pt-1">
            <button
              type="button"
              onClick={() => setImmediate(true)}
              className={`px-5 py-2.5 rounded-full text-xs font-bold transition ${
                immediate ? "bg-amber-400 text-black shadow-md" : "bg-neutral-900 text-neutral-400 border border-white/10"
              }`}
            >
              Immediate Pickup ON
            </button>
            <button
              type="button"
              onClick={() => setImmediate(false)}
              className={`px-5 py-2.5 rounded-full text-xs font-bold transition ${
                !immediate ? "bg-amber-400 text-black shadow-md" : "bg-neutral-900 text-neutral-400 border border-white/10"
              }`}
            >
              Immediate Pickup OFF
            </button>
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-bold text-white mb-1">Permitted Operating Pickup Days</label>
        <p className="text-xs text-neutral-500 mb-3">Select which days of the week customers are allowed to schedule pickup collections.</p>
        <div className="flex flex-wrap gap-2 pt-1">
          {allDays.map((day) => {
            const active = allowedDays.includes(day.code);
            return (
              <button
                key={day.code}
                type="button"
                onClick={() => toggleDay(day.code)}
                className={`px-4 py-2 rounded-xl text-xs font-bold border transition ${
                  active
                    ? "border-amber-400/50 bg-amber-400/10 text-amber-300"
                    : "border-white/10 bg-neutral-900 text-neutral-600 hover:text-white"
                }`}
              >
                {day.label} ({day.code}) {active ? "✓" : ""}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label className="block text-sm font-bold text-white mb-1">Pickup Instructions</label>
        <p className="text-xs text-neutral-500 mb-3">Instructions provided to customers after selecting pickup.</p>
        <textarea
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          rows={2}
          placeholder="Enter pickup instructions..."
          className={`${inputClass} resize-none`}
        />
      </div>

      <button
        type="button"
        disabled={saving}
        onClick={() =>
          onSave({
            [`${prefix}PickupAddress`]: address,
            [`${prefix}ImmediatePickupEnabled`]: String(immediate),
            [`${prefix}PickupInstructions`]: instructions,
            [`${prefix}PickupLeadDays`]: String(leadDays),
            [`${prefix}PickupAllowedDays`]: allowedDays,
          })
        }
        className="bg-amber-400 text-black px-6 py-3 rounded-full text-xs font-black uppercase hover:bg-amber-300 transition disabled:opacity-50"
      >
        {saving ? "Saving..." : `Save ${brandName} Pickup Settings`}
      </button>
    </div>
  );
}
