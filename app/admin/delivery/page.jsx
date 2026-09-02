"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { NIGERIA_LOCATIONS, NIGERIAN_STATES } from "@/lib/nigeria-locations";

export default function AdminDeliveryPage() {
  const [mainTab, setMainTab] = useState("nigeria"); // "nigeria" | "international"
  const [states, setStates] = useState([]);
  const [internationalLocations, setInternationalLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingState, setSavingState] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Search & Active State Selection
  const [stateSearch, setStateSearch] = useState("");
  const [selectedStateName, setSelectedStateName] = useState("");

  // Active State Edit State
  const [activeStateData, setActiveStateData] = useState({
    state: "",
    pricingMode: "STATE_DEFAULT", // "STATE_DEFAULT" | "CITY_SPECIFIC"
    defaultFee: 0,
    cities: [],
  });

  const [citySearch, setCitySearch] = useState("");
  const [bulkCityFee, setBulkCityFee] = useState("");

  // International Form State
  const [intlForm, setIntlForm] = useState({
    country: "",
    state: "*",
    city: "*",
    zone: "",
    fee: "",
  });
  const [savingIntl, setSavingIntl] = useState(false);

  useEffect(() => {
    fetchDeliveryData();
  }, []);

  async function fetchDeliveryData() {
    try {
      setLoading(true);
      setErrorMessage("");
      const res = await fetch("/api/admin/delivery", { cache: "no-store" });
      const data = await res.json();

      if (res.ok && data.success) {
        setStates(data.states || []);
        setInternationalLocations(data.internationalLocations || []);
      } else {
        setErrorMessage(data.error || "Failed to load delivery configuration.");
      }
    } catch (error) {
      console.error("Failed to load delivery locations:", error);
      setErrorMessage("An error occurred while connecting to delivery API.");
    } finally {
      setLoading(false);
    }
  }

  function handleSelectState(stateName) {
    if (!stateName) {
      setSelectedStateName("");
      setActiveStateData({
        state: "",
        pricingMode: "STATE_DEFAULT",
        defaultFee: 0,
        cities: [],
      });
      return;
    }

    const officialLgas = NIGERIA_LOCATIONS[stateName] || [];
    const foundState = states.find((s) => s.state === stateName);

    const savedCitiesMap = new Map(
      (foundState?.cities || []).map((c) => [c.city, c])
    );

    const cities = officialLgas.map((cityName) => {
      const savedCity = savedCitiesMap.get(cityName);
      return {
        city: cityName,
        fee: savedCity ? Number(savedCity.fee || 0) : 0,
        enabled: savedCity ? savedCity.enabled !== false : true,
      };
    });

    setSelectedStateName(stateName);
    setActiveStateData({
      state: stateName,
      pricingMode: foundState?.pricingMode || "STATE_DEFAULT",
      defaultFee: foundState ? Number(foundState.defaultFee || 0) : 0,
      cities,
    });

    setCitySearch("");
    setSavedSuccess(false);
    setErrorMessage("");
  }

  function updateCityFee(cityName, newFee) {
    const val = Number(newFee);
    setActiveStateData((prev) => ({
      ...prev,
      cities: prev.cities.map((c) =>
        c.city === cityName ? { ...c, fee: isNaN(val) ? 0 : val } : c
      ),
    }));
  }

  function applyBulkCityFee() {
    const val = Number(bulkCityFee);
    if (isNaN(val) || val < 0) return;
    setActiveStateData((prev) => ({
      ...prev,
      cities: prev.cities.map((c) => ({ ...c, fee: val })),
    }));
    setBulkCityFee("");
  }

  async function handleSaveStateConfig(e) {
    if (e) e.preventDefault();
    if (!activeStateData.state) {
      alert("Please select a Nigerian state first.");
      return;
    }

    setSavingState(true);
    setSavedSuccess(false);
    setErrorMessage("");

    try {
      const res = await fetch("/api/admin/delivery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save_state",
          state: activeStateData.state,
          pricingMode: activeStateData.pricingMode,
          defaultFee: Number(activeStateData.defaultFee || 0),
          cities: activeStateData.cities,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSavedSuccess(true);
        await fetchDeliveryData();
        setTimeout(() => setSavedSuccess(false), 3000);
      } else {
        const err = data.error || "Failed to save state delivery settings.";
        setErrorMessage(err);
        alert(`Save failed: ${err}`);
      }
    } catch (error) {
      console.error("Save state delivery error:", error);
      const err = "An error occurred while saving delivery settings.";
      setErrorMessage(err);
      alert(err);
    } finally {
      setSavingState(false);
    }
  }

  async function handleAddInternational(e) {
    e.preventDefault();
    if (!intlForm.country || !intlForm.fee) return;

    setSavingIntl(true);
    try {
      const res = await fetch("/api/admin/delivery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save_international",
          country: intlForm.country,
          state: intlForm.state || "*",
          city: intlForm.city || "*",
          zone: intlForm.zone || null,
          fee: Number(intlForm.fee || 0),
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setIntlForm({ country: "", state: "*", city: "*", zone: "", fee: "" });
        fetchDeliveryData();
      } else {
        alert(data.error || "Failed to add international delivery rate.");
      }
    } catch (error) {
      console.error("Add international rate error:", error);
    } finally {
      setSavingIntl(false);
    }
  }

  async function handleDeleteInternational(id) {
    if (!confirm("Are you sure you want to delete this international delivery rate?")) return;

    try {
      const res = await fetch(`/api/admin/delivery?id=${id}&type=international`, {
        method: "DELETE",
      });
      if (res.ok) {
        fetchDeliveryData();
      }
    } catch (error) {
      console.error("Delete rate error:", error);
    }
  }

  const filteredStatesList = NIGERIAN_STATES.filter((s) =>
    s.toLowerCase().includes(stateSearch.toLowerCase())
  );

  const filteredCities = activeStateData.cities.filter((c) =>
    c.city.toLowerCase().includes(citySearch.toLowerCase())
  );

  return (
    <main className="min-h-screen bg-black text-white p-6 md:p-12">
      <div className="max-w-7xl mx-auto">
        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-white/10 pb-6 gap-4">
          <div>
            <Link href="/admin" className="text-xs uppercase tracking-widest text-neutral-500 hover:text-white transition">
              ← Back to Admin Control Center
            </Link>
            <h1 className="text-3xl font-black mt-2">Delivery & Logistics</h1>
            <p className="text-xs text-neutral-400 mt-1">SUPERADMIN: Configure location-based shipping pricing for Nigeria and International destinations.</p>
          </div>

          {/* MAIN TABS */}
          <div className="flex items-center gap-2 bg-neutral-900 p-1.5 rounded-2xl border border-white/10">
            <button
              type="button"
              onClick={() => { setMainTab("nigeria"); setSelectedStateName(""); }}
              className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition ${
                mainTab === "nigeria" ? "bg-amber-500 text-black shadow-lg" : "text-neutral-400 hover:text-white"
              }`}
            >
              🇳🇬 Nigeria ({NIGERIAN_STATES.length})
            </button>
            <button
              type="button"
              onClick={() => { setMainTab("international"); setSelectedStateName(""); }}
              className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition ${
                mainTab === "international" ? "bg-amber-500 text-black shadow-lg" : "text-neutral-400 hover:text-white"
              }`}
            >
              🌐 International ({internationalLocations.length})
            </button>
          </div>
        </div>

        {errorMessage && (
          <div className="mt-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold">
            ⚠️ {errorMessage}
          </div>
        )}

        {/* LOADING STATE */}
        {loading ? (
          <div className="py-20 text-center text-xs text-neutral-500 uppercase tracking-widest animate-pulse">
            Loading delivery configuration...
          </div>
        ) : mainTab === "nigeria" ? (
          /* =========================================================================
             NIGERIA SECTION
             ========================================================================= */
          <section className="mt-8 space-y-8">
            {/* STATE SELECTOR CONTROL */}
            <div className="bg-neutral-950 p-6 md:p-8 rounded-3xl border border-white/10 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold">Select Nigerian State / Territory</h2>
                  <p className="text-xs text-neutral-400 mt-1">
                    Choose a state to configure State Default Pricing (Mode A) or LGA Specific Pricing (Mode B).
                  </p>
                </div>

                <div className="w-full sm:w-80">
                  <select
                    value={selectedStateName}
                    onChange={(e) => handleSelectState(e.target.value)}
                    className="w-full rounded-2xl border border-amber-500/40 bg-black px-4 py-3.5 text-sm font-bold text-amber-400 outline-none focus:border-amber-400 shadow-lg"
                  >
                    <option value="">-- Choose a State (36 States + FCT) --</option>
                    {NIGERIAN_STATES.map((stName) => {
                      const savedSt = states.find((s) => s.state === stName);
                      const modeBadge = savedSt?.pricingMode === "CITY_SPECIFIC" ? " [Mode B: LGA]" : " [Mode A: Default]";
                      return (
                        <option key={stName} value={stName} className="bg-neutral-900 text-white">
                          {stName} {savedSt ? modeBadge : ""}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>
            </div>

            {selectedStateName ? (
              /* INDIVIDUAL STATE EDIT VIEW */
              <div className="space-y-6">
                {/* STATE HEADER */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-neutral-950 p-6 rounded-3xl border border-white/10">
                  <div className="flex items-center gap-4">
                    <button
                      type="button"
                      onClick={() => handleSelectState("")}
                      className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-bold hover:bg-white/10 transition"
                    >
                      ← Back to Overview
                    </button>
                    <div>
                      <h2 className="text-2xl font-black">{activeStateData.state} State Delivery Configuration</h2>
                      <p className="text-xs text-neutral-400 mt-0.5">
                        {activeStateData.cities.length} official Local Government Areas (LGAs)
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {savedSuccess && (
                      <span className="text-xs text-emerald-400 font-bold animate-fade-in">
                        Saved successfully ✓
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={handleSaveStateConfig}
                      disabled={savingState}
                      className="px-8 py-3 rounded-full bg-amber-500 text-black text-xs font-black uppercase tracking-wider hover:bg-amber-400 transition disabled:opacity-50"
                    >
                      {savingState ? "Saving..." : "Save Configuration"}
                    </button>
                  </div>
                </div>

                {/* PRICING MODE CONFIGURATION */}
                <div className="grid md:grid-cols-2 gap-6 bg-neutral-950 p-6 md:p-8 rounded-3xl border border-white/10">
                  {/* MODE SELECTION */}
                  <div className="space-y-3">
                    <label className="block text-xs font-bold uppercase tracking-wider text-amber-400">
                      1. Select Pricing Mode
                    </label>

                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setActiveStateData((prev) => ({ ...prev, pricingMode: "STATE_DEFAULT" }))}
                        className={`p-4 rounded-2xl border text-left transition ${
                          activeStateData.pricingMode === "STATE_DEFAULT"
                            ? "border-amber-400 bg-amber-400/10 text-white"
                            : "border-white/10 bg-black text-neutral-400 hover:border-white/20"
                        }`}
                      >
                        <span className="block text-xs font-black uppercase tracking-wider">MODE A</span>
                        <span className="block text-sm font-bold text-amber-400 mt-1">State Default Pricing</span>
                        <span className="block text-[11px] text-neutral-400 mt-1 leading-relaxed">
                          One flat shipping price applies to all LGAs in {activeStateData.state}.
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setActiveStateData((prev) => ({ ...prev, pricingMode: "CITY_SPECIFIC" }))}
                        className={`p-4 rounded-2xl border text-left transition ${
                          activeStateData.pricingMode === "CITY_SPECIFIC"
                            ? "border-purple-400 bg-purple-400/10 text-white"
                            : "border-white/10 bg-black text-neutral-400 hover:border-white/20"
                        }`}
                      >
                        <span className="block text-xs font-black uppercase tracking-wider">MODE B</span>
                        <span className="block text-sm font-bold text-purple-400 mt-1">City / LGA Pricing</span>
                        <span className="block text-[11px] text-neutral-400 mt-1 leading-relaxed">
                          Set specific shipping prices for individual LGAs.
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* DEFAULT STATE FEE INPUT */}
                  <div className="space-y-3">
                    <label className="block text-xs font-bold uppercase tracking-wider text-amber-400">
                      2. State Default Fee (₦)
                    </label>

                    <div className="bg-black p-5 rounded-2xl border border-white/10 space-y-2">
                      <p className="text-xs text-neutral-400">
                        {activeStateData.pricingMode === "STATE_DEFAULT"
                          ? `This fee (₦${Number(activeStateData.defaultFee || 0).toLocaleString()}) will be charged for all orders delivered anywhere in ${activeStateData.state}.`
                          : `Used as a fallback for any LGA in ${activeStateData.state} that doesn't have an explicit price.`}
                      </p>

                      <div className="relative mt-2">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-neutral-500 font-bold">₦</span>
                        <input
                          type="number"
                          min="0"
                          value={activeStateData.defaultFee}
                          onChange={(e) => setActiveStateData({ ...activeStateData, defaultFee: e.target.value })}
                          placeholder="e.g. 5000"
                          className="w-full rounded-xl border border-white/10 bg-neutral-950 pl-9 pr-4 py-3 text-sm font-bold outline-none focus:border-amber-400"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* LGA / CITIES LIST MANAGEMENT */}
                <div className="bg-neutral-950 p-6 md:p-8 rounded-3xl border border-white/10 space-y-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-5">
                    <div>
                      <h3 className="text-lg font-bold">Official LGAs for {activeStateData.state} ({activeStateData.cities.length})</h3>
                      <p className="text-xs text-neutral-400 mt-0.5">
                        {activeStateData.pricingMode === "STATE_DEFAULT"
                          ? "State Default Pricing is currently active. Individual LGA prices below will be saved and used if you switch to Mode B."
                          : "City/LGA Pricing is active. Customers selecting these specific LGAs will be charged the exact prices configured below."}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      <input
                        type="text"
                        placeholder="Filter LGAs..."
                        value={citySearch}
                        onChange={(e) => setCitySearch(e.target.value)}
                        className="rounded-xl border border-white/10 bg-black px-4 py-2 text-xs outline-none focus:border-amber-400"
                      />

                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          placeholder="Bulk Fee (₦)"
                          value={bulkCityFee}
                          onChange={(e) => setBulkCityFee(e.target.value)}
                          className="w-28 rounded-xl border border-white/10 bg-black px-3 py-2 text-xs outline-none focus:border-amber-400"
                        />
                        <button
                          type="button"
                          onClick={applyBulkCityFee}
                          className="px-3 py-2 rounded-xl bg-white/10 text-xs font-bold hover:bg-white/20 transition"
                        >
                          Apply to All
                        </button>
                      </div>
                    </div>
                  </div>

                  {activeStateData.pricingMode === "STATE_DEFAULT" && (
                    <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-2xl text-xs text-amber-300 flex items-center justify-between">
                      <span>
                        ℹ️ <strong>MODE A ACTIVE:</strong> Customers will be charged <strong>₦{Number(activeStateData.defaultFee || 0).toLocaleString()}</strong> default state fee regardless of LGA selection.
                      </span>
                      <button
                        type="button"
                        onClick={() => setActiveStateData((prev) => ({ ...prev, pricingMode: "CITY_SPECIFIC" }))}
                        className="underline font-bold text-amber-200 hover:text-white"
                      >
                        Switch to Mode B
                      </button>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 max-h-[600px] overflow-y-auto pr-2">
                    {filteredCities.map((c) => (
                      <div
                        key={c.city}
                        className={`p-3.5 rounded-2xl border transition ${
                          Number(c.fee) > 0 && activeStateData.pricingMode === "CITY_SPECIFIC"
                            ? "border-purple-500/30 bg-purple-500/5"
                            : "border-white/5 bg-black"
                        }`}
                      >
                        <span className="block text-xs font-bold text-neutral-300 truncate">{c.city}</span>
                        <div className="relative mt-2">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-neutral-500">₦</span>
                          <input
                            type="number"
                            min="0"
                            value={c.fee}
                            onChange={(e) => updateCityFee(c.city, e.target.value)}
                            className="w-full rounded-xl border border-white/10 bg-neutral-950 pl-7 pr-3 py-2 text-xs font-bold outline-none focus:border-purple-400"
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="pt-4 border-t border-white/10 flex justify-end">
                    <button
                      type="button"
                      onClick={handleSaveStateConfig}
                      disabled={savingState}
                      className="px-8 py-3 rounded-full bg-amber-500 text-black text-xs font-black uppercase tracking-wider hover:bg-amber-400 transition disabled:opacity-50"
                    >
                      {savingState ? "Saving..." : "Save Configuration"}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* ALL STATES OVERVIEW GRID */
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-neutral-950 p-6 rounded-3xl border border-white/10">
                  <div>
                    <h2 className="text-xl font-bold">All 36 Nigerian States & FCT</h2>
                    <p className="text-xs text-neutral-400 mt-1">Click any state card or select from the dropdown above to manage shipping rates.</p>
                  </div>

                  <input
                    type="text"
                    placeholder="Search state..."
                    value={stateSearch}
                    onChange={(e) => setStateSearch(e.target.value)}
                    className="w-full sm:w-64 rounded-xl border border-white/10 bg-black px-4 py-3 text-xs outline-none focus:border-amber-400"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredStatesList.map((stName) => {
                    const st = states.find((s) => s.state === stName);
                    const isCitySpecific = st?.pricingMode === "CITY_SPECIFIC";
                    const lgas = NIGERIA_LOCATIONS[stName] || [];
                    const configuredCitiesCount = (st?.cities || []).filter((c) => Number(c.fee) > 0).length;

                    return (
                      <div
                        key={stName}
                        onClick={() => handleSelectState(stName)}
                        className="group cursor-pointer rounded-2xl border border-white/10 bg-neutral-950 p-5 hover:border-amber-400/50 hover:bg-white/[0.02] transition flex flex-col justify-between space-y-4"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="text-lg font-bold group-hover:text-amber-400 transition">{stName}</h3>
                            <span className="text-[10px] uppercase font-bold text-neutral-500 tracking-wider">
                              {lgas.length} LGAs
                            </span>
                          </div>

                          <span
                            className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${
                              isCitySpecific
                                ? "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                                : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                            }`}
                          >
                            {isCitySpecific ? "LGA Pricing" : "State Default"}
                          </span>
                        </div>

                        <div className="border-t border-white/5 pt-3 flex items-center justify-between text-xs">
                          <div>
                            <span className="text-neutral-500 text-[10px] block uppercase">Default Fee</span>
                            <span className="font-bold text-amber-400">₦{Number(st?.defaultFee || 0).toLocaleString()}</span>
                          </div>

                          {isCitySpecific && (
                            <div className="text-right">
                              <span className="text-neutral-500 text-[10px] block uppercase">Custom LGAs</span>
                              <span className="font-bold text-purple-300">{configuredCitiesCount} configured</span>
                            </div>
                          )}

                          <button type="button" className="text-xs font-bold text-neutral-400 group-hover:text-amber-400 transition">
                            Configure →
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </section>
        ) : (
          /* =========================================================================
             INTERNATIONAL SECTION
             ========================================================================= */
          <section className="mt-8 space-y-8">
            <div className="rounded-3xl border border-white/10 bg-neutral-950 p-6 md:p-8">
              <h2 className="text-xl font-bold">Add International Delivery Location</h2>
              <p className="text-xs text-neutral-400 mt-1">Configure flat or region-specific shipping rates for international destinations.</p>

              <form onSubmit={handleAddInternational} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 mt-6">
                <input
                  type="text"
                  placeholder="Country (e.g. Ghana, USA, UK)"
                  value={intlForm.country}
                  onChange={(e) => setIntlForm({ ...intlForm, country: e.target.value })}
                  className="rounded-xl border border-white/10 bg-black px-4 py-3 text-xs outline-none focus:border-amber-400"
                  required
                />
                <input
                  type="text"
                  placeholder="State/Region (e.g. * or Greater Accra)"
                  value={intlForm.state}
                  onChange={(e) => setIntlForm({ ...intlForm, state: e.target.value })}
                  className="rounded-xl border border-white/10 bg-black px-4 py-3 text-xs outline-none focus:border-amber-400"
                />
                <input
                  type="text"
                  placeholder="City (e.g. * or Accra)"
                  value={intlForm.city}
                  onChange={(e) => setIntlForm({ ...intlForm, city: e.target.value })}
                  className="rounded-xl border border-white/10 bg-black px-4 py-3 text-xs outline-none focus:border-amber-400"
                />
                <input
                  type="text"
                  placeholder="Zone (Optional)"
                  value={intlForm.zone}
                  onChange={(e) => setIntlForm({ ...intlForm, zone: e.target.value })}
                  className="rounded-xl border border-white/10 bg-black px-4 py-3 text-xs outline-none focus:border-amber-400"
                />
                <input
                  type="number"
                  placeholder="Delivery Fee (₦)"
                  value={intlForm.fee}
                  onChange={(e) => setIntlForm({ ...intlForm, fee: e.target.value })}
                  className="rounded-xl border border-white/10 bg-black px-4 py-3 text-xs outline-none focus:border-amber-400"
                  required
                />

                <button
                  type="submit"
                  disabled={savingIntl}
                  className="col-span-1 sm:col-span-2 md:col-span-5 rounded-full bg-amber-500 py-3.5 text-xs font-black uppercase text-black hover:bg-amber-400 transition"
                >
                  {savingIntl ? "Saving..." : "Save International Rate"}
                </button>
              </form>
            </div>

            <div className="rounded-3xl border border-white/10 bg-neutral-950 p-6 md:p-8">
              <h2 className="text-xl font-bold mb-4">Configured International Shipping Rates</h2>

              {internationalLocations.length === 0 ? (
                <p className="text-xs text-neutral-500">No custom international location rates added yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-neutral-300">
                    <thead className="border-b border-white/10 uppercase tracking-wider text-neutral-500 text-[10px]">
                      <tr>
                        <th className="py-3 px-4">Country</th>
                        <th className="py-3 px-4">State/Region</th>
                        <th className="py-3 px-4">City</th>
                        <th className="py-3 px-4">Zone</th>
                        <th className="py-3 px-4">Delivery Fee</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {internationalLocations.map((loc) => (
                        <tr key={loc.id} className="hover:bg-white/[0.02]">
                          <td className="py-3.5 px-4 font-bold">{loc.country}</td>
                          <td className="py-3.5 px-4">{loc.state}</td>
                          <td className="py-3.5 px-4">{loc.city}</td>
                          <td className="py-3.5 px-4 text-neutral-500">{loc.zone || "—"}</td>
                          <td className="py-3.5 px-4 font-black text-amber-400">₦{Number(loc.fee).toLocaleString()}</td>
                          <td className="py-3.5 px-4 text-right">
                            <button
                              onClick={() => handleDeleteInternational(loc.id)}
                              className="text-red-400 hover:text-red-300 font-bold"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
