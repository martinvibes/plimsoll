"use client";

import { useEffect, useRef, useState } from "react";
import { useSlideActive } from "./useSlideActive";

/** A figure that counts up each time its slide comes into view. */
export default function CountUp({ value, places = 0, duration = 1200 }: { value: number; places?: number; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const active = useSlideActive(ref);
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (!active) return setShown(0);
    let frame = 0;
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      setShown(value * (1 - Math.pow(1 - t, 4)));
      if (t < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [active, value, duration]);
  return (
    <span ref={ref} style={{ fontVariantNumeric: "tabular-nums" }}>
      {shown.toLocaleString("en-US", { minimumFractionDigits: places, maximumFractionDigits: places })}
    </span>
  );
}
