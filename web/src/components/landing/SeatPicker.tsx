"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight } from "lucide-react";
import { choosePersona } from "@/app/actions";
import styles from "./Slides.module.css";

const SEATS = [
  { key: "ashgrove", role: "fund", title: "A fund", who: "Ashgrove Credit", line: "Split your price and send it.", href: "/contribute" },
  { key: "sextant", role: "node", title: "A node", who: "Sextant Valuation", line: "Sum what you can’t read. Publish.", href: "/nodes" },
  { key: "northbank", role: "reader", title: "A lender", who: "Northbank", line: "Pay three nodes. Get the mark.", href: "/marks" },
  { key: "ledgerwise", role: "auditor", title: "An auditor", who: "Ledgerwise Audit", line: "Rebuild what your client sent.", href: "/audit" },
] as const;

/** Enter the app as one of the parties. */
export default function SeatPicker() {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <div className={styles.seatsPick} data-pending={pending || undefined}>
      {SEATS.map((seat, i) => (
        <button
          key={seat.key}
          type="button"
          className={`${styles.seatCard} r`}
          style={{ "--d": i + 3 } as React.CSSProperties}
          data-role={seat.role}
          onClick={() =>
            start(async () => {
              await choosePersona(seat.key);
              router.push(seat.href);
            })
          }
        >
          <span className="persona-avatar" data-role={seat.role}>
            {seat.who[0]}
          </span>
          <small>{seat.title}</small>
          <strong>{seat.who}</strong>
          <span>{seat.line}</span>
          <ArrowUpRight size={18} aria-hidden="true" />
        </button>
      ))}
    </div>
  );
}
