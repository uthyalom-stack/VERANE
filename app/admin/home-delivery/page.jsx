"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LegacyHomeDeliveryRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/admin/delivery");
  }, [router]);

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <p className="text-xs text-neutral-500 animate-pulse font-mono">
        Redirecting to Delivery Settings...
      </p>
    </div>
  );
}
