"use client";

import { useState, useTransition } from "react";
import { LoaderCircle, Lock, Send } from "lucide-react";
import { contribute } from "@/app/actions";
import { toast } from "./Toaster";
import { parcelsFor, parseMark, shareOut, toWire, type Share } from "@/lib/plimsoll/shares";
import styles from "./ContributeForm.module.css";

type Props = { roundCid: string; nodeNames: string[] };

const hex = (v: bigint) => v.toString(16).padStart(16, "0");

/** Type a mark; the browser splits it into three random shares and sends
 *  each node its parcel. The mark itself never leaves this page. */
export default function ContributeForm({ roundCid, nodeNames }: Props) {
  const [input, setInput] = useState("");
  const [parcels, setParcels] = useState<Share[][] | null>(null);
  const [status, setStatus] = useState<{ ok?: string; error?: string }>({});
  const [pending, start] = useTransition();

  function split(e: React.FormEvent) {
    e.preventDefault();
    try {
      setParcels(parcelsFor(shareOut(parseMark(input))));
      setStatus({});
    } catch (err) {
      setStatus({ error: err instanceof Error ? err.message : String(err) });
    }
  }

  function send() {
    if (!parcels) return;
    start(async () => {
      const result = await contribute(roundCid, parcels.map((p) => p.map(toWire)));
      setStatus(result);
      toast(result);
    });
  }

  return (
    <div className={styles.form}>
      <form onSubmit={split} className={styles.entry}>
        <label htmlFor={`mark-${roundCid}`}>Your mark, in points of par</label>
        <div className={styles.inputRow}>
          <input
            id={`mark-${roundCid}`}
            inputMode="decimal"
            placeholder="93.25"
            value={input}
            disabled={pending || !!status.ok}
            onChange={(e) => {
              setInput(e.target.value);
              setParcels(null);
            }}
          />
          <button className="button compact signal" disabled={!input || pending || !!status.ok}>
            <Lock size={16} aria-hidden="true" /> Split
          </button>
        </div>
      </form>

      {!parcels && !status.ok && (
        <div className={`${styles.parcels} ${styles.ghost}`} aria-hidden="true">
          {nodeNames.map((name, seat) => (
            <div key={name} className={styles.parcel}>
              <p className={styles.to}>
                Seat {seat + 1} · <strong>{name.split(" ")[0]}</strong>
              </p>
              {[1, 2, 3]
                .filter((k) => k !== seat + 1)
                .map((k) => (
                  <p key={k} className={styles.share} data-share={k}>
                    <span>s{k}</span>
                    <code>················</code>
                  </p>
                ))}
              <p className={styles.missing}>never sees s{seat + 1}</p>
            </div>
          ))}
        </div>
      )}

      {parcels && (
        <div className={styles.parcels} aria-label="The parcel each node receives">
          {parcels.map((shares, seat) => (
            <div key={seat} className={styles.parcel} style={{ animationDelay: `${seat * 90}ms` }}>
              <p className={styles.to}>
                To seat {seat + 1} · <strong>{nodeNames[seat]}</strong>
              </p>
              {shares.map((s) => (
                <p key={s.index} className={styles.share} data-share={s.index}>
                  <span>s{s.index}</span>
                  <code>{hex(s.value)}</code>
                </p>
              ))}
              <p className={styles.missing}>never sees s{seat + 1}</p>
            </div>
          ))}
        </div>
      )}

      {parcels && !status.ok && (
        <button className="button full signal" onClick={send} disabled={pending}>
          {pending ? <LoaderCircle size={16} className="spin" aria-hidden="true" /> : <Send size={16} aria-hidden="true" />}
          {pending ? "Sending three parcels…" : "Send to the panel"}
        </button>
      )}
      {status.ok && (
        <p className="result" data-ok role="status">
          {status.ok}
        </p>
      )}
      {status.error && (
        <p className="result" data-error role="alert">
          {status.error}
        </p>
      )}
    </div>
  );
}
