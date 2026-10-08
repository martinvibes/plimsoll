"use client";

import { useEffect, useState } from "react";
import { Check, X } from "lucide-react";
import styles from "./Toaster.module.css";

type Toast = { id: number; ok?: string; error?: string };
const EVENT = "plimsoll:toast";

/** Announce a ledger step's outcome. It outlives the form that took the step,
 *  which often disappears once the ledger moves on. */
export function toast(result: { ok?: string; error?: string }) {
  if (result.ok || result.error) window.dispatchEvent(new CustomEvent(EVENT, { detail: result }));
}

export default function Toaster() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  useEffect(() => {
    let next = 0;
    const add = (e: Event) => {
      const id = ++next;
      setToasts((list) => [...list.slice(-2), { ...(e as CustomEvent<Toast>).detail, id }]);
      setTimeout(() => setToasts((list) => list.filter((t) => t.id !== id)), 5200);
    };
    window.addEventListener(EVENT, add);
    return () => window.removeEventListener(EVENT, add);
  }, []);
  return (
    <div className={styles.stack} aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={styles.toast} data-error={t.error ? "" : undefined} role={t.error ? "alert" : "status"}>
          {t.error ? <X size={16} aria-hidden="true" /> : <Check size={16} aria-hidden="true" />}
          <p>{t.error ?? t.ok}</p>
          <i />
        </div>
      ))}
    </div>
  );
}
