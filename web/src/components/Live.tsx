"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Re-reads the ledger every few seconds while the tab is in view, so other
 *  parties' steps show up without a reload. */
export default function Live({ every = 5000 }: { every?: number }) {
  const router = useRouter();
  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, every);
    return () => clearInterval(timer);
  }, [router, every]);
  return null;
}
