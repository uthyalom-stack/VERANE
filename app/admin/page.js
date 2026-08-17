"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function AdminDashboard() {
  const router = useRouter();

  const [role, setRole] = useState("");
  const [brand, setBrand] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const auth = localStorage.getItem("adminAuth");
    const savedRole = localStorage.getItem("adminRole");
    const savedBrand = localStorage.getItem("adminBrand");

    if (auth !== "true" || !savedRole) {
      router.replace("/admin/login");
      return;
    }

    setRole(savedRole);
    setBrand(savedBrand || "");
    setReady(true);
  }, [router]);

  const logout = () => {
    localStorage.removeItem("adminAuth");
    localStorage.removeItem("adminRole");
    localStorage.removeItem("adminBrand");

    router.replace("/admin/login");
  };

  if (!ready) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        <p className="text-neutral-500 text-sm">
          Loading admin...
        </p>
      </main>
    );
  }

  const isUthy = role === "UTHY";

  return (
    <main className="min-h-screen bg-black text-white">

      <div className="max-w-7xl mx-auto px-5 sm:px-8 py-10 md:py-14">

        {/* HEADER */}

        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-12">

          <div>

            <p className="text-amber-400 text-[10px] font-bold uppercase tracking-[0.35em]">
              VÉRANE ADMIN
            </p>

            <h1 className="text-4xl md:text-6xl font-black tracking-tight mt-3">
              {brand}
            </h1>

            <p className="text-neutral-500 mt-3">
              {isUthy
                ? "Manage UTHY LUXURY."
                : "Manage ALOMZIEE FOOTIES."}
            </p>

          </div>

          <button
            onClick={logout}
            className="px-5 py-3 rounded-full border border-white/10 text-xs font-bold text-neutral-400 hover:text-white hover:bg-white/5 transition"
          >
            Logout
          </button>

        </div>

        {/* BRAND BADGE */}

        <div className="mb-8 rounded-3xl border border-amber-500/20 bg-amber-500/5 p-6">

          <p className="text-[10px] uppercase tracking-[0.25em] text-amber-400 font-bold">
            Currently managing
          </p>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mt-3">

            <div>
              <h2 className="text-2xl font-black">
                {brand}
              </h2>

              <p className="text-sm text-neutral-500 mt-1">
                You are logged in as the {brand} administrator.
              </p>
            </div>

            <div className="px-4 py-2 rounded-full bg-amber-500 text-black text-[10px] font-black uppercase tracking-wider w-fit">
              {role} ADMIN
            </div>

          </div>

        </div>

        {/* MANAGEMENT */}

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">

          <Link
            href="/admin/products"
            className="group rounded-3xl border border-white/10 bg-neutral-950 p-7 hover:border-amber-500/30 hover:bg-neutral-900 transition"
          >
            <p className="text-amber-400 text-[10px] uppercase tracking-[0.25em] font-bold">
              Catalog
            </p>

            <h2 className="text-2xl font-black mt-3">
              Products
            </h2>

            <p className="text-sm text-neutral-500 mt-2">
              Add, edit and remove {brand} products.
            </p>

            <p className="text-sm text-amber-400 mt-6 group-hover:translate-x-1 transition">
              Manage Products →
            </p>
          </Link>

          <Link
            href="/admin/orders"
            className="group rounded-3xl border border-white/10 bg-neutral-950 p-7 hover:border-amber-500/30 hover:bg-neutral-900 transition"
          >
            <p className="text-amber-400 text-[10px] uppercase tracking-[0.25em] font-bold">
              Commerce
            </p>

            <h2 className="text-2xl font-black mt-3">
              Orders
            </h2>

            <p className="text-sm text-neutral-500 mt-2">
              View and manage customer orders.
            </p>

            <p className="text-sm text-amber-400 mt-6 group-hover:translate-x-1 transition">
              View Orders →
            </p>
          </Link>

          <Link
            href="/admin/settings"
            className="group rounded-3xl border border-white/10 bg-neutral-950 p-7 hover:border-amber-500/30 hover:bg-neutral-900 transition"
          >
            <p className="text-amber-400 text-[10px] uppercase tracking-[0.25em] font-bold">
              Configuration
            </p>

            <h2 className="text-2xl font-black mt-3">
              Site Settings
            </h2>

            <p className="text-sm text-neutral-500 mt-2">
              Manage your brand and website settings.
            </p>

            <p className="text-sm text-amber-400 mt-6 group-hover:translate-x-1 transition">
              Open Settings →
            </p>
          </Link>

          <Link
            href="/admin/subscribers"
            className="group rounded-3xl border border-white/10 bg-neutral-950 p-7 hover:border-amber-500/30 hover:bg-neutral-900 transition"
          >
            <p className="text-amber-400 text-[10px] uppercase tracking-[0.25em] font-bold">
              Audience
            </p>

            <h2 className="text-2xl font-black mt-3">
              Customers
            </h2>

            <p className="text-sm text-neutral-500 mt-2">
              View subscribers and customer information.
            </p>

            <p className="text-sm text-amber-400 mt-6 group-hover:translate-x-1 transition">
              View Customers →
            </p>
          </Link>

          <div className="rounded-3xl border border-white/10 bg-neutral-950 p-7">

            <p className="text-amber-400 text-[10px] uppercase tracking-[0.25em] font-bold">
              Analytics
            </p>

            <h2 className="text-2xl font-black mt-3">
              Analytics
            </h2>

            <p className="text-sm text-neutral-500 mt-2">
              Store performance and sales insights.
            </p>

            <p className="text-xs text-neutral-700 mt-6 uppercase tracking-wider">
              Coming next
            </p>

          </div>

        </div>

        {/* ROLE INFO */}

        <div className="mt-10 border-t border-white/5 pt-8">

          <p className="text-[10px] uppercase tracking-[0.25em] text-neutral-700">
            Admin access
          </p>

          <p className="text-xs text-neutral-600 mt-2">
            Logged in as {role} administrator.
          </p>

        </div>

      </div>

    </main>
  );
}