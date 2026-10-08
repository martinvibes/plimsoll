"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const two = (n: number) => String(n).padStart(2, "0");

function left(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(s / 86400),
    h = Math.floor((s % 86400) / 3600),
    m = Math.floor((s % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${two(m)}m`;
  return `${m}:${two(s % 60)}`;
}

/** Time until `to`, ticking. Refreshes the page the moment it passes. */
export default function Countdown({ to, prefix = "closes in" }: { to: string; prefix?: string }) {
  const router = useRouter();
  const target = new Date(to).getTime();
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const timer = setInterval(() => {
      const t = Date.now();
      setNow(t);
      if (t >= target && t - 1000 < target) router.refresh();
    }, 1000);
    return () => clearInterval(timer);
  }, [target, router]);
  if (now === null) return <span suppressHydrationWarning>{prefix} …</span>;
  return <span style={{ fontVariantNumeric: "tabular-nums" }}>{now >= target ? "closed" : `${prefix} ${left(target - now)}`}</span>;
}
