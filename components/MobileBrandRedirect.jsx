"use client";

import { useEffect } from "react";

const BRAND_ROUTES = {
  UTHY_LUXURY: "/storefront/UTHY_LUXURY",
  ALOMZIEE_FOOTIES: "/storefront/ALOMZIEE_FOOTIES",
};

export default function MobileBrandRedirect() {
  useEffect(() => {
    function handleClick(event) {
      if (window.innerWidth >= 1024) return;

      const link = event.target.closest("a[href]");
      if (!link) return;

      const url = new URL(link.href, window.location.origin);
      if (url.pathname !== "/catalog") return;

      const brand = url.searchParams.get("brand");
      const destination = BRAND_ROUTES[brand];
      if (!destination) return;

      event.preventDefault();
      window.location.assign(destination);
    }

    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  return null;
}
