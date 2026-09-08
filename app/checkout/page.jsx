"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { NIGERIA_LOCATIONS, NIGERIAN_STATES } from "@/lib/nigeria-locations";

export default function CheckoutPage() {
  const router = useRouter();
  const [processing, setProcessing] = useState(false);
  const [cart, setCart] = useState({ items: [], total: 0 });
  const [loaded, setLoaded] = useState(false);

  // Customer session & saved addresses state
  const [customer, setCustomer] = useState(null);
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [addressMode, setAddressMode] = useState("saved");
  const [selectedAddressId, setSelectedAddressId] = useState("");
  const [saveNewAddressToAccount, setSaveNewAddressToAccount] = useState(false);

  // Delivery options & calculation state
  const [deliveryOptions, setDeliveryOptions] = useState({
    countries: ["Nigeria", "International"],
    states: NIGERIAN_STATES,
    cities: [],
  });

  const [shippingFee, setShippingFee] = useState(0);
  const [matchedLocationName, setMatchedLocationName] = useState("");

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    country: "Nigeria",
    state: "",
    city: "",
    zone: "",
    address: "",
  });

  useEffect(() => {
    try {
      const saved = localStorage.getItem("cart");
      if (saved) {
        const parsed = JSON.parse(saved);
        const items = Array.isArray(parsed.items) ? parsed.items : [];
        const total = items.reduce(
          (sum, item) => sum + Number(item.price || 0) * Number(item.qty || 0),
          0
        );
        setCart({ items, total });
      }
    } catch (error) {
      console.error("Failed to load checkout cart:", error);
    } finally {
      setLoaded(true);
    }

    loadCustomerSessionAndAddresses();
  }, []);

  async function loadCustomerSessionAndAddresses() {
    try {
      const sessionRes = await fetch("/api/auth/session", { cache: "no-store" });
      const sessionData = await sessionRes.json();

      if (sessionData.authenticated && sessionData.user) {
        setCustomer(sessionData.user);

        const addrRes = await fetch("/api/account/addresses", { cache: "no-store" });
        const addrData = await addrRes.json();

        if (
          addrRes.ok &&
          addrData.success &&
          Array.isArray(addrData.addresses) &&
          addrData.addresses.length > 0
        ) {
          const addrs = addrData.addresses;
          setSavedAddresses(addrs);
          setAddressMode("saved");

          const defaultAddr = addrs.find((a) => a.isDefault) || addrs[0];
          setSelectedAddressId(defaultAddr.id);
          applySavedAddressToForm(defaultAddr, sessionData.user);
        } else {
          setAddressMode("manual");
          setForm((prev) => ({
            ...prev,
            firstName: sessionData.user.name?.split(" ")[0] || sessionData.user.name || "",
            lastName: sessionData.user.name?.split(" ").slice(1).join(" ") || "",
            email: sessionData.user.email || "",
          }));
        }
      }
    } catch (err) {
      console.error("Failed to load customer checkout session:", err);
    }
  }

  function applySavedAddressToForm(addr, cust) {
    if (!addr) return;

    const names = addr.fullName ? addr.fullName.split(" ") : [cust?.name || ""];
    const firstName = names[0] || "";
    const lastName = names.slice(1).join(" ") || "";

    setForm({
      firstName,
      lastName,
      email: cust?.email || form.email || "",
      phone: addr.phone || "",
      country: addr.country || "Nigeria",
      state: addr.state || "",
      city: addr.city || "",
      zone: "",
      address: addr.streetAddress || "",
    });
  }

  function handleSelectSavedAddress(addrId) {
    setSelectedAddressId(addrId);
    const selected = savedAddresses.find((a) => a.id === addrId);
    if (selected) {
      applySavedAddressToForm(selected, customer);
    }
  }

  function handleSwitchToManual() {
    setAddressMode("manual");
    setForm((prev) => ({
      ...prev,
      firstName: customer?.name?.split(" ")[0] || prev.firstName,
      lastName: customer?.name?.split(" ").slice(1).join(" ") || prev.lastName,
      email: customer?.email || prev.email,
    }));
  }

  function handleSwitchToSaved() {
    setAddressMode("saved");
    if (savedAddresses.length > 0) {
      const activeAddr = savedAddresses.find((a) => a.id === selectedAddressId) || savedAddresses[0];
      applySavedAddressToForm(activeAddr, customer);
    }
  }

  useEffect(() => {
    if (form.country.toLowerCase() === "nigeria") {
      const states = NIGERIAN_STATES;
      const matchedStateKey = form.state
        ? NIGERIAN_STATES.find((s) => s.toLowerCase() === form.state.trim().toLowerCase())
        : null;
      const cities =
        matchedStateKey && NIGERIA_LOCATIONS[matchedStateKey]
          ? NIGERIA_LOCATIONS[matchedStateKey]
          : [];

      setDeliveryOptions((prev) => ({
        ...prev,
        states,
        cities,
      }));
    } else {
      setDeliveryOptions((prev) => ({
        ...prev,
        states: [],
        cities: [],
      }));
    }
  }, [form.country, form.state]);

  useEffect(() => {
    async function loadDeliveryFee() {
      if (!form.country) return;

      try {
        const params = new URLSearchParams({
          country: form.country,
          state: form.state || "",
          city: form.city || "",
          zone: form.zone || "",
        });

        const res = await fetch(`/api/delivery?${params.toString()}`);
        const data = await res.json();

        if (data.success) {
          setShippingFee(Number(data.fee || 0));
          if (data.matchedLocationName) {
            setMatchedLocationName(data.matchedLocationName);
          }
          if (data.options?.countries?.length) {
            setDeliveryOptions((prev) => ({
              ...prev,
              countries: data.options.countries,
            }));
          }
        }
      } catch (err) {
        console.error("Delivery rate calculation error:", err);
      }
    }

    loadDeliveryFee();
  }, [form.country, form.state, form.city, form.zone]);

  const updateField = (event) => {
    const { name, value } = event.target;

    setForm((previous) => {
      const next = { ...previous, [name]: value };

      if (name === "state") {
        next.city = "";
      }
      if (name === "country") {
        next.state = "";
        next.city = "";
      }

      return next;
    });
  };

  const getImages = (images) => {
    if (!images) return [];
    try {
      const parsed = typeof images === "string" ? JSON.parse(images) : images;
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      if (typeof images === "string") {
        return images.split(",").map((s) => s.trim()).filter(Boolean);
      }
      return [];
    }
  };

  const grandTotal = cart.total + shippingFee;

  const placeOrder = async () => {
    if (!form.firstName || !form.email || !form.address || !form.state || !form.city) {
      alert("Please fill in all required contact and delivery fields (State and City/LGA are required).");
      return;
    }

    try {
      setProcessing(true);

      if (addressMode === "manual" && customer && saveNewAddressToAccount) {
        try {
          await fetch("/api/account/addresses", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              fullName: `${form.firstName} ${form.lastName}`.trim(),
              phone: form.phone,
              country: form.country,
              state: form.state,
              city: form.city,
              streetAddress: form.address,
              isDefault: false,
            }),
          });
        } catch (addrErr) {
          console.error("Failed to auto-save address to account:", addrErr);
        }
      }

      const response = await fetch("/api/paystack/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cart.items,
          subtotal: cart.total,
          shippingFee,
          total: grandTotal,
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email,
          phone: form.phone,
          country: form.country,
          state: form.state,
          city: form.city,
          zone: form.zone,
          address: form.address,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success || !data.authorizationUrl) {
        throw new Error(data.error || "Failed to initialize Paystack checkout.");
      }

      localStorage.removeItem("cart");
      window.location.href = data.authorizationUrl;
    } catch (error) {
      console.error("Paystack initialization error:", error);
      alert(error.message);
      setProcessing(false);
    }
  };

  if (!loaded) {
    return (
      <main className="min-h-screen bg-[#070707] text-white flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-amber-400" />
          <p className="mt-4 text-xs font-bold uppercase tracking-luxury text-amber-400">
            Initializing Secure Checkout...
          </p>
        </div>
      </main>
    );
  }

  if (cart.items.length === 0) {
    return (
      <main className="min-h-screen bg-[#070707] text-[#f5f5f5]">
        <div className="max-w-4xl mx-auto px-5 sm:px-8 py-28 text-center">
          <p className="text-[10px] font-bold uppercase tracking-couture text-amber-400 mb-3">
            VÉRANE CHECKOUT
          </p>
          <h1 className="text-4xl sm:text-6xl font-editorial font-light text-white">Your Bag is Empty</h1>
          <p className="text-neutral-400 font-light mt-4">Please add pieces to your bag before proceeding to checkout.</p>
          <Link
            href="/catalog"
            className="inline-flex mt-8 bg-amber-400 text-black px-8 py-3.5 rounded-full text-xs font-bold uppercase tracking-luxury hover:bg-amber-300 transition shadow-lg shadow-amber-400/10"
          >
            Explore Catalog
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#070707] text-[#f5f5f5] pb-24">
      <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-12 py-12 lg:py-20">
        <div className="mb-10 border-b border-white/[0.08] pb-6">
          <Link
            href="/cart"
            className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-luxury text-neutral-400 hover:text-white transition mb-4"
          >
            <span>←</span> Back to Shopping Bag
          </Link>
          <p className="text-[10px] font-bold uppercase tracking-couture text-amber-400">
            SECURE ATELIER CHECKOUT
          </p>
          <h1 className="text-4xl sm:text-6xl font-editorial font-light tracking-tight text-white mt-1">
            Order & Shipping Details
          </h1>
        </div>

        <div className="grid lg:grid-cols-[1fr_420px] gap-10 lg:gap-14">
          <section className="space-y-8">
            <div className="rounded-3xl border border-white/[0.08] bg-neutral-950/70 p-6 sm:p-8 space-y-8 backdrop-blur-md">
              {/* SAVED ADDRESS SELECTOR */}
              {customer && savedAddresses.length > 0 && (
                <div className="p-6 rounded-2xl bg-black/60 border border-amber-400/30 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
                    <div>
                      <p className="text-[9px] font-bold text-amber-400 uppercase tracking-couture">
                        SAVED ATELIER ADDRESSES
                      </p>
                      <h2 className="text-sm font-semibold text-white mt-0.5">
                        Select destination from your account
                      </h2>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleSwitchToSaved}
                        className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-luxury transition ${
                          addressMode === "saved"
                            ? "bg-amber-400 text-black shadow-md"
                            : "bg-neutral-900 text-neutral-400 hover:text-white"
                        }`}
                      >
                        Saved
                      </button>
                      <button
                        type="button"
                        onClick={handleSwitchToManual}
                        className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-luxury transition ${
                          addressMode === "manual"
                            ? "bg-amber-400 text-black shadow-md"
                            : "bg-neutral-900 text-neutral-400 hover:text-white"
                        }`}
                      >
                        New Address
                      </button>
                    </div>
                  </div>

                  {addressMode === "saved" && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 gap-3">
                        {savedAddresses.map((addr) => {
                          const isSelected = addr.id === selectedAddressId;
                          return (
                            <div
                              key={addr.id}
                              onClick={() => handleSelectSavedAddress(addr.id)}
                              className={`p-4 rounded-xl border cursor-pointer transition ${
                                isSelected
                                  ? "border-amber-400 bg-amber-400/10 text-white"
                                  : "border-white/10 bg-neutral-900/60 text-neutral-300 hover:border-white/20"
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold">{addr.fullName}</span>
                                {addr.isDefault && (
                                  <span className="text-[8px] font-black uppercase tracking-luxury bg-amber-400 text-black px-2 py-0.5 rounded-full">
                                    DEFAULT
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-neutral-400 mt-1">{addr.phone}</p>
                              <p className="text-xs text-neutral-300 mt-1.5 font-light">
                                {addr.streetAddress}, {addr.city}, {addr.state}, {addr.country}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* CONTACT DETAILS */}
              <div>
                <p className="text-[10px] text-amber-400 uppercase tracking-couture font-bold mb-4">
                  1. CONTACT INFORMATION
                </p>
                <div className="grid sm:grid-cols-2 gap-4">
                  <input
                    name="firstName"
                    value={form.firstName}
                    onChange={updateField}
                    placeholder="First Name *"
                    required
                    className="rounded-full border border-white/10 bg-neutral-900/90 px-5 py-3.5 text-sm text-white placeholder:text-neutral-600 outline-none transition focus:border-amber-400/50"
                  />
                  <input
                    name="lastName"
                    value={form.lastName}
                    onChange={updateField}
                    placeholder="Last Name"
                    className="rounded-full border border-white/10 bg-neutral-900/90 px-5 py-3.5 text-sm text-white placeholder:text-neutral-600 outline-none transition focus:border-amber-400/50"
                  />
                  <input
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={updateField}
                    placeholder="Email Address *"
                    required
                    className="rounded-full border border-white/10 bg-neutral-900/90 px-5 py-3.5 text-sm text-white placeholder:text-neutral-600 outline-none transition focus:border-amber-400/50"
                  />
                  <input
                    name="phone"
                    value={form.phone}
                    onChange={updateField}
                    placeholder="Phone Number *"
                    required
                    className="rounded-full border border-white/10 bg-neutral-900/90 px-5 py-3.5 text-sm text-white placeholder:text-neutral-600 outline-none transition focus:border-amber-400/50"
                  />
                </div>
              </div>

              {/* DELIVERY LOCATION */}
              <div>
                <p className="text-[10px] text-amber-400 uppercase tracking-couture font-bold mb-4">
                  2. DELIVERY DESTINATION
                </p>
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] uppercase tracking-luxury text-neutral-400 mb-1.5">
                      Country *
                    </label>
                    <select
                      name="country"
                      value={form.country}
                      onChange={updateField}
                      className="w-full rounded-full border border-white/10 bg-neutral-900/90 px-5 py-3.5 text-sm text-white outline-none focus:border-amber-400/50"
                    >
                      {deliveryOptions.countries.map((c) => (
                        <option key={c} value={c} className="bg-neutral-900">
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] uppercase tracking-luxury text-neutral-400 mb-1.5">
                        State / Region *
                      </label>
                      {deliveryOptions.states.length > 0 ? (
                        <select
                          name="state"
                          value={form.state}
                          onChange={updateField}
                          className="w-full rounded-full border border-white/10 bg-neutral-900/90 px-5 py-3.5 text-sm text-white outline-none focus:border-amber-400/50"
                        >
                          <option value="">Select State</option>
                          {deliveryOptions.states.map((s) => (
                            <option key={s} value={s} className="bg-neutral-900">
                              {s}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          name="state"
                          value={form.state}
                          onChange={updateField}
                          placeholder="State / Region *"
                          className="w-full rounded-full border border-white/10 bg-neutral-900/90 px-5 py-3.5 text-sm text-white outline-none placeholder:text-neutral-600 focus:border-amber-400/50"
                        />
                      )}
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase tracking-luxury text-neutral-400 mb-1.5">
                        City / LGA *
                      </label>
                      {deliveryOptions.cities.length > 0 ? (
                        <select
                          name="city"
                          value={form.city}
                          onChange={updateField}
                          className="w-full rounded-full border border-white/10 bg-neutral-900/90 px-5 py-3.5 text-sm text-white outline-none focus:border-amber-400/50"
                        >
                          <option value="">Select City / LGA</option>
                          {deliveryOptions.cities.map((c) => (
                            <option key={c} value={c} className="bg-neutral-900">
                              {c}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          name="city"
                          value={form.city}
                          onChange={updateField}
                          placeholder="City / LGA *"
                          className="w-full rounded-full border border-white/10 bg-neutral-900/90 px-5 py-3.5 text-sm text-white outline-none placeholder:text-neutral-600 focus:border-amber-400/50"
                        />
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase tracking-luxury text-neutral-400 mb-1.5">
                      Zone / Neighborhood (Optional)
                    </label>
                    <input
                      name="zone"
                      value={form.zone}
                      onChange={updateField}
                      placeholder="e.g. Lekki Phase 1, Victoria Island..."
                      className="w-full rounded-full border border-white/10 bg-neutral-900/90 px-5 py-3.5 text-sm text-white outline-none placeholder:text-neutral-600 focus:border-amber-400/50"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase tracking-luxury text-neutral-400 mb-1.5">
                      Complete Physical Address *
                    </label>
                    <textarea
                      name="address"
                      value={form.address}
                      onChange={updateField}
                      rows={3}
                      placeholder="Street address, house number, suite, or apartment..."
                      className="w-full rounded-2xl border border-white/10 bg-neutral-900/90 p-4 text-sm text-white outline-none placeholder:text-neutral-600 focus:border-amber-400/50 resize-none"
                    />
                  </div>

                  {customer && addressMode === "manual" && (
                    <div className="flex items-center gap-2 pt-2">
                      <input
                        type="checkbox"
                        id="saveNewAddressToAccountCheck"
                        checked={saveNewAddressToAccount}
                        onChange={(e) => setSaveNewAddressToAccount(e.target.checked)}
                        className="accent-amber-400"
                      />
                      <label htmlFor="saveNewAddressToAccountCheck" className="text-xs text-neutral-300">
                        Save this address to my account for future orders
                      </label>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* ORDER SUMMARY */}
          <aside className="lg:sticky lg:top-8 h-fit">
            <div className="rounded-3xl border border-white/10 bg-neutral-950/80 p-6 sm:p-8 backdrop-blur-md">
              <p className="text-[10px] font-bold uppercase tracking-couture text-amber-400 mb-6">
                CHECKOUT SUMMARY
              </p>

              <div className="space-y-4">
                {cart.items.map((item, index) => {
                  const images = getImages(item.images);
                  const image = images.length > 0 ? images[0] : null;
                  const quantity = Number(item.qty || 0);
                  const price = Number(item.price || 0);
                  const variation = [item.selectedColor, item.selectedSize].filter(Boolean).join(" / ");

                  return (
                    <div
                      key={item.cartItemKey || `${item.id}-${index}`}
                      className="flex gap-4 border-b border-white/[0.05] pb-4 last:border-0"
                    >
                      <div className="w-14 h-18 rounded-lg overflow-hidden bg-neutral-900 shrink-0 border border-white/5">
                        {image ? (
                          <img src={image} alt={item.name || "Product"} className="w-full h-full object-cover" />
                        ) : null}
                      </div>
                      <div className="flex-1 min-w-0 flex flex-col justify-between">
                        <div>
                          <p className="text-xs font-medium text-white truncate">{item.name}</p>
                          {variation && <p className="text-[10px] text-neutral-400 mt-0.5">{variation}</p>}
                        </div>
                        <div className="flex justify-between items-baseline mt-2">
                          <span className="text-[10px] text-neutral-500">Qty: {quantity}</span>
                          <span className="text-xs font-bold text-white">
                            ₦{(price * quantity).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* FINANCIAL BREAKDOWN */}
              <div className="border-t border-white/10 mt-6 pt-5 space-y-3 text-sm font-light">
                <div className="flex justify-between text-neutral-300">
                  <span>Bag Subtotal</span>
                  <span className="font-semibold text-white">₦{cart.total.toLocaleString()}</span>
                </div>

                <div className="flex justify-between text-neutral-300">
                  <span>Logistics / Shipping</span>
                  <span className="font-bold text-amber-400">
                    {shippingFee > 0 ? `₦${shippingFee.toLocaleString()}` : "Select State & City"}
                  </span>
                </div>

                {matchedLocationName && (
                  <p className="text-[10px] text-neutral-500 italic">
                    Calculated for: {matchedLocationName}
                  </p>
                )}

                <div className="border-t border-white/10 pt-4 flex justify-between items-baseline">
                  <span className="font-editorial text-lg text-white">Grand Total</span>
                  <span className="text-2xl font-bold text-amber-400">
                    ₦{grandTotal.toLocaleString()}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={placeOrder}
                disabled={processing}
                className="mt-8 w-full bg-amber-400 text-black py-4 rounded-full text-xs font-bold uppercase tracking-luxury hover:bg-amber-300 transition shadow-xl shadow-amber-400/10 disabled:opacity-50"
              >
                {processing ? "Processing Order..." : "Proceed to Payment →"}
              </button>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
