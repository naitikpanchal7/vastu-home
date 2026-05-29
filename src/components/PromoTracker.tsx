"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

export default function PromoTracker() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const promo = searchParams.get("promo");
    if (promo && promo.trim()) {
      localStorage.setItem("pending_promo", promo.trim().toUpperCase());
    }
  }, [searchParams]);

  return null;
}
