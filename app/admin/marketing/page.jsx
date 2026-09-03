"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { HorizontalBarChart, DonutChart, AreaTrendChart } from "@/components/admin/AnalyticsCharts";

export default function MarketingAdminPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copiedSlug, setCopiedSlug] = useState(null);

  // Form State
  const [name, setName] = useState("");
  const [platform, setPlatform] = useState("Instagram");
  const [source, setSource] = useState("ig_bio");
  const [medium, setMedium] = useState("social");
  const [destination, setDestination] = useState("/");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchCampaigns();
  }, []);

  async function fetchCampaigns() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/marketing");
      const json = await res.json();
      if (res.ok && json.success) {
        setData(json);
      } else {
        setError(json.error || "Failed to load marketing campaigns");
      }
    } catch (err) {
      console.error("Fetch campaigns error:", err);
      setError("An error occurred while loading campaigns.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateCampaign(e) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Campaign Name is required.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/marketing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, platform, source, medium, destination }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setName("");
        fetchCampaigns();
      } else {
        setError(json.error || "Failed to create campaign");
      }
    } catch (err) {
      console.error("Create campaign error:", err);
      setError("An error occurred while creating campaign.");
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleActive(campaign) {
    try {
      const res = await fetch("/api/admin/marketing", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: campaign.id, active: !campaign.active }),
      });
      if (res.ok) {
        fetchCampaigns();
      }
    } catch (err) {
      console.error("Toggle active error:", err);
    }
  }

  function formatMoney(amount) {
    return "₦" + Number(amount || 0).toLocaleString("en-NG");
  }

  function copyTrackingLink(slug) {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const trackingUrl = `${origin}/r/${slug}`;
    navigator.clipboard.writeText(trackingUrl);
    setCopiedSlug(slug);
    setTimeout(() => setCopiedSlug(null), 2500);
  }

  const brandTitle =
    data?.brand === "UTHY"
      ? "UTHY LUXURY"
      : data?.brand === "ALOMZIEE"
      ? "ALOMZIEE FOOTIES"
      : "Brand Marketing";

  return (
    <main className="min-h-screen bg-black text-white p-4 md:p-8 space-y-8 max-w-7xl mx-auto">
      {/* HEADER */}
      <div className="border-b border-white/10 pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link href="/admin" className="text-[10px] uppercase tracking-[0.25em] text-neutral-500 hover:text-white transition">
            ← Back to Control Center
          </Link>
          <h1 className="text-2xl md:text-3xl font-black mt-2 tracking-tight">
            {brandTitle} — Marketing & Campaign Attribution
          </h1>
          <p className="text-xs text-neutral-400 mt-1 max-w-2xl">
            Create clean shareable tracking links, manage active campaigns, and monitor Last-Touch sales conversions.
          </p>
        </div>

        <Link
          href="/admin/analytics"
          className="rounded-xl border border-white/10 bg-neutral-900 px-4 py-2 text-xs font-bold text-neutral-300 transition hover:bg-neutral-800 hover:text-white self-start sm:self-auto"
        >
          View Analytics Dashboard →
        </Link>
      </div>

      {/* ERROR DISPLAY */}
      {error && (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-red-400 text-xs">
          {error}
        </div>
      )}

      {/* CREATE CAMPAIGN FORM */}
      <div className="rounded-2xl border border-white/10 bg-neutral-950 p-6 space-y-4">
        <h2 className="text-base font-bold text-white">Create Tracking Link / Campaign</h2>

        <form onSubmit={handleCreateCampaign} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-neutral-400 mb-1">
              Campaign Name
            </label>
            <input
              type="text"
              placeholder="e.g. September Launch"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-neutral-900 px-3 py-2 text-xs text-white focus:border-amber-400 focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-[10px] uppercase tracking-wider text-neutral-400 mb-1">
              Platform
            </label>
            <select
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-neutral-900 px-3 py-2 text-xs text-white focus:border-amber-400 focus:outline-none"
            >
              <option value="Instagram">Instagram</option>
              <option value="X">X (Twitter)</option>
              <option value="Facebook">Facebook</option>
              <option value="WhatsApp">WhatsApp</option>
              <option value="TikTok">TikTok</option>
              <option value="Google">Google</option>
              <option value="Influencer">Influencer</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] uppercase tracking-wider text-neutral-400 mb-1">
              Source / Medium
            </label>
            <input
              type="text"
              placeholder="ig_bio / social"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-neutral-900 px-3 py-2 text-xs text-white focus:border-amber-400 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[10px] uppercase tracking-wider text-neutral-400 mb-1">
              Target Destination
            </label>
            <input
              type="text"
              placeholder="/ or /storefront/uthy"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-neutral-900 px-3 py-2 text-xs text-white focus:border-amber-400 focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-amber-500 py-2 px-4 text-xs font-bold text-black transition hover:bg-amber-400 disabled:opacity-50"
          >
            {submitting ? "Generating..." : "Generate Shareable Link"}
          </button>
        </form>
      </div>

      {/* VISUAL CHARTS SECTION */}
      {data?.campaigns?.length ? (
        <div className="grid lg:grid-cols-2 gap-6">
          <HorizontalBarChart
            items={data.campaigns.map((c) => ({ id: c.id, name: c.name, revenue: c.revenue, unitsSold: c.clicks, orders: c.orders }))}
            title="Campaign Revenue & Traffic Rankings Chart"
            subtitle="Comparing campaign performance by Revenue, Clicks, and Orders"
            isCurrency={true}
          />

          <DonutChart
            items={data.campaigns.map((c) => ({ name: c.name, revenue: c.revenue || c.clicks }))}
            title="Campaign Traffic & Revenue Distribution Chart"
            subtitle="Proportional campaign contribution share"
            isCurrency={data.campaigns.some((c) => c.revenue > 0)}
          />
        </div>
      ) : null}

      {/* CAMPAIGN LIST */}
      <div className="rounded-2xl border border-white/10 bg-neutral-950 p-6 space-y-4">
        <h2 className="text-base font-bold text-white">Active Brand Campaigns</h2>

        {loading ? (
          <p className="text-xs text-neutral-500 py-8 text-center animate-pulse">Loading campaign records...</p>
        ) : data?.campaigns?.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/10 text-[10px] uppercase tracking-wider text-neutral-500">
                  <th className="pb-3 font-semibold">Campaign / Platform</th>
                  <th className="pb-3 font-semibold">Clean Link</th>
                  <th className="pb-3 font-semibold">Clicks</th>
                  <th className="pb-3 font-semibold">Unique</th>
                  <th className="pb-3 font-semibold">Orders</th>
                  <th className="pb-3 font-semibold">Conv. Rate</th>
                  <th className="pb-3 font-semibold">Attributed Revenue</th>
                  <th className="pb-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {data.campaigns.map((camp) => (
                  <tr key={camp.id} className="hover:bg-white/[0.02]">
                    <td className="py-3 font-bold text-white">
                      <Link href={`/admin/marketing/${camp.id}`} className="hover:text-amber-400 transition">
                        {camp.name}
                      </Link>
                      <span className="block text-[10px] text-neutral-500 font-normal">
                        {camp.platform} • {camp.source || "direct"}
                      </span>
                    </td>

                    <td className="py-3 font-mono text-[11px] text-amber-400">
                      /r/{camp.slug}
                    </td>

                    <td className="py-3 font-semibold text-neutral-200">{camp.clicks}</td>
                    <td className="py-3 font-semibold text-neutral-200">{camp.uniqueVisitors}</td>
                    <td className="py-3 font-semibold text-emerald-400">{camp.orders}</td>
                    <td className="py-3 font-bold text-white">{camp.conversionRate}%</td>
                    <td className="py-3 font-black text-amber-400">{formatMoney(camp.revenue)}</td>

                    <td className="py-3 text-right space-x-2">
                      <button
                        type="button"
                        onClick={() => copyTrackingLink(camp.slug)}
                        className="px-2.5 py-1 rounded-lg border border-white/10 bg-neutral-900 text-[10px] font-bold text-neutral-300 hover:text-white transition"
                      >
                        {copiedSlug === camp.slug ? "Copied! ✓" : "Copy Link"}
                      </button>

                      <button
                        type="button"
                        onClick={() => toggleActive(camp)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition ${
                          camp.active
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : "bg-red-500/10 text-red-400 border border-red-500/20"
                        }`}
                      >
                        {camp.active ? "Active" : "Inactive"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-xs text-neutral-500 py-8 text-center">No campaign tracking links created yet.</p>
        )}
      </div>
    </main>
  );
}
