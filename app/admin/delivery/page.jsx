"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function AdminDeliveryPage() {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    country: "Nigeria",
    state: "",
    city: "",
    zone: "",
    fee: "",
  });

  useEffect(() => {
    fetchLocations();
  }, []);

  async function fetchLocations() {
    try {
      const res = await fetch("/api/admin/delivery");
      const data = await res.json();
      if (data.success) {
        setLocations(data.locations || []);
      }
    } catch (error) {
      console.error("Failed to load delivery locations:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.country || !form.state || !form.city) return;

    setSaving(true);
    try {
      const res = await fetch("/api/admin/delivery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          country: form.country,
          state: form.state,
          city: form.city,
          zone: form.zone,
          fee: Number(form.fee || 0),
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setForm({ country: "Nigeria", state: "", city: "", zone: "", fee: "" });
        fetchLocations();
      } else {
        alert(data.error || "Failed to add delivery rate.");
      }
    } catch (error) {
      console.error("Add rate error:", error);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!confirm("Are you sure you want to delete this delivery location?")) return;

    try {
      const res = await fetch(`/api/admin/delivery?id=${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        fetchLocations();
      }
    } catch (error) {
      console.error("Delete rate error:", error);
    }
  }

  return (
    <main className="min-h-screen bg-black text-white p-6 md:p-12">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between border-b border-white/10 pb-6">
          <div>
            <Link href="/admin" className="text-xs uppercase tracking-widest text-neutral-500 hover:text-white">
              ← Back to Admin
            </Link>
            <h1 className="text-3xl font-black mt-2">Delivery & Location Management</h1>
            <p className="text-xs text-neutral-400 mt-1">SUPERADMIN: Configure regional, city, and zone delivery rates.</p>
          </div>
        </div>

        {/* ADD LOCATION FORM */}
        <section className="mt-8 rounded-2xl border border-white/10 bg-neutral-950 p-6">
          <h2 className="text-lg font-bold">Add Delivery Rate</h2>

          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 mt-4">
            <input
              type="text"
              placeholder="Country (e.g. Nigeria)"
              value={form.country}
              onChange={(e) => setForm({ ...form, country: e.target.value })}
              className="rounded-xl border border-white/10 bg-black px-4 py-3 text-xs outline-none focus:border-amber-400"
              required
            />
            <input
              type="text"
              placeholder="State/Region (e.g. Lagos)"
              value={form.state}
              onChange={(e) => setForm({ ...form, state: e.target.value })}
              className="rounded-xl border border-white/10 bg-black px-4 py-3 text-xs outline-none focus:border-amber-400"
              required
            />
            <input
              type="text"
              placeholder="City (e.g. Ikeja)"
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
              className="rounded-xl border border-white/10 bg-black px-4 py-3 text-xs outline-none focus:border-amber-400"
              required
            />
            <input
              type="text"
              placeholder="Zone / Neighborhood (Optional)"
              value={form.zone}
              onChange={(e) => setForm({ ...form, zone: e.target.value })}
              className="rounded-xl border border-white/10 bg-black px-4 py-3 text-xs outline-none focus:border-amber-400"
            />
            <input
              type="number"
              placeholder="Delivery Fee (₦)"
              value={form.fee}
              onChange={(e) => setForm({ ...form, fee: e.target.value })}
              className="rounded-xl border border-white/10 bg-black px-4 py-3 text-xs outline-none focus:border-amber-400"
              required
            />

            <button
              type="submit"
              disabled={saving}
              className="col-span-1 sm:col-span-2 md:col-span-5 rounded-full bg-amber-500 py-3.5 text-xs font-black uppercase text-black hover:bg-amber-400 transition"
            >
              {saving ? "Saving..." : "Save Delivery Location"}
            </button>
          </form>
        </section>

        {/* LOCATIONS LIST */}
        <section className="mt-8 rounded-2xl border border-white/10 bg-neutral-950 p-6">
          <h2 className="text-lg font-bold mb-4">Configured Delivery Rates</h2>

          {loading ? (
            <p className="text-xs text-neutral-500 animate-pulse">Loading rates...</p>
          ) : locations.length === 0 ? (
            <p className="text-xs text-neutral-500">No custom location rates added yet. Default rates will apply.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-neutral-300">
                <thead className="border-b border-white/10 uppercase tracking-wider text-neutral-500 text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Country</th>
                    <th className="py-3 px-4">State</th>
                    <th className="py-3 px-4">City</th>
                    <th className="py-3 px-4">Zone</th>
                    <th className="py-3 px-4">Delivery Fee</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {locations.map((loc) => (
                    <tr key={loc.id} className="hover:bg-white/[0.02]">
                      <td className="py-3.5 px-4 font-bold">{loc.country}</td>
                      <td className="py-3.5 px-4">{loc.state}</td>
                      <td className="py-3.5 px-4">{loc.city}</td>
                      <td className="py-3.5 px-4 text-neutral-500">{loc.zone || "—"}</td>
                      <td className="py-3.5 px-4 font-black text-amber-400">₦{Number(loc.fee).toLocaleString()}</td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => handleDelete(loc.id)}
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
        </section>
      </div>
    </main>
  );
}
