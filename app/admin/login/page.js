"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const ADMINS = {
  UTHY: {
    password: "uthy2026",
    name: "UTHY LUXURY",
    role: "UTHY",
  },
  ALOMZIEE: {
    password: "alomziee2026",
    name: "ALOMZIEE FOOTIES",
    role: "ALOMZIEE",
  },
};

export default function AdminLogin() {
  const router = useRouter();

  const [brand, setBrand] = useState("UTHY");
  const [pass, setPass] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const auth = localStorage.getItem("adminAuth");
    const role = localStorage.getItem("adminRole");

    if (auth === "true" && role) {
      router.replace("/admin");
    }
  }, [router]);

  const login = (e) => {
    e.preventDefault();

    setError("");

    if (!pass) {
      setError("Enter your admin password.");
      return;
    }

    setLoading(true);

    const selectedAdmin = ADMINS[brand];

    if (pass === selectedAdmin.password) {
      localStorage.setItem("adminAuth", "true");
      localStorage.setItem("adminRole", selectedAdmin.role);
      localStorage.setItem("adminBrand", selectedAdmin.name);

      router.replace("/admin");
      return;
    }

    setLoading(false);
    setError("Incorrect password.");
  };

  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center px-5">
      <div className="w-full max-w-md">

        <div className="text-center mb-10">
          <p className="text-amber-500 text-[10px] font-bold uppercase tracking-[0.45em]">
            VÉRANE
          </p>

          <h1 className="text-4xl font-black tracking-tight mt-2">
            ADMIN
          </h1>

          <p className="text-neutral-600 text-sm mt-3">
            Private access to your VÉRANE management panel.
          </p>
        </div>

        <form
          onSubmit={login}
          className="bg-neutral-950 border border-white/10 rounded-3xl p-6 md:p-8"
        >

          <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500 mb-3">
            Select Brand
          </label>

          <div className="grid grid-cols-2 gap-3 mb-6">

            <button
              type="button"
              onClick={() => {
                setBrand("UTHY");
                setError("");
              }}
              className={`rounded-2xl px-4 py-4 text-sm font-bold border transition ${
                brand === "UTHY"
                  ? "bg-amber-500 text-black border-amber-500"
                  : "bg-black text-neutral-500 border-white/10 hover:border-white/20"
              }`}
            >
              UTHY LUXURY
            </button>

            <button
              type="button"
              onClick={() => {
                setBrand("ALOMZIEE");
                setError("");
              }}
              className={`rounded-2xl px-4 py-4 text-sm font-bold border transition ${
                brand === "ALOMZIEE"
                  ? "bg-amber-500 text-black border-amber-500"
                  : "bg-black text-neutral-500 border-white/10 hover:border-white/20"
              }`}
            >
              ALOMZIEE
            </button>

          </div>

          <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500 mb-3">
            {ADMINS[brand].name} Password
          </label>

          <input
            type="password"
            value={pass}
            onChange={(e) => setPass(e.target.value)}
            placeholder="Enter password"
            autoFocus
            className="w-full bg-black border border-white/10 rounded-2xl px-5 py-4 text-white outline-none focus:border-amber-500/60 transition"
          />

          {error && (
            <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-5 bg-amber-500 text-black rounded-2xl py-4 font-black text-sm hover:bg-amber-400 disabled:opacity-50 transition"
          >
            {loading ? "Authenticating..." : "Enter Admin →"}
          </button>

        </form>

        <a
          href="/"
          className="block text-center text-xs text-neutral-600 hover:text-white mt-6 transition"
        >
          ← Return to VÉRANE
        </a>

      </div>
    </main>
  );
}