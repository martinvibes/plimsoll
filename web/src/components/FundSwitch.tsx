"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, LoaderCircle } from "lucide-react";
import { choosePersona } from "@/app/actions";
import { PERSONAS } from "@/lib/plimsoll/personas";
import styles from "./FundSwitch.module.css";

/** The demo plays every fund: hop to another one to mark the same round. */
export default function FundSwitch({ current }: { current: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [chosen, setChosen] = useState<string | null>(null);
  return (
    <section className={styles.switch} data-pending={pending || undefined}>
      <header>
        <strong>Play another fund</strong>
        <span>Five marks open a round.</span>
      </header>
      <div className={styles.list}>
        {PERSONAS.filter((p) => p.role === "fund" && p.key !== current).map((p) => (
          <button
            key={p.key}
            type="button"
            data-chosen={(pending && chosen === p.key) || undefined}
            onClick={() => {
              setChosen(p.key);
              start(async () => {
                await choosePersona(p.key);
                router.refresh();
              });
            }}
          >
            <span className="persona-avatar" data-role="fund">
              {p.name[0]}
            </span>
            <span className={styles.name}>
              {p.name.split(" ")[0]}
              {p.tag && <em data-tag={p.tag}>{p.tag}</em>}
            </span>
            {pending && chosen === p.key ? (
              <LoaderCircle size={15} className="spin" aria-hidden="true" />
            ) : (
              <ArrowRight size={15} aria-hidden="true" />
            )}
          </button>
        ))}
      </div>
    </section>
  );
}
