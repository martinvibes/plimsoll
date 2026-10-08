"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, LoaderCircle } from "lucide-react";
import { choosePersona } from "@/app/actions";
import type { Persona } from "@/lib/plimsoll/personas";
import styles from "./PersonaPicker.module.css";

type Option = Pick<Persona, "key" | "name" | "role" | "blurb" | "tag">;

/** Cards that switch the demo to another party, with a glow that follows the pointer. */
export default function PersonaPicker({ personas }: { personas: Option[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [chosen, setChosen] = useState<string | null>(null);

  function pick(key: string) {
    setChosen(key);
    start(async () => {
      await choosePersona(key);
      router.refresh();
    });
  }

  function track(e: React.PointerEvent<HTMLButtonElement>) {
    const box = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty("--mx", `${e.clientX - box.left}px`);
    e.currentTarget.style.setProperty("--my", `${e.clientY - box.top}px`);
  }

  return (
    <div className={styles.grid} data-pending={pending || undefined}>
      {personas.map((p, i) => (
        <button
          key={p.key}
          type="button"
          className={styles.card}
          data-role={p.role}
          data-chosen={(pending && chosen === p.key) || undefined}
          style={{ "--i": i } as React.CSSProperties}
          onPointerMove={track}
          onClick={() => pick(p.key)}
        >
          <span className={styles.top}>
            <span className="persona-avatar" data-role={p.role}>
              {p.name[0]}
            </span>
            {p.tag && <span className={styles.tag} data-tag={p.tag}>{p.tag}</span>}
          </span>
          <strong>{p.name}</strong>
          <small>{p.blurb}</small>
          <span className={styles.enter}>
            {pending && chosen === p.key ? (
              <>
                Switching <LoaderCircle size={15} className={styles.spin} aria-hidden="true" />
              </>
            ) : (
              <>
                Enter<span className={styles.as}>as {p.name.split(" ")[0]}</span><ArrowRight size={15} aria-hidden="true" />
              </>
            )}
          </span>
        </button>
      ))}
    </div>
  );
}
