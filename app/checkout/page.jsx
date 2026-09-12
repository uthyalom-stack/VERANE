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

  // Fulfillment method choice: "delivery" | "pickup"
  const [fulfillmentType, setFulfillmentType] = useState("delivery");

  // Delivery options, rate-fetching & courier selection
  const [deliveryOptions, setDeliveryOptions] = useState({
    countries: ["Nigeria", "International"],
    states: NIGERIAN_STATES,
    cities: [],
  });

  const [shippingRates, setShippingRates] = useState({ couriers: [], requestToken: null });
  const [selectedCourier, setSelectedCourier] = useState(null);
  const [loadingRates, setLoadingRates] = useState(false);
  const [ratesError, setRatesError] = useState("");

  // Pickup information & selected pickup date
  const [pickupInfo, setPickupInfo] = useState(null);
  const [selectedPickupDate, setSelectedPickupDate] = useState("");
  const [loadingPickup, setLoadingPickup] = useState(false);
  const [pickupError, setPickupError] = useState("");

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

  // Load Pickup details when customer switches to pickup or cart loads
  useEffect(() => {
    if (fulfillmentType === "pickup" && cart.items.length > 0) {
      loadPickupInfo();
    }
  }, [fulfillmentType, cart.items]);

  async function loadPickupInfo() {
    try {
      setLoadingPickup(true);
      setPickupError("");
      const res = await fetch("/api/checkout/pickup-info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: cart.items }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setPickupInfo(data);
        if (Array.isArray(data.availableDates) && data.availableDates.length > 0) {
          setSelectedPickupDate(data.availableDates[0].value);
        }
      } else {
        setPickupError(data.error || "Unable to load pickup details.");
      }
    } catch (err) {
      console.error("Fetch pickup info error:", err);
      setPickupError("Failed to load pickup information.");
    } finally {
      setLoadingPickup(false);
    }
  }

  // Auto-fetch Shipbubble courier rates with AbortController cancellation & debouncing
  useEffect(() => {
    // If user switches to pickup, immediately invalidate delivery courier choices and stop fetching
    if (fulfillmentType !== "delivery") {
      setShippingRates({ couriers: [], requestToken: null });
      setSelectedCourier(null);
      setLoadingRates(false);
      return;
    }

    // Invalidate currently selected courier & previous quotes when address changes
    setSelectedCourier(null);

    const isAddressComplete =
      cart.items.length > 0 &&
      form.firstName &&
      form.email &&
      form.phone &&
      form.state &&
      form.city &&
      form.address &&
      form.address.trim().length >= 5;

    if (!isAddressComplete) {
      setShippingRates({ couriers: [], requestToken: null });
      setLoadingRates(false);
      return;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      fetchShippingRates(controller.signal);
    }, 600);

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [
    fulfillmentType,
    cart.items,
    form.firstName,
    form.lastName,
    form.email,
    form.phone,
    form.country,
    form.state,
    form.city,
    form.address,
  ]);

  async function fetchShippingRates(signal) {
    try {
      setLoadingRates(true);
      setRatesError("");
      const res = await fetch("/api/checkout/get-shipping-rates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal,
        body: JSON.stringify({
          items: cart.items,
          receiverAddress: {
            name: `${form.firstName} ${form.lastName}`.trim(),
            firstName: form.firstName,
            lastName: form.lastName,
            email: form.email,
            phone: form.phone,
            country: form.country || "Nigeria",
            state: form.state,
            city: form.city,
            zone: form.zone,
            address: form.address,
            streetAddress: form.address,
          },
        }),
      });

      const data = await res.json();
      if (res.ok && data.success && Array.isArray(data.couriers) && data.couriers.length > 0) {
        setShippingRates({
          couriers: data.couriers,
          requestToken: data.requestToken,
        });
        setSelectedCourier(data.couriers[0]);
      } else {
        setShippingRates({ couriers: [], requestToken: null });
        setSelectedCourier(null);
        setRatesError(data.error || "No available shipping options found for this address.");
      }
    } catch (err) {
      if (err.name === "AbortError") {
        // Request cancelled due to newer address input
        return;
      }
      console.error("Fetch shipping rates error:", err);
      setRatesError("Failed to calculate shipping rates. Please check address details.");
    } finally {
      if (!signal || !signal.aborted) {
        setLoadingRates(false);
      }
    }
  }


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

  const currentShippingFee =
    fulfillmentType === "delivery" && selectedCourier
      ? Number(selectedCourier.rate_card_amount ?? selectedCourier.total ?? 0)
      : 0;

  const grandTotal = cart.total + currentShippingFee;

  const placeOrder = async () => {
    if (!form.firstName || !form.email || !form.phone) {
      alert("Please fill in required contact information (First Name, Email, Phone).");
      return;
    }

    if (fulfillmentType === "delivery") {
      if (!form.address || !form.state || !form.city) {
        alert("Please complete delivery destination details (State, City, and Street Address).");
        return;
      }
      if (!selectedCourier) {
        alert("Please select a courier shipping option before proceeding.");
        return;
      }
    } else {
      if (pickupInfo && !pickupInfo.available) {
        alert(pickupInfo.error || "Pickup is not available for this cart.");
        return;
      }
      if (!selectedPickupDate) {
        alert("Please select a requested pickup date.");
        return;
      }
    }

    try {
      setProcessing(true);

      if (fulfillmentType === "delivery" && addressMode === "manual" && customer && saveNewAddressToAccount) {
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
          shippingFee: currentShippingFee,
          total: grandTotal,
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email,
          phone: form.phone,
          country: form.country || "Nigeria",
          state: form.state || "Lagos",
          city: form.city || "Ikeja",
          zone: form.zone || "",
          address: form.address || "Customer Atelier Pickup",
          fulfillmentType,
          selectedCourier: fulfillmentType === "delivery" ? selectedCourier : null,
          requestedPickupDate: fulfillmentType === "pickup" ? selectedPickupDate : null,
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

            {/* FULFILLMENT METHOD CHOICE (DELIVERY VS PICKUP) */}
            <div className="rounded-3xl border border-amber-400/30 bg-neutral-950/90 p-6 sm:p-8 space-y-4 backdrop-blur-md shadow-2xl">
              <p className="text-[10px] font-bold uppercase tracking-couture text-amber-400">
                1. FULFILLMENT METHOD
              </p>
              <h2 className="text-xl sm:text-2xl font-editorial font-light text-white">
                How would you like to receive your order?
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                {/* DELIVERY CHOICE */}
                <div
                  onClick={() => setFulfillmentType("delivery")}
                  className={`p-5 rounded-2xl border cursor-pointer transition flex flex-col justify-between ${
                    fulfillmentType === "delivery"
                      ? "border-amber-400 bg-amber-400/10 text-white shadow-lg shadow-amber-400/5"
                      : "border-white/10 bg-neutral-900/60 text-neutral-400 hover:border-white/20 hover:text-white"
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-bold tracking-tight text-white">
                      🚚 Delivery
                    </span>
                    <span
                      className={`h-4 w-4 rounded-full border flex items-center justify-center ${
                        fulfillmentType === "delivery"
                          ? "border-amber-400 bg-amber-400"
                          : "border-neutral-600"
                      }`}
                    >
                      {fulfillmentType === "delivery" && (
                        <span className="h-1.5 w-1.5 rounded-full bg-black" />
                      )}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-400 leading-relaxed font-light">
                    Deliver the order directly to my physical address via express courier.
                  </p>
                </div>

                {/* PICKUP CHOICE */}
                <div
                  onClick={() => setFulfillmentType("pickup")}
                  className={`p-5 rounded-2xl border cursor-pointer transition flex flex-col justify-between ${
                    fulfillmentType === "pickup"
                      ? "border-amber-400 bg-amber-400/10 text-white shadow-lg shadow-amber-400/5"
                      : "border-white/10 bg-neutral-900/60 text-neutral-400 hover:border-white/20 hover:text-white"
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-bold tracking-tight text-white">
                      🏛️ Customer Pickup
                    </span>
                    <span
                      className={`h-4 w-4 rounded-full border flex items-center justify-center ${
                        fulfillmentType === "pickup"
                          ? "border-amber-400 bg-amber-400"
                          : "border-neutral-600"
                      }`}
                    >
                      {fulfillmentType === "pickup" && (
                        <span className="h-1.5 w-1.5 rounded-full bg-black" />
                      )}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-400 leading-relaxed font-light">
                    Pick up the order from the designated VÉRANE atelier location (Free: ₦0).
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-white/[0.08] bg-neutral-950/70 p-6 sm:p-8 space-y-8 backdrop-blur-md">
              {/* SAVED ADDRESS SELECTOR FOR DELIVERY MODE */}
              {fulfillmentType === "delivery" && customer && savedAddresses.length > 0 && (
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
                  2. CONTACT INFORMATION
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

              {/* MODE A: DELIVERY DESTINATION & SHIPBUBBLE COURIERS */}
              {fulfillmentType === "delivery" && (
                <div className="space-y-8 border-t border-white/10 pt-8">
                  <div>
                    <p className="text-[10px] text-amber-400 uppercase tracking-couture font-bold mb-4">
                      3. DELIVERY DESTINATION
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

                  {/* COURIER RATE SELECTION SECTION */}
                  <div className="border-t border-white/10 pt-6 space-y-4">
                    <p className="text-[10px] text-amber-400 uppercase tracking-couture font-bold">
                      4. SELECT COURIER & EXPRESS SERVICE
                    </p>

                    {loadingRates && (
                      <div className="p-5 rounded-2xl bg-neutral-900/80 border border-white/10 flex items-center gap-3">
                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/10 border-t-amber-400 shrink-0" />
                        <span className="text-xs font-semibold text-neutral-300">
                          Calculating live express shipping quotes...
                        </span>
                      </div>
                    )}

                    {!loadingRates && ratesError && (
                      <div className="p-4 rounded-xl border border-red-500/20 bg-red-500/10 text-red-300 text-xs font-bold">
                        {ratesError}
                      </div>
                    )}

                    {!loadingRates && shippingRates.couriers.length > 0 && (
                      <div className="space-y-3">
                        <p className="text-xs text-neutral-400 font-light">
                          Select your preferred courier service for delivery:
                        </p>
                        <div className="grid grid-cols-1 gap-3">
                          {shippingRates.couriers.map((courier) => {
                            const isSelected =
                              selectedCourier?.courier_id === courier.courier_id &&
                              selectedCourier?.service_code === courier.service_code;
                            const amount = Number(courier.rate_card_amount ?? courier.total ?? 0);

                            return (
                              <div
                                key={`${courier.courier_id}-${courier.service_code}`}
                                onClick={() => setSelectedCourier(courier)}
                                className={`p-4 rounded-2xl border cursor-pointer transition flex items-center justify-between gap-4 ${
                                  isSelected
                                    ? "border-amber-400 bg-amber-400/10 text-white shadow-md shadow-amber-400/5"
                                    : "border-white/10 bg-neutral-900/60 text-neutral-300 hover:border-white/20"
                                }`}
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  <span
                                    className={`h-4 w-4 rounded-full border flex items-center justify-center shrink-0 ${
                                      isSelected ? "border-amber-400 bg-amber-400" : "border-neutral-600"
                                    }`}
                                  >
                                    {isSelected && <span className="h-1.5 w-1.5 rounded-full bg-black" />}
                                  </span>
                                  <div className="min-w-0">
                                    <p className="text-xs font-bold text-white truncate">
                                      {courier.courier_name} — {courier.service_type || courier.service_code}
                                    </p>
                                    <p className="text-[10px] text-neutral-400 mt-0.5">
                                      Estimated delivery: {courier.eta_days || "1-3 Days"}
                                    </p>
                                  </div>
                                </div>

                                <span className="text-xs font-black text-amber-400 shrink-0">
                                  ₦{amount.toLocaleString()}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {!loadingRates &&
                      shippingRates.couriers.length === 0 &&
                      !ratesError &&
                      (!form.address || form.address.trim().length < 5) && (
                        <p className="text-xs text-neutral-500 font-light italic">
                          Please enter your complete physical street address above to view live courier quotes.
                        </p>
                      )}
                  </div>
                </div>
              )}

              {/* MODE B: CUSTOMER PICKUP LOCATION & SCHEDULE */}
              {fulfillmentType === "pickup" && (
                <div className="space-y-6 border-t border-white/10 pt-8">
                  <p className="text-[10px] text-amber-400 uppercase tracking-couture font-bold">
                    3. PICKUP LOCATION & SCHEDULE
                  </p>

                  {loadingPickup && (
                    <div className="p-5 rounded-2xl bg-neutral-900/80 border border-white/10 flex items-center gap-3">
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/10 border-t-amber-400 shrink-0" />
                      <span className="text-xs font-semibold text-neutral-300">
                        Loading atelier pickup details...
                      </span>
                    </div>
                  )}

                  {!loadingPickup && pickupError && (
                    <div className="p-4 rounded-xl border border-red-500/20 bg-red-500/10 text-red-300 text-xs font-bold">
                      {pickupError}
                    </div>
                  )}

                  {!loadingPickup && pickupInfo && (
                    <div className="space-y-6">
                      {/* LOCATION DETAILS CARD */}
                      <div className="p-6 rounded-2xl border border-amber-400/30 bg-black/60 space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold uppercase tracking-luxury text-amber-400">
                            {pickupInfo.pickupLocationName || `${pickupInfo.pickupBrandDisplayName} ATELIER`}
                          </span>
                          <span className="text-[9px] font-black uppercase tracking-luxury bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-0.5 rounded-full">
                            FREE PICKUP: ₦0
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-y border-white/10 py-3">
                          <div>
                            <p className="text-[9px] font-bold uppercase tracking-wider text-neutral-400 mb-0.5">Pickup Address</p>
                            <p className="text-xs text-neutral-200 leading-relaxed font-light">
                              {pickupInfo.pickupAddress}
                            </p>
                          </div>

                          <div>
                            <p className="text-[9px] font-bold uppercase tracking-wider text-neutral-400 mb-0.5">Pickup Contact</p>
                            <p className="text-xs text-neutral-200 font-medium">
                              {pickupInfo.pickupContactName}
                            </p>
                            <p className="text-[11px] text-neutral-400">
                              {pickupInfo.pickupContactPhone}
                            </p>
                          </div>
                        </div>

                        <div>
                          <p className="text-[9px] font-bold uppercase tracking-wider text-neutral-400 mb-0.5">Pickup Timeframe</p>
                          <p className="text-xs text-amber-400 font-semibold">
                            {pickupInfo.pickupTimeframe}
                          </p>
                        </div>

                        {pickupInfo.pickupInstructions && (
                          <div className="pt-2 border-t border-white/10">
                            <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
                              Instructions & Collection Policy
                            </p>
                            <p className="text-xs text-neutral-400 leading-relaxed font-light">
                              {pickupInfo.pickupInstructions}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* DATE SELECTION */}
                      {Array.isArray(pickupInfo.availableDates) && pickupInfo.availableDates.length > 0 && (
                        <div className="space-y-3">
                          <label className="block text-[10px] uppercase tracking-luxury text-neutral-400">
                            Select Requested Pickup Date *
                          </label>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {pickupInfo.availableDates.map((d) => {
                              const isSelected = selectedPickupDate === d.value;
                              return (
                                <div
                                  key={d.value}
                                  onClick={() => setSelectedPickupDate(d.value)}
                                  className={`p-4 rounded-xl border cursor-pointer transition flex items-center justify-between ${
                                    isSelected
                                      ? "border-amber-400 bg-amber-400/10 text-white shadow-md shadow-amber-400/5"
                                      : "border-white/10 bg-neutral-900/60 text-neutral-300 hover:border-white/20"
                                  }`}
                                >
                                  <span className="text-xs font-bold">{d.label}</span>
                                  <span
                                    className={`h-4 w-4 rounded-full border flex items-center justify-center shrink-0 ${
                                      isSelected ? "border-amber-400 bg-amber-400" : "border-neutral-600"
                                    }`}
                                  >
                                    {isSelected && <span className="h-1.5 w-1.5 rounded-full bg-black" />}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
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
                    {fulfillmentType === "pickup"
                      ? "Free Pickup (₦0)"
                      : currentShippingFee > 0
                      ? `₦${currentShippingFee.toLocaleString()}`
                      : "Calculated at address entry"}
                  </span>
                </div>

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
