"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, LoaderCircle } from "lucide-react";
import { choosePersona } from "@/app/actions";
import { PERSONAS, ROLE_GROUP, ROLE_HINT, ROLE_LABEL, type Persona, type Role } from "@/lib/plimsoll/personas";
import { ROLE_ICON } from "./roleIcons";
import styles from "./PersonaMenu.module.css";

const ROLES = Object.keys(ROLE_GROUP) as Role[];
const NODE_KEYS = PERSONAS.filter((p) => p.role === "node").map((p) => p.key);

/** Switch who the demo acts as. Each persona is a separate Canton party. */
export default function PersonaMenu({ current }: { current: Pick<Persona, "key" | "name" | "role"> }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  function pick(key: string) {
    setOpen(false);
    if (key === current.key) return;
    start(async () => {
      await choosePersona(key);
      router.refresh();
    });
  }

  return (
    <div className={styles.root} ref={root}>
      <button
        type="button"
        className={styles.trigger}
        data-role={current.role}
        aria-haspopup="listbox"
        aria-expanded={open}
        data-pending={pending || undefined}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="persona-avatar" data-role={current.role} data-current>
          {pending ? <LoaderCircle size={16} className={styles.spin} aria-hidden="true" /> : current.name[0]}
        </span>
        <span className={styles.who}>
          <small>
            Acting as <b>{ROLE_LABEL[current.role]}</b>
          </small>
          {current.name}
        </span>
        <ChevronDown size={16} className={styles.chevron} aria-hidden="true" />
      </button>
      {open && (
        <div className={styles.menu} role="listbox" aria-label="Act as">
          <header className={styles.head}>
            <strong>Switch party</strong>
            <span>Every screen re-reads the ledger as them.</span>
          </header>
          {ROLES.map((role, g) => {
            const Icon = ROLE_ICON[role];
            return (
              <div
                key={role}
                role="group"
                aria-label={ROLE_GROUP[role]}
                className={styles.group}
                data-role={role}
                style={{ "--g": g } as React.CSSProperties}
              >
                <p className={styles.label}>
                  <Icon size={13} aria-hidden="true" />
                  {ROLE_GROUP[role]}
                  <span>{ROLE_HINT[role]}</span>
                </p>
                <div className={role === "fund" ? styles.tiles : styles.rows}>
                  {PERSONAS.filter((p) => p.role === role).map((p) => {
                    const seat = NODE_KEYS.indexOf(p.key) + 1;
                    return (
                      <button
                        key={p.key}
                        type="button"
                        role="option"
                        data-role={p.role}
                        aria-selected={p.key === current.key}
                        onClick={() => pick(p.key)}
                      >
                        <span className="persona-avatar" data-role={p.role} data-current={p.key === current.key || undefined}>
                          {p.name[0]}
                          {p.key === current.key && (
                            <b className={styles.check}>
                              <Check size={10} strokeWidth={3} aria-hidden="true" />
                            </b>
                          )}
                        </span>
                        <span className={styles.option}>
                          <strong>{p.name}</strong>
                          {role === "fund" ? (
                            p.tag && <em data-tag={p.tag}>{p.tag}</em>
                          ) : (
                            <small>{role === "node" ? `Seat ${seat}` : p.blurb}</small>
                          )}
                        </span>
                        {role === "node" && (
                          <span className={styles.shares} aria-label="Shares this seat holds">
                            {[1, 2, 3]
                              .filter((k) => k !== seat)
                              .map((k) => (
                                <i key={k} data-share={k}>
                                  s{k}
                                </i>
                              ))}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
          <footer className={styles.foot}>
            Each persona is its own Canton party <kbd>Esc</kbd>
          </footer>
        </div>
      )}
    </div>
  );
}
