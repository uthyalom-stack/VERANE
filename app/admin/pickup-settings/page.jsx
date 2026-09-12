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
          initialLocationName={pickupData.pickupLocationName || ""}
          initialAddress={pickupData.pickupAddress || ""}
          initialContactName={pickupData.pickupContactName || ""}
          initialContactPhone={pickupData.pickupContactPhone || ""}
          initialImmediate={Boolean(pickupData.immediatePickupEnabled)}
          initialInstructions={pickupData.pickupInstructions || ""}
          initialMinDays={pickupData.minDays || 1}
          initialMaxDays={pickupData.maxDays || 3}
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
  initialLocationName,
  initialAddress,
  initialContactName,
  initialContactPhone,
  initialImmediate,
  initialInstructions,
  initialMinDays,
  initialMaxDays,
  initialLeadDays,
  initialAllowedDays,
  onSave,
  saving,
}) {
  const [locationName, setLocationName] = useState(initialLocationName || "");
  const [address, setAddress] = useState(initialAddress || "");
  const [contactName, setContactName] = useState(initialContactName || "");
  const [contactPhone, setContactPhone] = useState(initialContactPhone || "");
  const [immediate, setImmediate] = useState(Boolean(initialImmediate));
  const [instructions, setInstructions] = useState(initialInstructions || "");
  const [minDays, setMinDays] = useState(Number(initialMinDays || 1));
  const [maxDays, setMaxDays] = useState(Number(initialMaxDays || 3));
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
      {/* LOCATION & CONTACT */}
      <div className="space-y-5">
        <h3 className="text-base font-black text-amber-400 mb-1">Pickup Location & Contact Information</h3>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-bold text-white mb-1">Pickup Location Name</label>
            <input
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
              placeholder={`${brandName} Flagship Atelier`}
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-white mb-1">Pickup Contact Person Name</label>
            <input
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              placeholder="e.g. Atelier Concierge"
              className={inputClass}
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-white mb-1">Pickup Contact Phone Number</label>
          <input
            value={contactPhone}
            onChange={(e) => setContactPhone(e.target.value)}
            placeholder="+234..."
            className={inputClass}
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-white mb-1">Complete Physical Pickup Address</label>
          <textarea
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            rows={3}
            placeholder="Full physical street address for customer pickup..."
            className={`${inputClass} resize-none`}
          />
        </div>
      </div>

      {/* TIMEFRAME & SCHEDULE */}
      <div className="border-t border-white/10 pt-6 space-y-5">
        <h3 className="text-base font-black text-amber-400 mb-1">Pickup Timeframe & Schedule Configuration</h3>

        <div className="grid gap-5 sm:grid-cols-3">
          <div>
            <label className="block text-xs font-bold text-white mb-1">Min Pickup Days</label>
            <p className="text-[10px] text-neutral-500 mb-2">Earliest days after order (e.g. 1 day)</p>
            <input
              type="number"
              min="0"
              max="14"
              value={minDays}
              onChange={(e) => setMinDays(Math.max(0, Number(e.target.value)))}
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-white mb-1">Max Pickup Days</label>
            <p className="text-[10px] text-neutral-500 mb-2">Latest days after order (e.g. 3 days)</p>
            <input
              type="number"
              min="1"
              max="14"
              value={maxDays}
              onChange={(e) => setMaxDays(Math.max(1, Number(e.target.value)))}
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-white mb-1">Pickup Start Lead Days</label>
            <p className="text-[10px] text-neutral-500 mb-2">Lead offset for calendar options</p>
            <input
              type="number"
              min="1"
              max="14"
              value={leadDays}
              onChange={(e) => setLeadDays(Math.max(1, Number(e.target.value)))}
              className={inputClass}
            />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-neutral-900/80 border border-white/10 text-xs text-neutral-300">
          <span className="font-bold text-amber-400">Configured Timeframe Preview: </span>
          <span>Pickup available {minDays}–{maxDays} days after order placement.</span>
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
            [`${prefix}PickupLocationName`]: locationName,
            [`${prefix}PickupAddress`]: address,
            [`${prefix}PickupContactName`]: contactName,
            [`${prefix}PickupContactPhone`]: contactPhone,
            [`${prefix}ImmediatePickupEnabled`]: String(immediate),
            [`${prefix}PickupInstructions`]: instructions,
            [`${prefix}PickupMinDays`]: String(minDays),
            [`${prefix}PickupMaxDays`]: String(maxDays),
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
