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
  const [addressMode, setAddressMode] = useState("saved"); // "saved" | "manual"
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

        // Fetch saved addresses
        const addrRes = await fetch("/api/account/addresses", { cache: "no-store" });
        const addrData = await addrRes.json();

        if (addrRes.ok && addrData.success && Array.isArray(addrData.addresses) && addrData.addresses.length > 0) {
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

  // Update available states and cities when location form inputs change
  useEffect(() => {
    if (form.country.toLowerCase() === "nigeria") {
      const states = NIGERIAN_STATES;
      const matchedStateKey = form.state
        ? NIGERIAN_STATES.find((s) => s.toLowerCase() === form.state.trim().toLowerCase())
        : null;
      const cities = matchedStateKey && NIGERIA_LOCATIONS[matchedStateKey] ? NIGERIA_LOCATIONS[matchedStateKey] : [];

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

  // Fetch location shipping fee whenever location changes
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

      // Reset city if state changes
      if (name === "state") {
        next.city = "";
      }
      // Reset state & city if country changes
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

      // If customer opted to save new manual address to account
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

      // Clear local cart before redirecting to Paystack checkout
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
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-neutral-500 text-xs uppercase tracking-[0.3em] animate-pulse">Loading checkout...</div>
      </main>
    );
  }

  if (cart.items.length === 0) {
    return (
      <main className="min-h-screen bg-black text-white">
        <div className="max-w-4xl mx-auto px-5 sm:px-8 py-20 md:py-32 text-center">
          <p className="text-amber-400 text-[10px] font-bold tracking-[0.35em] uppercase">VÉRANE</p>
          <h1 className="text-5xl md:text-7xl font-black tracking-[-0.05em] mt-4">CHECKOUT</h1>
          <p className="text-neutral-500 mt-6">Your cart is empty.</p>
          <Link href="/catalog" className="inline-flex mt-8 bg-white text-black px-8 py-4 rounded-full text-xs font-black uppercase tracking-[0.15em] hover:bg-neutral-200 transition">
            Explore Collection
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="max-w-7xl mx-auto px-5 sm:px-8 py-12 md:py-20">
        <div className="mb-12">
          <Link href="/cart" className="text-neutral-500 text-xs uppercase tracking-[0.15em] hover:text-white transition">← Back to cart</Link>
          <p className="text-amber-400 text-[10px] font-bold tracking-[0.35em] uppercase mt-10">VÉRANE</p>
          <h1 className="text-5xl md:text-7xl font-black tracking-[-0.05em] mt-3">CHECKOUT</h1>
        </div>

        <div className="grid lg:grid-cols-[1fr_420px] gap-10 lg:gap-14">
          <section>
            <div className="border border-white/10 bg-neutral-950 rounded-[2rem] p-6 md:p-8 space-y-8">

              {/* LOGGED-IN CUSTOMER SAVED ADDRESS SELECTOR */}
              {customer && savedAddresses.length > 0 && (
                <div className="p-6 rounded-2xl bg-black border border-amber-500/30 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-4">
                    <div>
                      <p className="text-[10px] text-amber-400 uppercase tracking-[0.2em] font-bold">SAVED ADDRESSES</p>
                      <h2 className="text-sm font-bold text-white mt-0.5">Use your default / saved address</h2>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleSwitchToSaved}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                          addressMode === "saved"
                            ? "bg-amber-500 text-black shadow-lg"
                            : "bg-neutral-900 text-neutral-400 hover:text-white"
                        }`}
                      >
                        Use Saved Address
                      </button>
                      <button
                        type="button"
                        onClick={handleSwitchToManual}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                          addressMode === "manual"
                            ? "bg-amber-500 text-black shadow-lg"
                            : "bg-neutral-900 text-neutral-400 hover:text-white"
                        }`}
                      >
                        Use Another Address
                      </button>
                    </div>
                  </div>

                  {addressMode === "saved" && (
                    <div className="space-y-3">
                      <p className="text-xs text-neutral-400">Select an address from your VÉRANE account:</p>
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
                                  : "border-white/10 bg-neutral-900 text-neutral-300 hover:border-white/20"
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold">{addr.fullName}</span>
                                {addr.isDefault && (
                                  <span className="text-[9px] font-black uppercase tracking-wider bg-amber-500 text-black px-2 py-0.5 rounded-full">
                                    DEFAULT
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-neutral-400 mt-1">{addr.phone}</p>
                              <p className="text-xs text-neutral-300 mt-2">
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
                <p className="text-[10px] text-amber-400 uppercase tracking-[0.25em] font-bold">1. Contact Information</p>
                <div className="grid sm:grid-cols-2 gap-4 mt-6">
                  <input name="firstName" value={form.firstName} onChange={updateField} placeholder="First name *" required className="rounded-xl border border-white/10 bg-black px-4 py-4 text-sm outline-none placeholder:text-neutral-600 focus:border-amber-400/50" />
                  <input name="lastName" value={form.lastName} onChange={updateField} placeholder="Last name" className="rounded-xl border border-white/10 bg-black px-4 py-4 text-sm outline-none placeholder:text-neutral-600 focus:border-amber-400/50" />
                  <input name="email" type="email" value={form.email} onChange={updateField} placeholder="Email address *" required className="rounded-xl border border-white/10 bg-black px-4 py-4 text-sm outline-none placeholder:text-neutral-600 focus:border-amber-400/50" />
                  <input name="phone" value={form.phone} onChange={updateField} placeholder="Phone number *" required className="rounded-xl border border-white/10 bg-black px-4 py-4 text-sm outline-none placeholder:text-neutral-600 focus:border-amber-400/50" />
                </div>
              </div>

              {/* DELIVERY LOCATION SELECTOR */}
              <div>
                <p className="text-[10px] text-amber-400 uppercase tracking-[0.25em] font-bold">2. Delivery Location & Address</p>
                <div className="space-y-4 mt-6">

                  {/* COUNTRY */}
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-neutral-500 mb-1.5">Country *</label>
                    <select name="country" value={form.country} onChange={updateField} className="w-full rounded-xl border border-white/10 bg-black px-4 py-4 text-sm text-white outline-none focus:border-amber-400/50">
                      {deliveryOptions.countries.map((c) => (
                        <option key={c} value={c} className="bg-neutral-900">{c}</option>
                      ))}
                    </select>
                  </div>

                  {/* STATE & CITY */}
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] uppercase tracking-wider text-neutral-500 mb-1.5">State / Region *</label>
                      {deliveryOptions.states.length > 0 ? (
                        <select name="state" value={form.state} onChange={updateField} className="w-full rounded-xl border border-white/10 bg-black px-4 py-4 text-sm text-white outline-none focus:border-amber-400/50">
                          <option value="">Select State</option>
                          {deliveryOptions.states.map((s) => (
                            <option key={s} value={s} className="bg-neutral-900">{s}</option>
                          ))}
                        </select>
                      ) : (
                        <input name="state" value={form.state} onChange={updateField} placeholder="e.g. Lagos" className="w-full rounded-xl border border-white/10 bg-black px-4 py-4 text-sm outline-none placeholder:text-neutral-600 focus:border-amber-400/50" />
                      )}
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase tracking-wider text-neutral-500 mb-1.5">City / LGA *</label>
                      {deliveryOptions.cities.length > 0 ? (
                        <select name="city" value={form.city} onChange={updateField} className="w-full rounded-xl border border-white/10 bg-black px-4 py-4 text-sm text-white outline-none focus:border-amber-400/50">
                          <option value="">Select City / LGA</option>
                          {deliveryOptions.cities.map((c) => (
                            <option key={c} value={c} className="bg-neutral-900">{c}</option>
                          ))}
                        </select>
                      ) : (
                        <input name="city" value={form.city} onChange={updateField} placeholder="e.g. Ikeja" className="w-full rounded-xl border border-white/10 bg-black px-4 py-4 text-sm outline-none placeholder:text-neutral-600 focus:border-amber-400/50" />
                      )}
                    </div>
                  </div>

                  {/* ZONE / NEIGHBORHOOD */}
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-neutral-500 mb-1.5">Zone / Neighborhood (Optional)</label>
                    <input name="zone" value={form.zone} onChange={updateField} placeholder="e.g. Lekki Phase 1, Victoria Island..." className="w-full rounded-xl border border-white/10 bg-black px-4 py-4 text-sm outline-none placeholder:text-neutral-600 focus:border-amber-400/50" />
                  </div>

                  {/* FULL STREET ADDRESS */}
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-neutral-500 mb-1.5">Complete Physical Address *</label>
                    <textarea name="address" value={form.address} onChange={updateField} rows={3} placeholder="Street address, house number, apartment, suite, etc." className="w-full rounded-xl border border-white/10 bg-black px-4 py-4 text-sm outline-none placeholder:text-neutral-600 focus:border-amber-400/50 resize-none" />
                  </div>

                  {/* AUTO SAVE ADDRESS CHECKBOX FOR MANUAL ENTRY */}
                  {customer && addressMode === "manual" && (
                    <div className="flex items-center gap-2 pt-2">
                      <input
                        type="checkbox"
                        id="saveNewAddressToAccountCheck"
                        checked={saveNewAddressToAccount}
                        onChange={(e) => setSaveNewAddressToAccount(e.target.checked)}
                        className="accent-amber-500"
                      />
                      <label htmlFor="saveNewAddressToAccountCheck" className="text-xs text-neutral-300">
                        Save this new address to my VÉRANE account for future purchases
                      </label>
                    </div>
                  )}

                </div>
              </div>

              <div className="mt-8 border border-white/5 rounded-2xl p-5 bg-white/[0.02]">
                <p className="text-xs font-bold text-amber-400">Payment Authorization</p>
                <p className="text-xs text-neutral-400 mt-1.5 leading-relaxed">
                  Payment configuration step. Your order will be created and confirmed upon submission.
                </p>
              </div>
            </div>
          </section>

          {/* ORDER SUMMARY */}
          <aside className="lg:sticky lg:top-8 h-fit">
            <div className="border border-white/10 bg-neutral-950 rounded-[2rem] p-6 md:p-8">
              <p className="text-[10px] text-amber-400 uppercase tracking-[0.25em] font-bold">Order Summary</p>

              <div className="mt-7 space-y-5">
                {cart.items.map((item, index) => {
                  const images = getImages(item.images);
                  const image = images.length > 0 ? images[0] : null;
                  const quantity = Number(item.qty || 0);
                  const price = Number(item.price || 0);
                  const variation = [item.selectedColor, item.selectedSize].filter(Boolean).join(" / ");

                  return (
                    <div key={item.cartItemKey || `${item.id}-${index}`} className="flex gap-4">
                      <div className="w-16 h-20 rounded-lg overflow-hidden bg-neutral-900 shrink-0 border border-white/5">
                        {image ? <img src={image} alt={item.name || "Product"} className="w-full h-full object-cover" /> : null}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{item.name}</p>
                        {variation ? <p className="text-xs text-neutral-500 mt-0.5">{variation}</p> : null}
                        <p className="text-xs text-neutral-600 mt-0.5">Qty: {quantity}</p>
                        <p className="text-sm font-bold mt-1">₦{(price * quantity).toLocaleString()}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* FINANCIAL BREAKDOWN */}
              <div className="border-t border-white/10 mt-7 pt-6 space-y-3.5">
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-400">Subtotal</span>
                  <span>₦{cart.total.toLocaleString()}</span>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-neutral-400">Delivery Fee</span>
                  <span className="font-bold text-amber-400">
                    {shippingFee > 0 ? `₦${shippingFee.toLocaleString()}` : "Select location"}
                  </span>
                </div>

                {matchedLocationName && (
                  <p className="text-[10px] text-neutral-500 italic">
                    Rate: {matchedLocationName}
                  </p>
                )}

                <div className="border-t border-white/10 pt-4 flex justify-between items-baseline">
                  <span className="font-bold text-base">Total</span>
                  <span className="text-2xl font-black text-amber-400">
                    ₦{grandTotal.toLocaleString()}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={placeOrder}
                disabled={processing}
                className="mt-8 w-full rounded-full bg-amber-500 px-6 py-4 text-xs font-black uppercase tracking-[0.15em] text-black hover:bg-amber-400 transition disabled:opacity-50"
              >
                {processing ? "Creating Order..." : "Place Order & Pay"}
              </button>

              <p className="text-[10px] text-neutral-500 text-center mt-4 leading-relaxed">
                Calculated based on selected state, city & zone rate.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
