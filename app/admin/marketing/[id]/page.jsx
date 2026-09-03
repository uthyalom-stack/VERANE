"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { AreaTrendChart, VerticalColumnChart, DonutChart } from "@/components/admin/AnalyticsCharts";

export default function CampaignDetailPage({ params }) {
  const resolvedParams = use(params);
  const campaignId = resolvedParams.id;

  const [campaign, setCampaign] = useState(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState("30d");
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchCampaignDetail();
  }, [campaignId, range]);

  async function fetchCampaignDetail() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/marketing?id=${campaignId}&range=${range}`);
      const json = await res.json();
      if (res.ok && json.success) {
        const found = (json.campaigns || []).find((c) => c.id === campaignId) || json.campaign;
        if (found) {
          setCampaign(found);
        } else {
          setError("Campaign not found.");
        }
      } else {
        setError(json.error || "Failed to load campaign details");
      }
    } catch (err) {
      console.error("Fetch campaign detail error:", err);
      setError("An error occurred while loading campaign details.");
    } finally {
      setLoading(false);
    }
  }

  function formatMoney(amount) {
    return "₦" + Number(amount || 0).toLocaleString("en-NG");
  }

  function copyTrackingLink() {
    if (!campaign?.slug) return;
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const trackingUrl = `${origin}/r/${campaign.slug}`;
    navigator.clipboard.writeText(trackingUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  const conversionSlices = [
    { name: "Converted Orders", revenue: campaign?.orders || 0 },
    { name: "Non-converting Visits", revenue: Math.max((campaign?.uniqueVisitors || 0) - (campaign?.orders || 0), 0) },
  ];

  return (
    <main className="min-h-screen bg-black text-white p-4 md:p-8 space-y-8 max-w-7xl mx-auto">
      {/* HEADER */}
      <div className="border-b border-white/10 pb-6 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <Link href="/admin/marketing" className="text-[10px] uppercase tracking-[0.25em] text-neutral-500 hover:text-white transition">
            ← Back to Marketing Campaigns
          </Link>
          <h1 className="text-2xl md:text-3xl font-black mt-2 tracking-tight">
            Campaign: {campaign?.name || "Loading..."}
          </h1>
          <p className="text-xs text-neutral-400 mt-1">
            Platform: <strong className="text-white">{campaign?.platform}</strong> • Source: <strong className="text-white">{campaign?.source || "direct"}</strong> • Target: <strong className="text-amber-400">{campaign?.destination}</strong>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={copyTrackingLink}
            className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-2 text-xs font-bold text-amber-400 transition hover:bg-amber-500 hover:text-black"
          >
            {copied ? "Link Copied! ✓" : `Copy Link (/r/${campaign?.slug || ""})`}
          </button>

          <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-neutral-950 p-1">
            {["today", "7d", "30d", "90d", "1y"].map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRange(r)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition ${
                  range === r ? "bg-amber-500 text-black" : "text-neutral-400 hover:text-white"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ERROR / LOADING */}
      {error ? (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-6 text-red-400 text-xs">
          {error}
        </div>
      ) : loading ? (
        <div className="py-20 text-center">
          <p className="text-[10px] uppercase tracking-[0.3em] text-amber-400 animate-pulse">
            VÉRANE CAMPAIGN ANALYTICS
          </p>
          <p className="text-xs text-neutral-500 mt-2">Loading campaign traffic & conversion data...</p>
        </div>
      ) : campaign ? (
        <>
          {/* KPIS */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="rounded-2xl border border-white/10 bg-neutral-950 p-5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-amber-400">Total Link Clicks</p>
              <p className="text-2xl font-black mt-2">{campaign.clicks}</p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-neutral-950 p-5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-amber-400">Unique Visitors</p>
              <p className="text-2xl font-black mt-2">{campaign.uniqueVisitors}</p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-neutral-950 p-5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-amber-400">Attributed Orders</p>
              <p className="text-2xl font-black mt-2 text-emerald-400">{campaign.orders}</p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-neutral-950 p-5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-amber-400">Conversion Rate</p>
              <p className="text-2xl font-black mt-2 text-white">{campaign.conversionRate}%</p>
            </div>

            <div className="col-span-2 sm:col-span-1 rounded-2xl border border-white/10 bg-neutral-950 p-5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-amber-400">Attributed Revenue</p>
              <p className="text-2xl font-black mt-2 text-amber-400">{formatMoney(campaign.revenue)}</p>
            </div>
          </div>

          {/* VISUAL CHARTS */}
          <div className="grid lg:grid-cols-2 gap-6">
            <DonutChart
              items={conversionSlices}
              title="Campaign Traffic Conversion Share"
              subtitle="Converted order sessions vs non-converting link clicks"
              isCurrency={false}
            />

            <div className="rounded-2xl border border-white/10 bg-neutral-950 p-6 space-y-4">
              <h3 className="text-base font-bold text-white">Campaign Information</h3>
              <div className="space-y-3 text-xs">
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <span className="text-neutral-400">Tracking Slug:</span>
                  <span className="font-mono text-amber-400">/r/{campaign.slug}</span>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <span className="text-neutral-400">Platform / Channel:</span>
                  <span className="font-bold text-white">{campaign.platform}</span>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <span className="text-neutral-400">Source:</span>
                  <span className="text-neutral-300">{campaign.source || "None"}</span>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <span className="text-neutral-400">Medium:</span>
                  <span className="text-neutral-300">{campaign.medium || "None"}</span>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <span className="text-neutral-400">Destination:</span>
                  <span className="text-amber-400 font-semibold">{campaign.destination}</span>
                </div>
                <div className="flex justify-between pb-1">
                  <span className="text-neutral-400">Campaign Status:</span>
                  <span className={`font-bold ${campaign.active ? "text-emerald-400" : "text-red-400"}`}>
                    {campaign.active ? "Active" : "Inactive"}
                  </span>
                </div>
              </div>
            </div>
          </div>

        </>
      ) : null}
    </main>
  );
}
