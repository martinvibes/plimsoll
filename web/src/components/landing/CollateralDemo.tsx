"use client";

import { useState } from "react";
import styles from "./Slides.module.css";

type Mark = { name: string; mean: number; spread: number };

const money = (v: number) =>
  v >= 1e6 ? `$${(v / 1e6).toFixed(2)}m` : v.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

/** A lender's borrowing base for one loan, on the fund's word and with an
 *  independent price: the lower of the fund's mark and consensus less 1σ. */
export default function CollateralDemo({ marks }: { marks: Mark[] }) {
  const [pick, setPick] = useState(0);
  const mark = marks[pick] ?? { name: "Example loan", mean: 93.5, spread: 1.74 };
  const [lift, setLift] = useState(1.5);
  const [advance, setAdvance] = useState(60);
  const face = 25_000_000;

  const own = mark.mean + lift;
  const independent = mark.mean - mark.spread;
  const used = Math.min(own, independent);
  const word = (face * own * advance) / 1e4;
  const base = (face * used * advance) / 1e4;
  const max = (face * 105 * advance) / 1e4;

  return (
    <div className={styles.collateral}>
      {marks.length > 1 && (
        <div className={styles.tabs} role="tablist" aria-label="Loan">
          {marks.map((m, i) => (
            <button key={m.name} type="button" role="tab" aria-selected={i === pick} onClick={() => setPick(i)}>
              {m.name}
            </button>
          ))}
        </div>
      )}
      <p className={styles.loanLine}>
        $25m face · consensus <b>{mark.mean.toFixed(2)}</b> ± {mark.spread.toFixed(2)}
      </p>
      <label className={styles.slider}>
        <span>
          Fund’s own mark <output>{own.toFixed(2)}</output>
        </span>
        <input type="range" min={-4} max={6} step={0.25} value={lift} onChange={(e) => setLift(Number(e.target.value))} />
      </label>
      <label className={styles.slider}>
        <span>
          Advance rate <output>{advance}%</output>
        </span>
        <input type="range" min={30} max={80} step={5} value={advance} onChange={(e) => setAdvance(Number(e.target.value))} />
      </label>
      <div className={styles.bars}>
        <div>
          <span>On the fund’s word</span>
          <i style={{ width: `${(word / max) * 100}%` }} data-tone="word" />
          <b>{money(word)}</b>
        </div>
        <div>
          <span>With Plimsoll</span>
          <i style={{ width: `${(base / max) * 100}%` }} data-tone="plimsoll" />
          <b>{money(base)}</b>
        </div>
      </div>
      <p className={styles.footnote}>
        {word > base
          ? `The independent price holds back ${money(word - base)} the fund’s own mark would have lent.`
          : "The fund marks below the consensus band, so its own number is the one used."}
      </p>
    </div>
  );
}
