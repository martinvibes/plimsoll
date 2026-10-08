"use client";

import { useEffect, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";
import { PRIME, shareOut, type Share } from "@/lib/plimsoll/shares";
import { useSlideActive } from "./useSlideActive";
import styles from "./Slides.module.css";

const DIGITS = "0123456789";

/** Digits that roll before they settle, like a counter at a station. */
function Rolling({ value }: { value: string }) {
  const [text, setText] = useState(value);
  useEffect(() => {
    let frame = 0;
    const start = performance.now();
    const step = (now: number) => {
      const settled = Math.floor(((now - start) / 520) * value.length);
      setText(
        value
          .split("")
          .map((c, i) => (i < settled ? c : DIGITS[Math.floor(Math.random() * 10)]))
          .join(""),
      );
      if (settled < value.length) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [value]);
  return <>{text}</>;
}

/** Split a price into three shares, live, in the visitor's own browser. */
export default function SplitDemo() {
  const ref = useRef<HTMLDivElement>(null);
  const active = useSlideActive(ref);
  const [mark, setMark] = useState(9425);
  const [shares, setShares] = useState<Share[] | null>(null);
  const [round, setRound] = useState(0);

  useEffect(() => setShares(shareOut(mark)), [mark, round]);
  useEffect(() => {
    if (!active) return;
    const timer = setInterval(() => setRound((r) => r + 1), 3200);
    return () => clearInterval(timer);
  }, [active]);

  const total = shares ? shares.reduce((acc, s) => (acc + s.value) % PRIME, 0n) : 0n;
  return (
    <div ref={ref} className={styles.split}>
      <label className={styles.markInput}>
        <span>Your price for the loan</span>
        <output>{(mark / 100).toFixed(2)}</output>
        <input
          type="range"
          min={8000}
          max={10200}
          step={5}
          value={mark}
          onChange={(e) => setMark(Number(e.target.value))}
          aria-label="Your price, in points of par"
        />
      </label>
      <ol className={styles.shares}>
        {(shares ?? [0, 1, 2].map((i) => ({ index: i + 1, value: 0n, square: 0n }))).map((s) => (
          <li key={s.index} data-share={s.index}>
            <small>
              s<sub>{s.index}</sub> → seats {[1, 2, 3].filter((k) => k !== s.index).join(" & ")}
            </small>
            <code>{shares ? <Rolling value={s.value.toString().padStart(19, "0")} /> : "·".repeat(19)}</code>
          </li>
        ))}
      </ol>
      <div className={styles.verify}>
        <span>
          s<sub>1</sub> + s<sub>2</sub> + s<sub>3</sub> mod p =
        </span>
        <strong>{shares ? (Number(total) / 100).toFixed(2) : "—"}</strong>
        <button type="button" className="icon-button" onClick={() => setRound((r) => r + 1)} aria-label="Split again">
          <RefreshCw size={16} aria-hidden="true" />
        </button>
      </div>
      <p className={styles.footnote}>
        Real shares, from your browser’s cryptographic random source. Any one or two of them could belong to any price.
      </p>
    </div>
  );
}
