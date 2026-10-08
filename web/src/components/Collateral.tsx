"use client";

import { useState } from "react";
import styles from "./Collateral.module.css";

type Props = { mean: number; spread: number };

const money = (v: number) => v.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

/** A NAV lender's borrowing base for one loan: the lower of the fund's own
 *  mark and the consensus less one standard deviation, times the advance
 *  rate. Computed here, in the reader's browser; nothing is sent anywhere. */
export default function Collateral({ mean, spread }: Props) {
  const [face, setFace] = useState("25000000");
  const [fundMark, setFundMark] = useState((mean + 1.5).toFixed(2));
  const [advance, setAdvance] = useState("60");

  const faceValue = Number(face) || 0;
  const own = Number(fundMark) || 0;
  const independent = mean - spread;
  const used = Math.min(own, independent);
  const rate = (Number(advance) || 0) / 100;
  const base = (faceValue * used * rate) / 100;
  const onFundsWord = (faceValue * own * rate) / 100;

  return (
    <div className={styles.calc}>
      <div className={styles.inputs}>
        <label>
          Face held
          <input inputMode="numeric" value={face} onChange={(e) => setFace(e.target.value.replace(/[^\d]/g, ""))} />
        </label>
        <label>
          Fund’s own mark
          <input inputMode="decimal" value={fundMark} onChange={(e) => setFundMark(e.target.value)} />
        </label>
        <label>
          Advance rate %
          <input inputMode="decimal" value={advance} onChange={(e) => setAdvance(e.target.value)} />
        </label>
      </div>
      <dl className={styles.out}>
        <div>
          <dt>Price used</dt>
          <dd>
            {used.toFixed(2)}
            <small>{used === own ? "fund’s mark" : "consensus − 1σ"}</small>
          </dd>
        </div>
        <div>
          <dt>Borrowing base</dt>
          <dd>{money(base)}</dd>
        </div>
        <div>
          <dt>On the fund’s word alone</dt>
          <dd className={styles.muted}>{money(onFundsWord)}</dd>
        </div>
      </dl>
      {onFundsWord > base && (
        <p className="hint">
          The independent price holds back {money(onFundsWord - base)} the fund’s own mark would have lent.
        </p>
      )}
    </div>
  );
}
