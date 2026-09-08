"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { NIGERIA_LOCATIONS, NIGERIAN_STATES } from "@/lib/nigeria-locations";

/**
 * Helper to safely extract image URLs from JSON string or Array or item properties.
 */
function getItemImages(item) {
  if (!item) return [];
  if (Array.isArray(item.images)) return item.images;
  if (typeof item.images === "string") {
    try {
      const parsed = JSON.parse(item.images);
      if (Array.isArray(parsed)) return parsed;
    } catch {}
  }
  if (item.image) return [item.image];
  if (item.assetUrl) return [item.assetUrl];
  return [];
}

/**
 * Redesigned VÉRANE Customer Account Page
 * Editorial, luxury fashion-focused private portal.
 */
export default function AccountPage() {
  const router = useRouter();

  // Core authenticated state
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);

  // Account Data states
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);

  const [wishlist, setWishlist] = useState([]);
  const [loadingWishlist, setLoadingWishlist] = useState(true);

  const [settings, setSettings] = useState({});

  // Saved Addresses state
  const [addresses, setAddresses] = useState([]);
  const [loadingAddresses, setLoadingAddresses] = useState(true);
  const [addressFormOpen, setAddressFormOpen] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState(null);
  const [savingAddress, setSavingAddress] = useState(false);
  const [addressError, setAddressError] = useState("");

  // Edit Profile state
  const [profileEditing, setProfileEditing] = useState(false);

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

    async function loadAccountData() {
      try {
        setLoading(true);

        // 1. Fetch Auth Session
        const sessionRes = await fetch("/api/auth/session", { cache: "no-store" });
        const sessionData = await sessionRes.json();

        if (!sessionData.authenticated || !sessionData.user) {
          router.replace("/login");
          return;
        }

        setUser(sessionData.user);

        // 2. Fetch parallel customer & site data
        fetchOrders();
        fetchWishlist();
        fetchAddresses();
        fetchSettings();
      } catch (err) {
        console.error("Failed to load account session:", err);
        router.replace("/login");
      } finally {
        setLoading(false);
      }
    }

    loadAccountData();
  }, [router]);

  async function fetchOrders() {
    try {
      setLoadingOrders(true);
      const res = await fetch("/api/orders", { cache: "no-store", credentials: "include" });
      const data = await res.json();
      if (res.ok && data.authenticated && Array.isArray(data.orders)) {
        setOrders(data.orders);
      }
    } catch (err) {
      console.error("Failed to fetch orders:", err);
    } finally {
      setLoadingOrders(false);
    }
  }

  async function fetchWishlist() {
    try {
      setLoadingWishlist(true);
      const res = await fetch("/api/wishlist", { cache: "no-store" });
      const data = await res.json();
      if (res.ok && Array.isArray(data.wishlist)) {
        setWishlist(data.wishlist);
      }
    } catch (err) {
      console.error("Failed to fetch wishlist:", err);
    } finally {
      setLoadingWishlist(false);
    }
  }

  async function fetchSettings() {
    try {
      const res = await fetch("/api/settings", { cache: "no-store" });
      const data = await res.json();
      if (res.ok && data) {
        setSettings(data);
      }
    } catch (err) {
      console.error("Failed to fetch settings:", err);
    }
  }

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
      await fetch("/api/auth/logout", {
        method: "POST",
      });
    } finally {
      router.replace("/");
      router.refresh();
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-black text-white pb-28 md:pb-16">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 pt-10 md:pt-16 space-y-12">
          <div className="relative overflow-hidden rounded-[2.5rem] border border-white/10 bg-neutral-950 p-8 sm:p-12 md:p-16 space-y-6">
            <div className="h-4 w-32 animate-pulse rounded bg-neutral-900" />
            <div className="h-12 w-2/3 animate-pulse rounded-2xl bg-neutral-900" />
            <div className="h-4 w-1/3 animate-pulse rounded bg-neutral-900" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 h-64 animate-pulse rounded-[2rem] border border-white/10 bg-neutral-950" />
            <div className="lg:col-span-5 h-64 animate-pulse rounded-[2rem] border border-white/10 bg-neutral-950" />
          </div>
        </div>
      </main>
    );
  }

  if (!user) {
    return null;
  }

  // Customer initials monogram
  const userInitials = user.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "VR";

  const recentOrder = orders[0] || null;

  return (
    <main className="min-h-screen bg-black text-white selection:bg-amber-400 selection:text-black pb-28 md:pb-16">
      <div className="max-w-7xl mx-auto px-5 sm:px-8 pt-10 md:pt-16 space-y-12">

        {/* WELCOME BANNER FOR NEW REGISTRATION */}
        {showWelcome && (
          <div className="rounded-2xl border border-amber-400/30 bg-gradient-to-r from-amber-500/10 via-amber-400/5 to-transparent p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 backdrop-blur-md">
            <div>
              <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-amber-400 font-bold">
                MEMBER ATELIER PRIVILEGE
              </p>
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight mt-1">
                Your private account is active, {user.name}.
              </h2>
              <p className="text-xs text-neutral-300 mt-2 leading-relaxed max-w-xl">
                Thank you for joining VÉRANE. A confirmation copy has been sent to <strong>{user.email}</strong>. Explore our luxury collection or build your bespoke look.
              </p>
            </div>
            <Link
              href="/catalog"
              className="px-6 py-3 rounded-full bg-amber-400 text-black text-xs font-bold uppercase tracking-[0.2em] hover:bg-amber-300 transition shrink-0"
            >
              Discover Collection
            </Link>
          </div>
        )}

        {/* 2. ACCOUNT HERO */}
        <section className="relative overflow-hidden rounded-[2.5rem] border border-white/10 bg-gradient-to-b from-neutral-900/80 via-neutral-950 to-black p-8 sm:p-12 md:p-16">
          <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-96 h-96 bg-amber-400/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-8">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 rounded-full border border-amber-400/30 bg-amber-400/10 text-amber-400 text-[9px] font-mono font-bold uppercase tracking-[0.25em]">
                  VÉRANE PRIVATE MEMBER
                </span>
                <span className="text-neutral-500 text-xs">✦</span>
                <span className="text-neutral-400 text-xs font-mono uppercase tracking-widest">
                  EST. ATELIER
                </span>
              </div>

              <div>
                <h1 className="text-xs font-mono font-bold text-neutral-400 tracking-[0.4em] uppercase">
                  MY VÉRANE
                </h1>
                <p className="text-4xl sm:text-6xl md:text-7xl font-black tracking-[-0.04em] mt-2 text-white">
                  Welcome back, <span className="bg-gradient-to-r from-amber-200 via-amber-400 to-amber-500 bg-clip-text text-transparent">{user.name}</span>
                </p>
              </div>

              <p className="text-sm sm:text-base text-neutral-400 font-light tracking-wide italic">
                &ldquo;Your style. Your looks. Your orders.&rdquo;
              </p>
            </div>

            {/* AVATAR & EDIT PROFILE CONTROL */}
            <div className="flex items-center gap-5 border-t md:border-t-0 border-white/10 pt-6 md:pt-0">
              <div className="relative flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-tr from-amber-500 via-amber-300 to-amber-600 p-[2px]">
                <div className="w-full h-full rounded-full bg-neutral-950 flex items-center justify-center">
                  <span className="text-lg sm:text-2xl font-black text-amber-400 font-mono">
                    {userInitials}
                  </span>
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-xs font-bold uppercase tracking-wider text-white">
                  {user.name}
                </p>
                <p className="text-xs text-neutral-400 font-mono truncate max-w-[200px]">
                  {user.email}
                </p>
                <button
                  type="button"
                  onClick={() => setProfileEditing(!profileEditing)}
                  className="inline-flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-[0.2em] text-amber-400 hover:text-amber-300 transition pt-1"
                >
                  <span>{profileEditing ? "Close details" : "Edit Profile"}</span>
                  <span>→</span>
                </button>
              </div>
            </div>
          </div>

          {/* INLINE PROFILE INFORMATION DISPLAY/EDIT */}
          {profileEditing && (
            <div className="mt-8 border-t border-white/10 pt-6 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
              <div className="p-4 rounded-xl border border-white/10 bg-neutral-900/60">
                <p className="text-[10px] uppercase text-neutral-500 tracking-wider">FULL NAME</p>
                <p className="text-sm font-bold text-white mt-1">{user.name}</p>
              </div>
              <div className="p-4 rounded-xl border border-white/10 bg-neutral-900/60">
                <p className="text-[10px] uppercase text-neutral-500 tracking-wider">MEMBER EMAIL</p>
                <p className="text-sm font-bold text-white mt-1">{user.email}</p>
              </div>
            </div>
          )}
        </section>

        {/* 3. VISUAL ACCOUNT OVERVIEW */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-mono uppercase tracking-[0.35em] text-neutral-400 font-bold">
              ACTIVITY & SELECTIONS
            </h2>
            <span className="h-px bg-white/10 flex-1 ml-6" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

            {/* ORDERS CARD (Lg Col 7) */}
            <div className="lg:col-span-7 border border-white/10 bg-neutral-950 rounded-[2rem] p-6 sm:p-8 flex flex-col justify-between space-y-6 hover:border-white/20 transition">
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <span className="text-amber-400 text-sm">✦</span>
                    <h3 className="text-xs font-mono uppercase tracking-[0.25em] font-bold text-white">
                      RECENT ORDERS
                    </h3>
                  </div>

                  <Link
                    href="/orders"
                    className="text-[10px] font-mono uppercase tracking-[0.2em] text-amber-400 hover:text-amber-300 transition"
                  >
                    View all orders →
                  </Link>
                </div>

                {loadingOrders ? (
                  <div className="py-12 text-center space-y-3">
                    <div className="mx-auto h-5 w-5 animate-spin rounded-full border border-amber-400 border-t-transparent" />
                    <p className="text-[10px] font-mono uppercase tracking-widest text-neutral-500">
                      Loading orders...
                    </p>
                  </div>
                ) : !recentOrder ? (
                  /* EMPTY ORDER STATE */
                  <div className="py-10 text-center space-y-4">
                    <div className="w-12 h-12 rounded-full border border-white/10 bg-neutral-900 mx-auto flex items-center justify-center text-neutral-500 text-lg">
                      🛍️
                    </div>
                    <div>
                      <h4 className="text-lg font-bold tracking-tight text-white">
                        Your journey starts here.
                      </h4>
                      <p className="text-xs text-neutral-400 mt-1 max-w-sm mx-auto">
                        Explore VÉRANE luxury pieces and elevate your wardrobe.
                      </p>
                    </div>
                    <Link
                      href="/catalog"
                      className="inline-block px-6 py-2.5 rounded-full bg-amber-400 text-black text-xs font-bold uppercase tracking-[0.15em] hover:bg-amber-300 transition mt-2"
                    >
                      Shop VÉRANE
                    </Link>
                  </div>
                ) : (
                  /* RECENT ORDER DISPLAY WITH PRODUCT THUMBNAILS */
                  <div className="mt-6 space-y-6">
                    <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl border border-white/5 bg-neutral-900/40">
                      <div>
                        <p className="text-[9px] font-mono uppercase tracking-widest text-neutral-500">
                          ORDER #
                        </p>
                        <p className="text-sm font-bold font-mono text-amber-400 mt-0.5">
                          #{recentOrder.id.slice(-8).toUpperCase()}
                        </p>
                      </div>

                      <div>
                        <p className="text-[9px] font-mono uppercase tracking-widest text-neutral-500">
                          DATE
                        </p>
                        <p className="text-xs font-medium text-neutral-300 mt-0.5">
                          {new Date(recentOrder.createdAt).toLocaleDateString("en-NG", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </p>
                      </div>

                      <div>
                        <p className="text-[9px] font-mono uppercase tracking-widest text-neutral-500">
                          STATUS
                        </p>
                        <span className="inline-block text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border border-amber-400/30 bg-amber-400/10 text-amber-400 mt-0.5">
                          {recentOrder.status}
                        </span>
                      </div>

                      <div>
                        <p className="text-[9px] font-mono uppercase tracking-widest text-neutral-500">
                          TOTAL
                        </p>
                        <p className="text-sm font-bold text-white mt-0.5">
                          ₦{Number(recentOrder.total).toLocaleString("en-NG")}
                        </p>
                      </div>
                    </div>

                    {/* PRODUCT THUMBNAIL PREVIEWS */}
                    <div className="space-y-3">
                      <p className="text-[10px] font-mono uppercase tracking-widest text-neutral-500">
                        ITEMS PREVIEW
                      </p>
                      <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-none">
                        {recentOrder.items?.map((item) => {
                          const prod = item.collaborationProduct || item.product;
                          const imgs = getItemImages(prod);
                          const thumbnail = imgs[0];

                          return (
                            <div
                              key={item.id}
                              className="relative flex-shrink-0 w-16 h-20 rounded-xl border border-white/10 bg-neutral-900 overflow-hidden group"
                              title={prod?.name || "Product"}
                            >
                              {thumbnail ? (
                                <img
                                  src={thumbnail}
                                  alt={prod?.name || "Product thumbnail"}
                                  loading="lazy"
                                  decoding="async"
                                  sizes="64px"
                                  className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-[9px] font-mono text-neutral-600 uppercase">
                                  VÉRANE
                                </div>
                              )}
                              <span className="absolute bottom-1 right-1 bg-black/80 text-white text-[8px] font-bold px-1 rounded font-mono">
                                x{item.quantity}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-white/5 flex items-center justify-between text-xs text-neutral-500 font-mono">
                <span>Direct delivery & status history</span>
                <Link href="/orders" className="hover:text-amber-400 transition">
                  Manage purchases →
                </Link>
              </div>
            </div>

            {/* SAVED LOOKS & FAVORITES CARD (Lg Col 5) */}
            <div className="lg:col-span-5 border border-white/10 bg-neutral-950 rounded-[2rem] p-6 sm:p-8 flex flex-col justify-between space-y-6 hover:border-white/20 transition">
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <span className="text-amber-400 text-sm">✦</span>
                    <h3 className="text-xs font-mono uppercase tracking-[0.25em] font-bold text-white">
                      SAVED LOOKS & PIECES
                    </h3>
                  </div>

                  <span className="text-[10px] font-mono uppercase tracking-widest text-amber-400">
                    {wishlist.length} {wishlist.length === 1 ? "PIECE" : "PIECES"}
                  </span>
                </div>

                {loadingWishlist ? (
                  <div className="py-12 text-center space-y-3">
                    <div className="mx-auto h-5 w-5 animate-spin rounded-full border border-amber-400 border-t-transparent" />
                    <p className="text-[10px] font-mono uppercase tracking-widest text-neutral-500">
                      Loading saved looks...
                    </p>
                  </div>
                ) : wishlist.length === 0 ? (
                  /* EMPTY SAVED LOOKS STATE */
                  <div className="py-10 text-center space-y-4">
                    <div className="w-12 h-12 rounded-full border border-white/10 bg-neutral-900 mx-auto flex items-center justify-center text-neutral-500 text-lg">
                      ✨
                    </div>
                    <div>
                      <h4 className="text-lg font-bold tracking-tight text-white">
                        Build your first look.
                      </h4>
                      <p className="text-xs text-neutral-400 mt-1 max-w-xs mx-auto">
                        Mix UTHY luxury clothing with ALOMZIEE footwear in real time.
                      </p>
                    </div>
                    <Link
                      href="/outfit-builder"
                      className="inline-block px-6 py-2.5 rounded-full bg-white text-black text-xs font-bold uppercase tracking-[0.15em] hover:bg-amber-400 transition mt-2"
                    >
                      Open Outfit Builder
                    </Link>
                  </div>
                ) : (
                  /* WISHLIST / SAVED PIECES PREVIEWS */
                  <div className="mt-6 space-y-4">
                    <div className="grid grid-cols-3 gap-3">
                      {wishlist.slice(0, 3).map((item) => {
                        const imgs = getItemImages(item.product);
                        const thumbnail = imgs[0];

                        return (
                          <Link
                            key={item.id}
                            href={`/product/${item.productId}`}
                            className="group relative aspect-square rounded-xl border border-white/10 bg-neutral-900 overflow-hidden"
                          >
                            {thumbnail ? (
                              <img
                                src={thumbnail}
                                alt={item.product?.name || "Wishlist item"}
                                loading="lazy"
                                decoding="async"
                                sizes="(max-width: 1024px) 33vw, 150px"
                                className="w-full h-full object-cover group-hover:scale-110 transition duration-500"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-[9px] font-mono text-neutral-600">
                                VÉRANE
                              </div>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition flex items-end p-2">
                              <p className="text-[9px] font-bold truncate text-white">
                                {item.product?.name}
                              </p>
                            </div>
                          </Link>
                        );
                      })}
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Link
                        href="/wishlist"
                        className="flex-1 py-2.5 rounded-xl border border-white/10 bg-neutral-900 text-center text-xs font-mono font-bold uppercase tracking-wider text-white hover:border-white/30 transition"
                      >
                        View Wishlist
                      </Link>
                      <Link
                        href="/outfit-builder"
                        className="flex-1 py-2.5 rounded-xl bg-amber-400 text-center text-xs font-mono font-bold uppercase tracking-wider text-black hover:bg-amber-300 transition"
                      >
                        Outfit Builder
                      </Link>
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-white/5 flex items-center justify-between text-xs text-neutral-500 font-mono">
                <span>Personal styling studio</span>
                <Link href="/outfit-builder" className="hover:text-amber-400 transition">
                  Create look →
                </Link>
              </div>
            </div>

          </div>
        </section>

        {/* 4. VÉRANE BRAND SECTION */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-amber-400 font-bold">
                THE TWO HOUSES
              </p>
              <h2 className="text-2xl font-black tracking-tight mt-1 text-white">
                YOUR VÉRANE BRANDS
              </h2>
            </div>
            <span className="h-px bg-white/10 flex-1 ml-6" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* ALOMZIEE FOOTIES PANEL */}
            <Link
              href="/storefront/ALOMZIEE_FOOTIES"
              className="group relative overflow-hidden rounded-[2rem] border border-white/10 bg-neutral-950 p-8 sm:p-10 flex flex-col justify-between min-h-[260px] hover:border-amber-400/40 transition duration-500"
            >
              <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition duration-500">
                <span className="text-8xl font-black font-serif text-white">A</span>
              </div>

              <div className="relative z-10 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-mono font-bold uppercase tracking-[0.3em] text-amber-400">
                    FOOTWEAR & ACCESSORIES
                  </span>
                  <span className="text-xs font-mono text-neutral-500 group-hover:text-amber-400 transition">
                    Explore Store →
                  </span>
                </div>

                <div>
                  {settings.alomzieeLogo ? (
                    <img
                      src={settings.alomzieeLogo}
                      alt="ALOMZIEE FOOTIES"
                      className="h-8 sm:h-10 w-auto object-contain mb-2"
                    />
                  ) : (
                    <h3 className="text-3xl sm:text-4xl font-black tracking-tighter text-white group-hover:text-amber-300 transition">
                      ALOMZIEE FOOTIES
                    </h3>
                  )}
                  <p className="text-xs text-neutral-400 mt-2 max-w-sm leading-relaxed">
                    Sculptural footwear, luxury soles, and handcrafted leather accessories engineered for distinct style.
                  </p>
                </div>
              </div>

              <div className="relative z-10 pt-6 border-t border-white/10 flex items-center justify-between text-xs font-mono text-neutral-400">
                <span>View catalog & releases</span>
                <span className="w-8 h-8 rounded-full border border-white/20 flex items-center justify-center group-hover:bg-amber-400 group-hover:text-black group-hover:border-amber-400 transition">
                  →
                </span>
              </div>
            </Link>

            {/* UTHY LUXURY PANEL */}
            <Link
              href="/storefront/UTHY_LUXURY"
              className="group relative overflow-hidden rounded-[2rem] border border-white/10 bg-neutral-950 p-8 sm:p-10 flex flex-col justify-between min-h-[260px] hover:border-amber-400/40 transition duration-500"
            >
              <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition duration-500">
                <span className="text-8xl font-black font-serif text-white">U</span>
              </div>

              <div className="relative z-10 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-mono font-bold uppercase tracking-[0.3em] text-amber-400">
                    HAUTE COUTURE & GARMENTS
                  </span>
                  <span className="text-xs font-mono text-neutral-500 group-hover:text-amber-400 transition">
                    Explore Store →
                  </span>
                </div>

                <div>
                  {settings.uthyLogo ? (
                    <img
                      src={settings.uthyLogo}
                      alt="UTHY LUXURY"
                      className="h-8 sm:h-10 w-auto object-contain mb-2"
                    />
                  ) : (
                    <h3 className="text-3xl sm:text-4xl font-black tracking-tighter text-white group-hover:text-amber-300 transition">
                      UTHY LUXURY
                    </h3>
                  )}
                  <p className="text-xs text-neutral-400 mt-2 max-w-sm leading-relaxed">
                    Bespoke clothing, contemporary silhouettes, and refusal to look ordinary.
                  </p>
                </div>
              </div>

              <div className="relative z-10 pt-6 border-t border-white/10 flex items-center justify-between text-xs font-mono text-neutral-400">
                <span>View collection & capsules</span>
                <span className="w-8 h-8 rounded-full border border-white/20 flex items-center justify-center group-hover:bg-amber-400 group-hover:text-black group-hover:border-amber-400 transition">
                  →
                </span>
              </div>
            </Link>

          </div>
        </section>

        {/* 5. SAVED ADDRESSES & DELIVERY PREFERENCES */}
        <section className="border border-white/10 bg-neutral-950 rounded-[2.5rem] p-8 sm:p-10 space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
            <div>
              <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-amber-400 font-bold">
                DELIVERY PREFERENCES
              </p>
              <h2 className="text-2xl font-black tracking-tight mt-1 text-white">
                SAVED ADDRESSES
              </h2>
              <p className="text-xs text-neutral-400 mt-1">
                Manage primary shipping destinations for effortless checkout across both houses.
              </p>
            </div>

            <button
              type="button"
              onClick={handleOpenAddForm}
              className="px-6 py-3 rounded-full bg-amber-400 text-black text-xs font-bold uppercase tracking-wider hover:bg-amber-300 transition self-start sm:self-auto"
            >
              + Add New Address
            </button>
          </div>

          {/* ADDRESS FORM MODAL / INLINE VIEW */}
          {addressFormOpen && (
            <div className="p-6 rounded-2xl bg-black border border-amber-400/30 space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-amber-400">
                  {editingAddressId ? "Edit Address" : "Add New Delivery Destination"}
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
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-mono">
                  {addressError}
                </div>
              )}

              <form onSubmit={handleSaveAddress} className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
                <div>
                  <label className="block text-[10px] uppercase text-neutral-400 mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={formState.fullName}
                    onChange={(e) => setFormState({ ...formState, fullName: e.target.value })}
                    className="w-full rounded-xl border border-white/10 bg-neutral-900 px-4 py-2.5 text-white outline-none focus:border-amber-400"
                    placeholder="Recipient Name"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase text-neutral-400 mb-1">Phone Number *</label>
                  <input
                    type="tel"
                    required
                    value={formState.phone}
                    onChange={(e) => setFormState({ ...formState, phone: e.target.value })}
                    className="w-full rounded-xl border border-white/10 bg-neutral-900 px-4 py-2.5 text-white outline-none focus:border-amber-400"
                    placeholder="+234..."
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase text-neutral-400 mb-1">Country</label>
                  <input
                    type="text"
                    readOnly
                    value={formState.country}
                    className="w-full rounded-xl border border-white/5 bg-neutral-900/50 px-4 py-2.5 text-neutral-400"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase text-neutral-400 mb-1">State / Region *</label>
                  <select
                    value={formState.state}
                    onChange={(e) => {
                      const newSt = e.target.value;
                      const firstLga = NIGERIA_LOCATIONS[newSt]?.[0] || "";
                      setFormState({ ...formState, state: newSt, city: firstLga });
                    }}
                    className="w-full rounded-xl border border-white/10 bg-neutral-900 px-4 py-2.5 text-white outline-none focus:border-amber-400"
                  >
                    {NIGERIAN_STATES.map((st) => (
                      <option key={st} value={st}>{st}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] uppercase text-neutral-400 mb-1">LGA / City *</label>
                  <select
                    value={formState.city}
                    onChange={(e) => setFormState({ ...formState, city: e.target.value })}
                    className="w-full rounded-xl border border-white/10 bg-neutral-900 px-4 py-2.5 text-white outline-none focus:border-amber-400"
                  >
                    {(NIGERIA_LOCATIONS[formState.state] || []).map((lga) => (
                      <option key={lga} value={lga}>{lga}</option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[10px] uppercase text-neutral-400 mb-1">Street Address *</label>
                  <input
                    type="text"
                    required
                    value={formState.streetAddress}
                    onChange={(e) => setFormState({ ...formState, streetAddress: e.target.value })}
                    className="w-full rounded-xl border border-white/10 bg-neutral-900 px-4 py-2.5 text-white outline-none focus:border-amber-400"
                    placeholder="House number, street name, apartment/suite"
                  />
                </div>

                <div className="sm:col-span-2 flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="isDefaultCheck"
                    checked={formState.isDefault}
                    onChange={(e) => setFormState({ ...formState, isDefault: e.target.checked })}
                    className="accent-amber-400"
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
                    className="px-6 py-2.5 rounded-xl bg-amber-400 text-black font-bold uppercase tracking-wider hover:bg-amber-300 disabled:opacity-50"
                  >
                    {savingAddress ? "Saving..." : "Save Address"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ADDRESS LIST */}
          {loadingAddresses ? (
            <p className="text-xs font-mono text-neutral-500 uppercase tracking-widest animate-pulse">
              Loading addresses...
            </p>
          ) : addresses.length === 0 ? (
            <p className="text-xs text-neutral-400 font-mono">
              No saved addresses yet. Click &quot;+ Add New Address&quot; to register your delivery destination.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                      <p className="text-sm font-bold text-white">{addr.fullName}</p>
                      {addr.isDefault && (
                        <span className="px-2.5 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase tracking-wider bg-amber-400 text-black">
                          DEFAULT
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-mono text-neutral-400 mt-1">{addr.phone}</p>
                    <p className="text-xs text-neutral-300 mt-3 leading-relaxed">
                      {addr.streetAddress}<br />
                      {addr.city}, {addr.state}<br />
                      {addr.country}
                    </p>
                  </div>

                  <div className="border-t border-white/10 pt-4 flex items-center justify-between text-xs font-mono">
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
        </section>

        {/* 6. ACCOUNT SETTINGS & UTILITY LINKS */}
        <section className="space-y-6 pt-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-mono uppercase tracking-[0.35em] text-neutral-500 font-bold">
              ACCOUNT CONTROLS & SECURITY
            </h2>
            <span className="h-px bg-white/10 flex-1 ml-6" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link
              href="/orders"
              className="group border border-white/10 bg-neutral-950 rounded-2xl p-6 hover:border-white/30 transition flex flex-col justify-between h-32"
            >
              <div>
                <p className="text-xs font-mono font-bold uppercase tracking-wider text-white group-hover:text-amber-400 transition">
                  ORDER HISTORY
                </p>
                <p className="text-[10px] text-neutral-400 mt-1">
                  Track and review purchases
                </p>
              </div>
              <p className="text-[10px] font-mono text-neutral-500 group-hover:text-white transition">
                View orders →
              </p>
            </Link>

            <Link
              href="/wishlist"
              className="group border border-white/10 bg-neutral-950 rounded-2xl p-6 hover:border-white/30 transition flex flex-col justify-between h-32"
            >
              <div>
                <p className="text-xs font-mono font-bold uppercase tracking-wider text-white group-hover:text-amber-400 transition">
                  WISHLIST & SAVED
                </p>
                <p className="text-[10px] text-neutral-400 mt-1">
                  Your curated luxury pieces
                </p>
              </div>
              <p className="text-[10px] font-mono text-neutral-500 group-hover:text-white transition">
                View saved →
              </p>
            </Link>

            <Link
              href="/outfit-builder"
              className="group border border-white/10 bg-neutral-950 rounded-2xl p-6 hover:border-white/30 transition flex flex-col justify-between h-32"
            >
              <div>
                <p className="text-xs font-mono font-bold uppercase tracking-wider text-white group-hover:text-amber-400 transition">
                  OUTFIT BUILDER
                </p>
                <p className="text-[10px] text-neutral-400 mt-1">
                  Mix UTHY & ALOMZIEE
                </p>
              </div>
              <p className="text-[10px] font-mono text-neutral-500 group-hover:text-white transition">
                Open studio →
              </p>
            </Link>

            <button
              onClick={logout}
              disabled={loggingOut}
              className="group text-left border border-white/10 bg-neutral-950 rounded-2xl p-6 hover:border-red-500/40 hover:bg-red-500/5 transition flex flex-col justify-between h-32"
            >
              <div>
                <p className="text-xs font-mono font-bold uppercase tracking-wider text-white group-hover:text-red-400 transition">
                  {loggingOut ? "SIGNING OUT..." : "SIGN OUT"}
                </p>
                <p className="text-[10px] text-neutral-400 mt-1">
                  Securely exit session
                </p>
              </div>
              <p className="text-[10px] font-mono text-neutral-500 group-hover:text-red-400 transition">
                Leave studio →
              </p>
            </button>
          </div>
        </section>

      </div>
    </main>
  );
}