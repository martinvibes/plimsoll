"use client";

import { useEffect, useRef, useState } from "react";
import { Check, X } from "lucide-react";
import { NODE_NAMES } from "@/lib/plimsoll/personas";
import { useSlideActive } from "./useSlideActive";
import styles from "./Slides.module.css";

type Props = { fee: number; mark?: { name: string; mean: number; spread: number } };

const STEPS = [900, 1500, 1500, 2800];

/** A reader's purchase, played out: three fee legs and the mark settle in one
 *  transaction, or nothing does. */
export default function AtomicDemo({ fee, mark }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const active = useSlideActive(ref);
  const [phase, setPhase] = useState(0);
  const [short, setShort] = useState(false);

  useEffect(() => {
    if (!active) return setPhase(0);
    const timer = setTimeout(() => setPhase((p) => (p + 1) % STEPS.length), STEPS[phase]);
    return () => clearTimeout(timer);
  }, [active, phase]);

  const failed = short && phase === 3;
  const status = [
    `Northbank asks for the ${mark?.name ?? "latest"} mark.`,
    `Its wallet allocates ${fee} CC to each node’s leg.`,
    "The executor settles every leg and hands over the mark, in one transaction.",
    failed ? "Leg 2 was short. Nothing settled, and no mark was delivered." : "Settled. Three fees paid, one mark delivered.",
  ][phase];

  return (
    <div ref={ref} className={styles.atomic} data-phase={phase} data-short={short || undefined}>
      <div className={styles.stage}>
        <div className={styles.wallet}>
          <span className={styles.chip} data-role="reader">
            N
          </span>
          <div>
            <strong>Northbank</strong>
            <small>{fee * 3} CC for three legs</small>
          </div>
        </div>
        <ol className={styles.legs}>
          {NODE_NAMES.map((name, i) => (
            <li key={name} data-leg={i + 1}>
              <span className={styles.wire}>
                <i />
              </span>
              <span className={styles.node}>
                <span className={styles.chip} data-role="node">
                  {i + 1}
                </span>
                <span>
                  <strong>{name.split(" ")[0]}</strong>
                  <small>
                    fee-{i + 1} · {short && i === 1 ? `${fee - 5}` : fee} CC
                  </small>
                </span>
              </span>
            </li>
          ))}
        </ol>
      </div>
      <div className={styles.delivery} data-failed={failed || undefined}>
        {failed ? <X size={18} aria-hidden="true" /> : <Check size={18} aria-hidden="true" />}
        {failed ? (
          <span>Rolled back</span>
        ) : (
          <span>
            {mark ? `${mark.name} · ${mark.mean.toFixed(2)} ± ${mark.spread.toFixed(2)}` : "The mark"} → Northbank
          </span>
        )}
      </div>
      <p className={styles.status} role="status" key={`${phase}-${short}`}>
        {status}
      </p>
      <label className={styles.toggle}>
        <input type="checkbox" checked={short} onChange={(e) => setShort(e.target.checked)} />
        <span aria-hidden="true" />
        Fund leg 2 short
      </label>
    </div>
  );
}
