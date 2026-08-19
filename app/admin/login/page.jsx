"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();

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
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error || "Unable to authenticate."
        );
      }

      router.replace("/admin");
      router.refresh();
    } catch (err) {
      console.error("Login error:", err);

      setError(
        err?.message ||
          "Something went wrong while signing you in."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-black text-white relative overflow-hidden">

      {/* BACKGROUND */}

      <div className="absolute inset-0 pointer-events-none">

        <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[700px] h-[700px] rounded-full bg-amber-500/[0.04] blur-[140px]" />

        <div className="absolute bottom-[-30%] right-[-10%] w-[500px] h-[500px] rounded-full bg-white/[0.02] blur-[120px]" />

      </div>

      {/* CONTENT */}

      <div className="relative min-h-screen flex items-center justify-center px-5 py-10">

        <div className="w-full max-w-md">

          {/* BRAND */}

          <div
            className={`text-center mb-10 transition-all duration-700 ${
              mounted
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-3"
            }`}
          >

            <div className="flex justify-center mb-6">

              <div className="w-12 h-12 rounded-2xl border border-white/10 bg-white/[0.03] flex items-center justify-center">

                <span className="text-xl font-black text-amber-400">
                  V
                </span>

              </div>

            </div>

            <div className="text-[10px] uppercase tracking-[0.4em] text-neutral-600 font-bold mb-4">
              VÉRANE
            </div>

            <h1 className="text-4xl sm:text-5xl font-black tracking-tight">
              Control Center
            </h1>

            <p className="text-sm text-neutral-600 mt-3">
              Private administration portal
            </p>

          </div>

          {/* LOGIN CARD */}

          <div
            className={`rounded-[28px] border border-white/10 bg-white/[0.025] backdrop-blur-xl p-6 sm:p-8 shadow-2xl transition-all duration-700 ${
              mounted
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-3"
            }`}
          >

            {/* HEADER */}

            <div className="flex items-center justify-between mb-8">

              <div>

                <p className="text-xs font-bold text-white">
                  Administrator Access
                </p>

                <p className="text-[10px] text-neutral-600 mt-1">
                  Authorized personnel only
                </p>

              </div>

              <div className="flex items-center gap-2">

                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />

                <span className="text-[9px] uppercase tracking-widest text-neutral-600">
                  Secure
                </span>

              </div>

            </div>

            {/* FORM */}

            <form onSubmit={handleSubmit}>

              <label className="block text-xs font-bold text-neutral-400 mb-2">
                Admin Password
              </label>

              <div className="relative">

                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    setError("");
                  }}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  autoFocus
                  disabled={loading}
                  className="w-full h-14 bg-black/60 border border-white/10 rounded-2xl px-4 pr-16 text-sm text-white outline-none transition placeholder:text-neutral-700 focus:border-amber-400/40 focus:bg-white/[0.02] disabled:opacity-50"
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowPassword((value) => !value)
                  }
                  disabled={loading}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] uppercase tracking-widest font-bold text-neutral-600 hover:text-white transition disabled:opacity-30"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>

              </div>

              {/* ERROR */}

              {error && (
                <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/[0.05] px-4 py-3">

                  <div className="flex gap-3 items-start">

                    <span className="text-red-400 text-sm">
                      !
                    </span>

                    <p className="text-xs text-red-300 leading-relaxed">
                      {error}
                    </p>

                  </div>

                </div>
              )}

              {/* LOGIN BUTTON */}

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-6 h-14 rounded-2xl bg-amber-500 text-black text-xs font-black uppercase tracking-[0.18em] transition hover:bg-amber-400 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
              >

                {loading ? (
                  <span className="flex items-center justify-center gap-3">

                    <span className="w-4 h-4 rounded-full border-2 border-black/30 border-t-black animate-spin" />

                    Authenticating

                  </span>
                ) : (
                  "Enter Control Center"
                )}

              </button>

            </form>

            {/* BRAND ACCESS */}

            <div className="mt-8 pt-6 border-t border-white/5">

              <p className="text-[9px] uppercase tracking-[0.25em] text-neutral-700 mb-3">
                Authorized Brand Systems
              </p>

              <div className="grid grid-cols-3 gap-2">

                <AccessCard
                  title="UTHY"
                  subtitle="LUXURY"
                />

                <AccessCard
                  title="ALOMZIEE"
                  subtitle="FOOTIES"
                />

                <AccessCard
                  title="VÉRANE"
                  subtitle="ALL ACCESS"
                />

              </div>

            </div>

          </div>

          {/* FOOTER */}

          <div className="text-center mt-8">

            <p className="text-[9px] uppercase tracking-[0.25em] text-neutral-700">
              VÉRANE / PRIVATE SYSTEM
            </p>

            <p className="text-[10px] text-neutral-800 mt-2">
              Unauthorized access is prohibited.
            </p>

          </div>

        </div>

      </div>

    </main>
  );
}

function AccessCard({ title, subtitle }) {
  return (
    <div className="rounded-xl border border-white/5 bg-black/30 px-2 py-3 text-center">

      <p className="text-[9px] font-black text-neutral-400 tracking-wide">
        {title}
      </p>

      <p className="text-[7px] uppercase tracking-widest text-neutral-700 mt-1">
        {subtitle}
      </p>

    </div>
  );
}