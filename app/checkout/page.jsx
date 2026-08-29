"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function CheckoutPage() {
  const router = useRouter();
  const [processing, setProcessing] = useState(false);
  const [cart, setCart] = useState({ items: [], total: 0 });
  const [loaded, setLoaded] = useState(false);

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
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
  }, []);

  const updateField = (event) => {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
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

  const placeOrder = async () => {
    try {
      setProcessing(true);

      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cart.items,
          total: cart.total,
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email,
          phone: form.phone,
          address: form.address,
          city: form.city,
          state: form.state,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create order");
      }

      localStorage.removeItem("cart");
      router.push(`/orders?order=${data.order.orderNumber}`);
    } catch (error) {
      console.error("Checkout error:", error);
      alert(error.message);
    } finally {
      setProcessing(false);
    }
  };

  if (!loaded) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-neutral-500 text-xs uppercase tracking-[0.3em]">Loading checkout...</div>
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

        <div className="grid lg:grid-cols-[1fr_400px] gap-10 lg:gap-14">
          <section>
            <div className="border border-white/10 bg-neutral-950 rounded-[2rem] p-6 md:p-8">
              <p className="text-[10px] text-neutral-500 uppercase tracking-[0.25em] font-bold">Contact Information</p>
              <div className="grid sm:grid-cols-2 gap-4 mt-6">
                <input name="firstName" value={form.firstName} onChange={updateField} placeholder="First name" className="rounded-xl border border-white/10 bg-black px-4 py-4 text-sm outline-none placeholder:text-neutral-600 focus:border-amber-400/50" />
                <input name="lastName" value={form.lastName} onChange={updateField} placeholder="Last name" className="rounded-xl border border-white/10 bg-black px-4 py-4 text-sm outline-none placeholder:text-neutral-600 focus:border-amber-400/50" />
                <input name="email" type="email" value={form.email} onChange={updateField} placeholder="Email address" className="rounded-xl border border-white/10 bg-black px-4 py-4 text-sm outline-none placeholder:text-neutral-600 focus:border-amber-400/50" />
                <input name="phone" value={form.phone} onChange={updateField} placeholder="Phone number" className="rounded-xl border border-white/10 bg-black px-4 py-4 text-sm outline-none placeholder:text-neutral-600 focus:border-amber-400/50" />
              </div>

              <p className="text-[10px] text-neutral-500 uppercase tracking-[0.25em] font-bold mt-10">Delivery Address</p>
              <div className="space-y-4 mt-6">
                <input name="address" value={form.address} onChange={updateField} placeholder="Street address" className="w-full rounded-xl border border-white/10 bg-black px-4 py-4 text-sm outline-none placeholder:text-neutral-600 focus:border-amber-400/50" />
                <div className="grid sm:grid-cols-2 gap-4">
                  <input name="city" value={form.city} onChange={updateField} placeholder="City" className="rounded-xl border border-white/10 bg-black px-4 py-4 text-sm outline-none placeholder:text-neutral-600 focus:border-amber-400/50" />
                  <input name="state" value={form.state} onChange={updateField} placeholder="State" className="rounded-xl border border-white/10 bg-black px-4 py-4 text-sm outline-none placeholder:text-neutral-600 focus:border-amber-400/50" />
                </div>
              </div>

              <div className="mt-8 border border-white/5 rounded-2xl p-5">
                <p className="text-xs font-bold">Payment</p>
                <p className="text-xs text-neutral-500 mt-2">Payment will be connected at the final payment step. No payment is taken yet.</p>
              </div>
            </div>
          </section>

          <aside className="lg:sticky lg:top-8 h-fit">
            <div className="border border-white/10 bg-neutral-950 rounded-[2rem] p-6 md:p-8">
              <p className="text-[10px] text-neutral-500 uppercase tracking-[0.25em] font-bold">Your Order</p>
              <div className="mt-7 space-y-5">
                {cart.items.map((item, index) => {
                  const images = getImages(item.images);
                  const image = images.length > 0 ? images[0] : null;
                  const quantity = Number(item.qty || 0);
                  const price = Number(item.price || 0);
                  const variation = [item.selectedColor, item.selectedSize].filter(Boolean).join(" / ");

                  return (
                    <div key={item.cartItemKey || `${item.id}-${index}`} className="flex gap-4">
                      <div className="w-16 h-20 rounded-lg overflow-hidden bg-neutral-900 shrink-0">
                        {image ? <img src={image} alt={item.name || "Product"} className="w-full h-full object-cover" /> : null}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold">{item.name}</p>
                        {variation ? <p className="text-xs text-neutral-500 mt-1">{variation}</p> : null}
                        <p className="text-xs text-neutral-600 mt-1">Qty: {quantity}</p>
                        <p className="text-sm mt-2">₦{(price * quantity).toLocaleString()}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="border-t border-white/10 mt-7 pt-6 space-y-4">
                <div className="flex justify-between text-sm"><span className="text-neutral-500">Subtotal</span><span>₦{cart.total.toLocaleString()}</span></div>
                <div className="flex justify-between text-sm"><span className="text-neutral-500">Shipping</span><span className="text-neutral-400">Calculated later</span></div>
                <div className="border-t border-white/10 pt-5 flex justify-between"><span className="font-bold">Total</span><span className="text-2xl font-black">₦{cart.total.toLocaleString()}</span></div>
              </div>

              <button type="button" onClick={placeOrder} disabled={processing} className="mt-8 w-full rounded-full bg-amber-500 px-6 py-4 text-xs font-black uppercase tracking-[0.15em] text-black hover:bg-amber-400 transition disabled:opacity-50">
                {processing ? "Creating Order..." : "Continue to Payment"}
              </button>
              <p className="text-[10px] text-neutral-600 text-center mt-4 leading-relaxed">Your order will be securely processed.</p>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}