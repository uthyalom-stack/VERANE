"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { NIGERIA_LOCATIONS, NIGERIAN_STATES } from "@/lib/nigeria-locations";

export default function AccountPage() {
  const router = useRouter();

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);

  // Saved Addresses state
  const [addresses, setAddresses] = useState([]);
  const [loadingAddresses, setLoadingAddresses] = useState(true);
  const [addressFormOpen, setAddressFormOpen] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState(null);
  const [savingAddress, setSavingAddress] = useState(false);
  const [addressError, setAddressError] = useState("");

  const [formState, setFormState] = useState({
    fullName: "",
    phone: "",
    country: "Nigeria",
    state: "Lagos",
    city: "",
    streetAddress: "",
    isDefault: false,
  });

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
        fetchAddresses();
      } catch {
        router.replace("/login");
      } finally {
        setLoading(false);
      }
    }

    loadAccount();
  }, [router]);

  async function fetchAddresses() {
    try {
      setLoadingAddresses(true);
      const res = await fetch("/api/account/addresses", { cache: "no-store" });
      const data = await res.json();
      if (res.ok && data.success) {
        setAddresses(data.addresses || []);
      }
    } catch (err) {
      console.error("Failed to fetch addresses:", err);
    } finally {
      setLoadingAddresses(false);
    }
  }

  function handleOpenAddForm() {
    setEditingAddressId(null);
    setFormState({
      fullName: user?.name || "",
      phone: "",
      country: "Nigeria",
      state: "Lagos",
      city: NIGERIA_LOCATIONS["Lagos"]?.[0] || "",
      streetAddress: "",
      isDefault: addresses.length === 0,
    });
    setAddressError("");
    setAddressFormOpen(true);
  }

  function handleOpenEditForm(addr) {
    setEditingAddressId(addr.id);
    setFormState({
      fullName: addr.fullName,
      phone: addr.phone,
      country: addr.country,
      state: addr.state,
      city: addr.city,
      streetAddress: addr.streetAddress,
      isDefault: addr.isDefault,
    });
    setAddressError("");
    setAddressFormOpen(true);
  }

  async function handleSaveAddress(e) {
    e.preventDefault();
    if (!formState.fullName || !formState.phone || !formState.state || !formState.city || !formState.streetAddress) {
      setAddressError("Please complete all required address fields.");
      return;
    }

    setSavingAddress(true);
    setAddressError("");

    try {
      const url = "/api/account/addresses";
      const method = editingAddressId ? "PUT" : "POST";
      const payload = editingAddressId
        ? { ...formState, id: editingAddressId }
        : formState;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setAddressFormOpen(false);
        fetchAddresses();
      } else {
        setAddressError(data.error || "Failed to save address.");
      }
    } catch (err) {
      console.error("Save address error:", err);
      setAddressError("An error occurred while saving address.");
    } finally {
      setSavingAddress(false);
    }
  }

  async function handleSetDefault(id) {
    try {
      const res = await fetch("/api/account/addresses", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action: "setDefault" }),
      });
      if (res.ok) {
        fetchAddresses();
      }
    } catch (err) {
      console.error("Set default address error:", err);
    }
  }

  async function handleDeleteAddress(id) {
    if (!confirm("Are you sure you want to delete this saved address?")) return;

    try {
      const res = await fetch(`/api/account/addresses?id=${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        fetchAddresses();
      }
    } catch (err) {
      console.error("Delete address error:", err);
    }
  }

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
                Your private account is active, {user?.name || "Valued Member"}.
              </h2>
              <p className="text-xs text-neutral-300 mt-2 leading-relaxed">
                Thank you for joining VÉRANE. A welcome email has been sent to <strong>{user?.email || "your inbox"}</strong>.
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

        {/* SAVED ADDRESSES SECTION */}
        <div className="mt-12 border border-white/10 bg-neutral-950 rounded-[2rem] p-7 md:p-9">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
            <div>
              <p className="text-[10px] text-amber-400 uppercase tracking-[0.25em] font-bold">
                DELIVERY PREFERENCES
              </p>
              <h2 className="text-2xl font-black mt-1">SAVED ADDRESSES</h2>
              <p className="text-xs text-neutral-400 mt-1">
                Manage your primary shipping addresses for seamless checkout.
              </p>
            </div>

            <button
              type="button"
              onClick={handleOpenAddForm}
              className="px-6 py-3 rounded-full bg-amber-500 text-black text-xs font-black uppercase tracking-wider hover:bg-amber-400 transition"
            >
              + Add New Address
            </button>
          </div>

          {/* ADDRESS FORM MODAL / INLINE VIEW */}
          {addressFormOpen && (
            <div className="mt-6 p-6 rounded-2xl bg-black border border-amber-500/30 space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <h3 className="text-sm font-bold uppercase text-amber-400">
                  {editingAddressId ? "Edit Address" : "Add New Delivery Address"}
                </h3>
                <button
                  type="button"
                  onClick={() => setAddressFormOpen(false)}
                  className="text-xs text-neutral-500 hover:text-white"
                >
                  ✕ Close
                </button>
              </div>

              {addressError && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                  {addressError}
                </div>
              )}

              <form onSubmit={handleSaveAddress} className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block text-[10px] uppercase text-neutral-500 mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={formState.fullName}
                    onChange={(e) => setFormState({ ...formState, fullName: e.target.value })}
                    className="w-full rounded-xl border border-white/10 bg-neutral-900 px-4 py-2.5 outline-none focus:border-amber-400"
                    placeholder="Recipient Name"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase text-neutral-500 mb-1">Phone Number *</label>
                  <input
                    type="tel"
                    required
                    value={formState.phone}
                    onChange={(e) => setFormState({ ...formState, phone: e.target.value })}
                    className="w-full rounded-xl border border-white/10 bg-neutral-900 px-4 py-2.5 outline-none focus:border-amber-400"
                    placeholder="+234..."
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase text-neutral-500 mb-1">Country</label>
                  <input
                    type="text"
                    readOnly
                    value={formState.country}
                    className="w-full rounded-xl border border-white/5 bg-neutral-900/50 px-4 py-2.5 text-neutral-400"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase text-neutral-500 mb-1">State / Region *</label>
                  <select
                    value={formState.state}
                    onChange={(e) => {
                      const newSt = e.target.value;
                      const firstLga = NIGERIA_LOCATIONS[newSt]?.[0] || "";
                      setFormState({ ...formState, state: newSt, city: firstLga });
                    }}
                    className="w-full rounded-xl border border-white/10 bg-neutral-900 px-4 py-2.5 outline-none focus:border-amber-400"
                  >
                    {NIGERIAN_STATES.map((st) => (
                      <option key={st} value={st}>{st}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] uppercase text-neutral-500 mb-1">LGA / City *</label>
                  <select
                    value={formState.city}
                    onChange={(e) => setFormState({ ...formState, city: e.target.value })}
                    className="w-full rounded-xl border border-white/10 bg-neutral-900 px-4 py-2.5 outline-none focus:border-amber-400"
                  >
                    {(NIGERIA_LOCATIONS[formState.state] || []).map((lga) => (
                      <option key={lga} value={lga}>{lga}</option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[10px] uppercase text-neutral-500 mb-1">Street Address *</label>
                  <input
                    type="text"
                    required
                    value={formState.streetAddress}
                    onChange={(e) => setFormState({ ...formState, streetAddress: e.target.value })}
                    className="w-full rounded-xl border border-white/10 bg-neutral-900 px-4 py-2.5 outline-none focus:border-amber-400"
                    placeholder="House number, street name, apartment/suite"
                  />
                </div>

                <div className="sm:col-span-2 flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="isDefaultCheck"
                    checked={formState.isDefault}
                    onChange={(e) => setFormState({ ...formState, isDefault: e.target.checked })}
                    className="accent-amber-500"
                  />
                  <label htmlFor="isDefaultCheck" className="text-neutral-300">Set as default shipping address</label>
                </div>

                <div className="sm:col-span-2 flex justify-end gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setAddressFormOpen(false)}
                    className="px-5 py-2.5 rounded-xl border border-white/10 text-neutral-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingAddress}
                    className="px-6 py-2.5 rounded-xl bg-amber-500 text-black font-bold uppercase tracking-wider hover:bg-amber-400 disabled:opacity-50"
                  >
                    {savingAddress ? "Saving..." : "Save Address"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ADDRESS LIST */}
          {loadingAddresses ? (
            <p className="mt-6 text-xs text-neutral-500 uppercase tracking-widest animate-pulse">
              Loading addresses...
            </p>
          ) : addresses.length === 0 ? (
            <p className="mt-6 text-xs text-neutral-500">
              No saved addresses yet. Click "+ Add New Address" to save your primary delivery destination.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
              {addresses.map((addr) => (
                <div
                  key={addr.id}
                  className={`p-6 rounded-2xl border transition flex flex-col justify-between space-y-4 ${
                    addr.isDefault
                      ? "border-amber-400/50 bg-amber-400/[0.03]"
                      : "border-white/10 bg-black"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-bold">{addr.fullName}</p>
                      {addr.isDefault && (
                        <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-500 text-black">
                          DEFAULT
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-neutral-400 mt-1">{addr.phone}</p>
                    <p className="text-xs text-neutral-300 mt-3 leading-relaxed">
                      {addr.streetAddress}<br />
                      {addr.city}, {addr.state}<br />
                      {addr.country}
                    </p>
                  </div>

                  <div className="border-t border-white/10 pt-4 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => handleOpenEditForm(addr)}
                        className="text-neutral-400 hover:text-amber-400 font-semibold"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteAddress(addr.id)}
                        className="text-neutral-400 hover:text-red-400 font-semibold"
                      >
                        Delete
                      </button>
                    </div>

                    {!addr.isDefault && (
                      <button
                        type="button"
                        onClick={() => handleSetDefault(addr.id)}
                        className="text-amber-400 hover:underline text-[11px] font-bold"
                      >
                        Set as Default
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
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