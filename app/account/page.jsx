"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function AccountPage() {
  const router = useRouter();

  const [user, setUser] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [loggingOut, setLoggingOut] =
    useState(false);

  const [showWelcome, setShowWelcome] = useState(false);

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get("welcome") === "true") {
        setShowWelcome(true);
      }
    } catch {}

    async function loadAccount() {
      try {
        const response =
          await fetch(
            "/api/auth/session",
            {
              cache: "no-store",
            }
          );

        const data =
          await response.json();

        if (
          !data.authenticated ||
          !data.user
        ) {
          router.replace("/login");
          return;
        }

        setUser(data.user);
      } catch {
        router.replace("/login");
      } finally {
        setLoading(false);
      }
    }

    loadAccount();
  }, [router]);

  const logout = async () => {
    setLoggingOut(true);

    try {
      await fetch(
        "/api/auth/logout",
        {
          method: "POST",
        }
      );
    } finally {
      router.replace("/");
      router.refresh();
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        <p className="text-neutral-500 text-xs uppercase tracking-[0.3em]">
          Loading account...
        </p>
      </main>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="max-w-6xl mx-auto px-5 sm:px-8 py-12 md:py-20">
        <div>
          {showWelcome && (
            <div className="mb-8 rounded-2xl border border-amber-400/30 bg-amber-400/10 p-6">
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-amber-400">
                Welcome to VÉRANE
              </p>
              <h2 className="text-2xl font-black mt-2">
                Your private account is active, {user.name}.
              </h2>
              <p className="text-xs text-neutral-300 mt-2 leading-relaxed">
                Thank you for joining VÉRANE. A welcome email has been sent to <strong>{user.email}</strong>.
              </p>
            </div>
          )}

          <p className="text-amber-400 text-[10px] font-bold tracking-[0.35em] uppercase">
            VÉRANE MEMBER
          </p>

          <h1 className="text-5xl md:text-7xl font-black tracking-[-0.05em] mt-3">
            MY ACCOUNT
          </h1>

          <p className="text-neutral-500 mt-4">
            Welcome back,{" "}
            <span className="text-white">
              {user.name}
            </span>
            .
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-4 mt-12">
          <div className="md:col-span-2 border border-white/10 bg-neutral-950 rounded-[2rem] p-7 md:p-9">
            <p className="text-[10px] text-neutral-500 uppercase tracking-[0.25em] font-bold">
              Profile
            </p>

            <div className="mt-8 space-y-5">
              <div>
                <p className="text-[9px] uppercase tracking-[0.2em] text-neutral-600">
                  Name
                </p>

                <p className="text-lg mt-1">
                  {user.name}
                </p>
              </div>

              <div>
                <p className="text-[9px] uppercase tracking-[0.2em] text-neutral-600">
                  Email
                </p>

                <p className="text-lg mt-1">
                  {user.email}
                </p>
              </div>
            </div>
          </div>

          <div className="border border-white/10 bg-neutral-950 rounded-[2rem] p-7 md:p-9">
            <p className="text-[10px] text-neutral-500 uppercase tracking-[0.25em] font-bold">
              VÉRANE REWARDS
            </p>

            <p className="text-5xl font-black mt-6">
              0
            </p>

            <p className="text-xs text-neutral-500 mt-2">
              Points
            </p>

            <div className="mt-7 border-t border-white/5 pt-5">
              <p className="text-[10px] text-neutral-600 uppercase tracking-wider">
                Member tier
              </p>

              <p className="text-sm font-bold mt-1">
                MEMBER
              </p>
            </div>

            <p className="text-xs text-neutral-600 mt-5 leading-relaxed">
              Rewards are coming soon.
              Your purchases will
              eventually earn points.
            </p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
          <Link
            href="/orders"
            className="border border-white/10 bg-neutral-950 rounded-2xl p-6 hover:border-white/20 transition"
          >
            <p className="text-xs font-bold">
              Orders
            </p>

            <p className="text-[10px] text-neutral-600 mt-2 uppercase tracking-wider">
              View your purchases
            </p>
          </Link>

          <Link
            href="/wishlist"
            className="border border-white/10 bg-neutral-950 rounded-2xl p-6 hover:border-white/20 transition"
          >
            <p className="text-xs font-bold">
              Wishlist
            </p>

            <p className="text-[10px] text-neutral-600 mt-2 uppercase tracking-wider">
              Saved pieces
            </p>
          </Link>

          <Link
            href="/outfit-builder"
            className="border border-white/10 bg-neutral-950 rounded-2xl p-6 hover:border-white/20 transition"
          >
            <p className="text-xs font-bold">
              Saved Looks
            </p>

            <p className="text-[10px] text-neutral-600 mt-2 uppercase tracking-wider">
              Build your style
            </p>
          </Link>

          <button
            onClick={logout}
            disabled={loggingOut}
            className="text-left border border-white/10 bg-neutral-950 rounded-2xl p-6 hover:border-red-500/30 transition"
          >
            <p className="text-xs font-bold">
              {loggingOut
                ? "Signing out..."
                : "Sign Out"}
            </p>

            <p className="text-[10px] text-neutral-600 mt-2 uppercase tracking-wider">
              Leave your account
            </p>
          </button>
        </div>
      </div>
    </main>
  );
}