"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

export default function SiteFooter() {
  const [settings, setSettings] = useState({});

  useEffect(() => {
    fetch("/api/settings").then(r => r.json()).then(setSettings);
  }, []);

  const footerNav = [];
  if (settings.footerLinks) {
    settings.footerLinks.split("\n").forEach(line => {
      const parts = line.split(":");
      if (parts.length >= 2) {
        const label = parts[0].trim();
        const href = parts.slice(1).join(":").trim();
        if (label && href) footerNav.push({ label, href });
      }
    });
  }

  if (footerNav.length === 0) {
    footerNav.push(
      { label: "About", href: "/about" },
      { label: "Contact", href: "/contact" },
      { label: "FAQ", href: "/faq" }
    );
  }

  return (
    <footer className="border-t border-white/5 bg-neutral-950">
      <div className="max-w-7xl mx-auto px-5 py-12 grid grid-cols-2 md:grid-cols-4 gap-8">
        <div>
          <h3 className="text-amber-500 font-black text-lg">{settings.siteName || "VÉRANE"}</h3>
          <p className="text-neutral-500 text-sm mt-2">{settings.footerDescription || settings.tagline || "Two brands. One expression."}</p>
        </div>
        <div>
          <h4 className="font-bold text-sm mb-3">Quick Links</h4>
          <div className="space-y-2 text-sm text-neutral-500">
            {footerNav.map(link => (
              <Link key={link.href} href={link.href} className="block hover:text-white transition">{link.label}</Link>
            ))}
          </div>
        </div>
        <div>
          <h4 className="font-bold text-sm mb-3">Contact</h4>
          <div className="space-y-2 text-sm text-neutral-500">
            {settings.email && <p>{settings.email}</p>}
            {settings.phone && <p>{settings.phone}</p>}
            {settings.whatsapp && <p>WhatsApp: {settings.whatsapp}</p>}
          </div>
        </div>
        <div>
          <h4 className="font-bold text-sm mb-3">Follow</h4>
          <div className="space-y-2 text-sm text-neutral-500">
            {settings.instagram && <a href={settings.instagram} target="_blank" className="block hover:text-white transition">Instagram</a>}
            {settings.facebook && <a href={settings.facebook} target="_blank" className="block hover:text-white transition">Facebook</a>}
            {settings.tiktok && <a href={settings.tiktok} target="_blank" className="block hover:text-white transition">TikTok</a>}
          </div>
        </div>
      </div>
      <div className="border-t border-white/5 text-center py-4 text-xs text-neutral-600">
        {settings.footerText || "© 2026 " + (settings.siteName || "VÉRANE") + ". All rights reserved."}
      </div>
    </footer>
  );
}