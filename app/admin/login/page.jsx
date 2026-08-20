"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const ADMIN_TYPES = [
  {
    id: "UTHY",
    name: "UTHY",
    fullName: "UTHY LUXURY",
    eyebrow: "Fashion House",
    description:
      "Manage UTHY products, sales, inventory and business performance.",
    accent: "amber",
    icon: "U",
  },
  {
    id: "ALOMZIEE",
    name: "ALOMZIEE",
    fullName: "ALOMZIEE FOOTIES",
    eyebrow: "Footwear House",
    description:
      "Manage footwear, accessories, orders and Alomziee performance.",
    accent: "violet",
    icon: "A",
  },
  {
    id: "SUPERADMIN",
    name: "VÉRANE",
    fullName: "SUPER ADMIN",
    eyebrow: "Platform Control",
    description:
      "Control the VÉRANE storefront, content, brands and website systems.",
    accent: "white",
    icon: "V",
  },
];

export default function AdminLoginPage() {
  const router = useRouter();

  const [selectedAdmin, setSelectedAdmin] = useState(null);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const selected =
    ADMIN_TYPES.find((admin) => admin.id === selectedAdmin) || null;

  const selectAdmin = (adminId) => {
    setSelectedAdmin(adminId);
    setPassword("");
    setError("");
    setShowPassword(false);
  };

  const goBack = () => {
    setSelectedAdmin(null);
    setPassword("");
    setError("");
    setShowPassword(false);
  };

  const handleLogin = async (e) => {
    e.preventDefault();

    if (!selected) {
      setError("Choose an administration first.");
      return;
    }

    if (!password.trim()) {
      setError("Enter your password.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          role: selected.id,
          password: password.trim(),
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.success) {
        setError(data?.error || "Incorrect password.");
        setLoading(false);
        return;
      }

      router.replace("/admin");
      router.refresh();
    } catch (err) {
      console.error("Login error:", err);

      setError(
        "Unable to connect to the control center."
      );

      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#050505] text-white relative overflow-hidden">

      {/* BACKGROUND */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[700px] rounded-full bg-amber-500/[0.035] blur-[140px]" />
        <div className="absolute top-1/2 left-0 w-[400px] h-[400px] rounded-full bg-white/[0.015] blur-[120px]" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] rounded-full bg-violet-500/[0.02] blur-[140px]" />
      </div>

      <div className="relative z-10 min-h-screen flex items-center justify-center px-5 py-12">

        <div className="w-full max-w-6xl">

          {/* HEADER */}
          <div className="text-center mb-12">

            <div className="flex justify-center mb-7">
              <div className="relative">
                <div className="absolute inset-0 rounded-3xl bg-amber-400/10 blur-xl" />

                <div className="relative w-16 h-16 rounded-3xl border border-white/10 bg-white/[0.035] backdrop-blur-xl flex items-center justify-center shadow-2xl">
                  <span className="text-2xl font-black text-amber-400">
                    V
                  </span>
                </div>
              </div>
            </div>

            <p className="text-[10px] uppercase tracking-[0.55em] text-amber-400/80 font-bold">
              VÉRANE
            </p>

            <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-[-0.04em] mt-3">
              Administration
            </h1>

            <p className="text-sm text-neutral-500 mt-4 max-w-md mx-auto leading-relaxed">
              Select the administration you are authorized to access.
            </p>

          </div>

          {!selected ? (

            /* =====================================================
               ADMIN SELECTION
            ====================================================== */

            <div>

              <div className="grid md:grid-cols-3 gap-5">

                {ADMIN_TYPES.map((admin) => (

                  <button
                    key={admin.id}
                    type="button"
                    onClick={() => selectAdmin(admin.id)}
                    className="group relative text-left rounded-[2rem] border border-white/10 bg-white/[0.025] hover:bg-white/[0.045] hover:border-white/20 transition-all duration-500 overflow-hidden"
                  >

                    {/* CARD GLOW */}
                    <div
                      className={`absolute -top-24 -right-24 w-48 h-48 rounded-full blur-[80px] transition-opacity duration-500 opacity-0 group-hover:opacity-100 ${
                        admin.id === "UTHY"
                          ? "bg-amber-400/10"
                          : admin.id === "ALOMZIEE"
                          ? "bg-violet-400/10"
                          : "bg-white/10"
                      }`}
                    />

                    <div className="relative p-7">

                      <div className="flex items-start justify-between">

                        <div
                          className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${
                            admin.id === "UTHY"
                              ? "border-amber-400/20 bg-amber-400/[0.06] text-amber-400"
                              : admin.id === "ALOMZIEE"
                              ? "border-violet-400/20 bg-violet-400/[0.06] text-violet-300"
                              : "border-white/15 bg-white/[0.05] text-white"
                          }`}
                        >
                          <span className="font-black text-lg">
                            {admin.icon}
                          </span>
                        </div>

                        <span className="text-neutral-700 group-hover:text-white transition text-lg">
                          ↗
                        </span>

                      </div>

                      <div className="mt-10">

                        <p className="text-[9px] uppercase tracking-[0.3em] text-neutral-600 font-bold">
                          {admin.eyebrow}
                        </p>

                        <h2 className="text-2xl font-black mt-2">
                          {admin.name}
                        </h2>

                        <p className="text-[10px] uppercase tracking-[0.22em] text-neutral-600 mt-1">
                          {admin.fullName}
                        </p>

                        <p className="text-sm text-neutral-500 leading-relaxed mt-6 min-h-[66px]">
                          {admin.description}
                        </p>

                      </div>

                      <div className="mt-8 pt-5 border-t border-white/[0.06] flex items-center justify-between">

                        <span className="text-[9px] uppercase tracking-[0.25em] text-neutral-700 group-hover:text-neutral-500 transition">
                          Enter
                        </span>

                        <span className="text-neutral-600 group-hover:text-amber-400 transition">
                          →
                        </span>

                      </div>

                    </div>

                  </button>

                ))}

              </div>

              <div className="text-center mt-8">
                <p className="text-[9px] uppercase tracking-[0.35em] text-neutral-800">
                  Authorized personnel only
                </p>
              </div>

            </div>

          ) : (

            /* =====================================================
               PASSWORD SCREEN
            ====================================================== */

            <div className="max-w-md mx-auto">

              <div className="rounded-[2rem] border border-white/10 bg-white/[0.025] backdrop-blur-xl p-7 sm:p-9 shadow-2xl">

                {/* BACK */}
                <button
                  type="button"
                  onClick={goBack}
                  disabled={loading}
                  className="text-xs text-neutral-600 hover:text-white transition flex items-center gap-2 mb-8"
                >
                  ← Choose another administration
                </button>

                {/* SELECTED ADMIN */}
                <div className="flex items-center gap-4 mb-8">

                  <div
                    className={`w-14 h-14 rounded-2xl flex items-center justify-center border ${
                      selected.id === "UTHY"
                        ? "border-amber-400/20 bg-amber-400/[0.06] text-amber-400"
                        : selected.id === "ALOMZIEE"
                        ? "border-violet-400/20 bg-violet-400/[0.06] text-violet-300"
                        : "border-white/15 bg-white/[0.05] text-white"
                    }`}
                  >
                    <span className="text-xl font-black">
                      {selected.icon}
                    </span>
                  </div>

                  <div>
                    <p className="text-[9px] uppercase tracking-[0.3em] text-neutral-600 font-bold">
                      Signing into
                    </p>

                    <h2 className="text-xl font-black mt-1">
                      {selected.fullName}
                    </h2>
                  </div>

                </div>

                <form onSubmit={handleLogin}>

                  <label className="block text-[10px] uppercase tracking-[0.2em] font-bold text-neutral-500 mb-3">
                    Password
                  </label>

                  <div className="relative">

                    <input
                      autoFocus
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setError("");
                      }}
                      placeholder="Enter your password"
                      disabled={loading}
                      className="w-full bg-black/70 border border-white/10 rounded-2xl px-5 py-4 pr-20 text-white outline-none placeholder:text-neutral-700 focus:border-amber-400/40 transition disabled:opacity-50"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowPassword((prev) => !prev)
                      }
                      disabled={loading}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-[9px] uppercase tracking-widest font-bold text-neutral-600 hover:text-white transition"
                    >
                      {showPassword ? "Hide" : "Show"}
                    </button>

                  </div>

                  {error && (
                    <div className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/[0.05] px-4 py-3">
                      <p className="text-xs text-red-300">
                        {error}
                      </p>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full mt-6 rounded-2xl bg-amber-500 text-black py-4 text-sm font-black hover:bg-amber-400 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading
                      ? "Authenticating..."
                      : `Enter ${selected.name}`}
                  </button>

                </form>

                <div className="flex items-center justify-center gap-2 mt-7">

                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />

                  <span className="text-[9px] uppercase tracking-[0.25em] text-neutral-700">
                    Secure Administration
                  </span>

                </div>

              </div>

            </div>

          )}

          {/* FOOTER */}
          <div className="text-center mt-10">

            <p className="text-[9px] text-neutral-800 uppercase tracking-[0.35em]">
              VÉRANE / PRIVATE ADMINISTRATION
            </p>

          </div>

        </div>

      </div>

    </main>
  );
}