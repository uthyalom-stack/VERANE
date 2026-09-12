"use client";

import { useEffect, useState } from "react";

export default function HomeDeliverySettingsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      setLoading(true);
      setError("");
      const res = await fetch("/api/admin/delivery", {
        cache: "no-store",
        credentials: "include",
      });
      const resData = await res.json();
      if (res.ok && resData.success) {
        setData(resData);
      } else {
        setError(resData.error || "Delivery settings are restricted to store administrators.");
      }
    } catch (err) {
      console.error(err);
      setError("Failed to load Delivery configuration.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(payload) {
    setSaving(true);
    setMsg("");
    setError("");
    try {
      const res = await fetch("/api/admin/delivery", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const resData = await res.json();
      if (res.ok && resData.success) {
        setMsg("Delivery configuration saved successfully!");
        fetchData();
      } else {
        setError(resData.error || "Failed to update Delivery configuration.");
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
        <p className="text-xs font-mono text-neutral-500 animate-pulse">Loading Delivery configuration...</p>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="min-h-screen bg-black text-white p-10">
        <div className="max-w-xl mx-auto p-6 rounded-2xl border border-red-500/20 bg-red-500/10 text-red-300 text-sm font-bold">
          {error || "Unable to load Delivery settings. Store admin session required."}
        </div>
      </main>
    );
  }

  const role = data.role;
  const brandName = role === "UTHY" ? "UTHY LUXURY" : "ALOMZIEE FOOTIES";
  const prefix = role === "UTHY" ? "uthy" : "alomziee";

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <header className="mb-10">
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-amber-400">Logistics & Dispatch</p>
          <h1 className="mt-2 text-3xl font-black">{brandName} Delivery</h1>
          <p className="mt-2 text-sm text-neutral-400">
            Configure the physical dispatch origin address and delivery status for {brandName}.
          </p>
        </header>

        {msg && <div className="mb-6 p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-xs text-emerald-300 font-bold">{msg}</div>}
        {error && <div className="mb-6 p-4 rounded-xl border border-red-500/20 bg-red-500/10 text-xs text-red-300 font-bold">{error}</div>}

        <HomeDeliveryForm
          brandName={brandName}
          prefix={prefix}
          initialName={data.originName}
          initialEmail={data.originEmail}
          initialPhone={data.originPhone}
          initialCountry={data.originCountry}
          initialState={data.originState}
          initialCity={data.originCity}
          initialStreet={data.originStreet}
          onSave={handleSave}
          saving={saving}
        />
      </div>
    </main>
  );
}

function HomeDeliveryForm({
  brandName,
  prefix,
  initialName,
  initialEmail,
  initialPhone,
  initialCountry,
  initialState,
  initialCity,
  initialStreet,
  onSave,
  saving,
}) {
  const [name, setName] = useState(initialName || "");
  const [email, setEmail] = useState(initialEmail || "");
  const [phone, setPhone] = useState(initialPhone || "");
  const [country, setCountry] = useState(initialCountry || "Nigeria");
  const [state, setState] = useState(initialState || "");
  const [city, setCity] = useState(initialCity || "");
  const [street, setStreet] = useState(initialStreet || "");

  const inputClass = "w-full rounded-xl border border-white/10 bg-neutral-900 px-4 py-3 text-sm text-white outline-none focus:border-amber-400/50";

  return (
    <div className="space-y-6 rounded-3xl border border-white/10 bg-white/[0.02] p-6 sm:p-8">

      {/* DISPATCH ORIGIN ADDRESS */}
      <div>
        <h3 className="text-base font-black text-amber-400 mb-1">Physical Dispatch Origin</h3>
        <p className="text-xs text-neutral-500 mb-5">The physical origin address used to quote live Shipbubble courier rates and generate waybill labels.</p>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-bold text-white mb-1">Business / Store Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder={`${brandName} Atelier`} className={inputClass} />
          </div>

          <div>
            <label className="block text-xs font-bold text-white mb-1">Dispatch Phone Number</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+234..." className={inputClass} />
          </div>

          <div>
            <label className="block text-xs font-bold text-white mb-1">Dispatch Email Address</label>
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="orders@verane.com" className={inputClass} />
          </div>

          <div>
            <label className="block text-xs font-bold text-white mb-1">Country</label>
            <input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="Nigeria" className={inputClass} />
          </div>

          <div>
            <label className="block text-xs font-bold text-white mb-1">State</label>
            <input value={state} onChange={(e) => setState(e.target.value)} placeholder="Lagos" className={inputClass} />
          </div>

          <div>
            <label className="block text-xs font-bold text-white mb-1">City</label>
            <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Victoria Island" className={inputClass} />
          </div>
        </div>

        <div className="mt-5">
          <label className="block text-xs font-bold text-white mb-1">Complete Physical Street Address</label>
          <textarea value={street} onChange={(e) => setStreet(e.target.value)} rows={2} placeholder="Physical street address for courier pickup..." className={`${inputClass} resize-none`} />
        </div>
      </div>

      <button
        type="button"
        disabled={saving}
        onClick={() =>
          onSave({
            [`${prefix}ShipbubbleOriginName`]: name,
            [`${prefix}ShipbubbleOriginEmail`]: email,
            [`${prefix}ShipbubbleOriginPhone`]: phone,
            [`${prefix}ShipbubbleOriginCountry`]: country,
            [`${prefix}ShipbubbleOriginState`]: state,
            [`${prefix}ShipbubbleOriginCity`]: city,
            [`${prefix}ShipbubbleOriginStreet`]: street,
          })
        }
        className="bg-amber-400 text-black px-6 py-3 rounded-full text-xs font-black uppercase hover:bg-amber-300 transition disabled:opacity-50"
      >
        {saving ? "Saving..." : `Save ${brandName} Delivery Settings`}
      </button>
    </div>
  );
}
