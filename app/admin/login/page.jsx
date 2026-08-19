"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();

    if (!password.trim()) {
      setError("Enter your admin password.");
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
          password: password.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(data.error || "Incorrect password.");
        setLoading(false);
        return;
      }

      /*
       * Login succeeded.
       *
       * The API has now created the adminAuth cookie.
       */

      router.replace("/admin");

      router.refresh();
    } catch (err) {
      console.error("Login error:", err);
      setError("Unable to connect to the control center.");
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center px-5">
      <div className="w-full max-w-md">

        {/* BRAND */}
        <div className="text-center mb-10">
          <div className="flex justify-center mb-6">
            <div className="w-14 h-14 rounded-2xl border border-white/10 bg-white/[0.03] flex items-center justify-center">
              <span className="text-2xl font-black text-amber-400">
                V
              </span>
            </div>
          </div>

          <p className="text-[10px] uppercase tracking-[0.4em] text-neutral-600 font-bold mb-3">
            VÉRANE
          </p>

          <h1 className="text-4xl font-black tracking-tight">
            Control Center
          </h1>

          <p className="text-sm text-neutral-600 mt-3">
            Private administration portal
          </p>
        </div>

        {/* LOGIN CARD */}
        <div className="rounded-3xl border border-white/10 bg-white/[0.025] p-6 sm:p-8">

          <div className="mb-7">
            <h2 className="text-lg font-black">
              Administrator Access
            </h2>

            <p className="text-xs text-neutral-600 mt-1">
              Authorized personnel only
            </p>
          </div>

          <form onSubmit={handleLogin}>

            <label className="block text-xs font-bold text-neutral-400 mb-2">
              Admin Password
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
                placeholder="Enter password"
                disabled={loading}
                className="w-full bg-black border border-white/10 rounded-2xl px-4 py-4 pr-20 text-white outline-none placeholder:text-neutral-700 focus:border-amber-400/40 transition disabled:opacity-50"
              />

              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] uppercase tracking-widest font-bold text-neutral-600 hover:text-white transition"
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>

            {/* ERROR */}
            {error && (
              <div className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/[0.05] px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="text-red-400 text-sm">
                    !
                  </span>

                  <p className="text-xs text-red-300">
                    {error}
                  </p>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-6 rounded-2xl bg-amber-500 text-black py-4 text-sm font-black hover:bg-amber-400 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading
                ? "Authenticating..."
                : "Enter Control Center"}
            </button>
          </form>

          {/* SECURITY */}
          <div className="flex items-center justify-center gap-2 mt-6">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />

            <span className="text-[10px] uppercase tracking-[0.2em] text-neutral-700">
              Secure
            </span>
          </div>
        </div>

        {/* BRAND SYSTEMS */}
        <div className="mt-8">
          <p className="text-center text-[9px] uppercase tracking-[0.3em] text-neutral-700 mb-4">
            Authorized Brand Systems
          </p>

          <div className="grid grid-cols-3 gap-2">

            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 text-center">
              <p className="text-xs font-black">
                UTHY
              </p>
              <p className="text-[8px] uppercase tracking-widest text-neutral-700 mt-1">
                Luxury
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 text-center">
              <p className="text-xs font-black">
                ALOMZIEE
              </p>
              <p className="text-[8px] uppercase tracking-widest text-neutral-700 mt-1">
                Footies
              </p>
            </div>

            <div className="rounded-2xl border border-amber-400/20 bg-amber-400/[0.03] p-4 text-center">
              <p className="text-xs font-black text-amber-400">
                VÉRANE
              </p>
              <p className="text-[8px] uppercase tracking-widest text-neutral-700 mt-1">
                All Access
              </p>
            </div>

          </div>
        </div>

        <p className="text-center text-[9px] text-neutral-800 mt-8">
          VÉRANE / PRIVATE ADMINISTRATION
        </p>

      </div>
    </main>
  );
}