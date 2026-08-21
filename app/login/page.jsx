"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const submit = async (event) => {
    event.preventDefault();

    setError("");
    setLoading(true);

    try {
      const response = await fetch(
        "/api/auth/login",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            email,
            password,
          }),
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Unable to sign in."
        );
      }

      router.push("/account");
    } catch (error) {
      setError(
        error.message ||
          "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center px-5 py-16">
      <div className="w-full max-w-md">
        <div className="text-center">
          <p className="text-amber-400 text-[10px] font-bold tracking-[0.4em] uppercase">
            VÉRANE
          </p>

          <h1 className="text-5xl md:text-6xl font-black tracking-[-0.05em] mt-4">
            WELCOME BACK
          </h1>

          <p className="text-neutral-500 text-sm mt-4">
            Sign in to your VÉRANE account.
          </p>
        </div>

        <form
          onSubmit={submit}
          className="mt-10 border border-white/10 bg-neutral-950 rounded-[2rem] p-6 md:p-8"
        >
          {error && (
            <div className="mb-6 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          <label className="block">
            <span className="text-[10px] uppercase tracking-[0.2em] text-neutral-500 font-bold">
              Email
            </span>

            <input
              type="email"
              value={email}
              onChange={(event) =>
                setEmail(
                  event.target.value
                )
              }
              required
              autoComplete="email"
              className="mt-2 w-full rounded-xl border border-white/10 bg-black px-4 py-3.5 text-sm outline-none focus:border-amber-500/50"
              placeholder="you@example.com"
            />
          </label>

          <label className="block mt-5">
            <span className="text-[10px] uppercase tracking-[0.2em] text-neutral-500 font-bold">
              Password
            </span>

            <input
              type="password"
              value={password}
              onChange={(event) =>
                setPassword(
                  event.target.value
                )
              }
              required
              autoComplete="current-password"
              className="mt-2 w-full rounded-xl border border-white/10 bg-black px-4 py-3.5 text-sm outline-none focus:border-amber-500/50"
              placeholder="Your password"
            />
          </label>

          <button
            type="submit"
            disabled={loading}
            className="mt-7 w-full rounded-full bg-white text-black py-4 text-xs font-black uppercase tracking-[0.15em] hover:bg-neutral-200 transition disabled:opacity-50"
          >
            {loading
              ? "Signing In..."
              : "Sign In"}
          </button>

          <p className="text-center text-xs text-neutral-500 mt-6">
            New to VÉRANE?{" "}
            <Link
              href="/join"
              className="text-white hover:text-amber-400 transition"
            >
              Join now
            </Link>
          </p>
        </form>
      </div>
    </main>
  );
}