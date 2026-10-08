"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import styles from "./Deck.module.css";

/** Full-screen slides that snap one at a time, like swiping through a film.
 *  The slide in view gets `data-active`, which starts its entrance. */
export default function Deck({ children }: { children: React.ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  const [slides, setSlides] = useState<string[]>([]);
  const [active, setActive] = useState(0);
  const [progress, setProgress] = useState(0);

  const list = useCallback(() => Array.from(root.current?.querySelectorAll<HTMLElement>("[data-slide]") ?? []), []);

  const go = useCallback(
    (index: number) => {
      const target = list()[Math.max(0, Math.min(index, list().length - 1))];
      target?.scrollIntoView({ behavior: "smooth", block: "start" });
    },
    [list],
  );

  useEffect(() => {
    const deck = root.current;
    if (!deck) return;
    const elements = list();
    setSlides(elements.map((el) => el.dataset.slide ?? ""));
    elements[0]?.setAttribute("data-active", "");
    deck.focus({ preventScroll: true });
    const linked = Number(window.location.hash.replace("#slide-", ""));
    if (linked > 1) elements[linked - 1]?.scrollIntoView({ block: "start" });
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const el = entry.target as HTMLElement;
          if (entry.isIntersecting && entry.intersectionRatio >= 0.55) {
            el.setAttribute("data-active", "");
            setActive(elements.indexOf(el));
            window.history.replaceState(null, "", elements.indexOf(el) > 0 ? `#slide-${elements.indexOf(el) + 1}` : " ");
          } else if (entry.intersectionRatio === 0) {
            el.removeAttribute("data-active");
          }
        }
      },
      { root: deck, threshold: [0, 0.55] },
    );
    for (const el of elements) observer.observe(el);
    const onScroll = () => setProgress(deck.scrollTop / Math.max(1, deck.scrollHeight - deck.clientHeight));
    deck.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      observer.disconnect();
      deck.removeEventListener("scroll", onScroll);
    };
  }, [list]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [role=listbox]")) return;
      if (["ArrowDown", "PageDown"].includes(e.key) || (e.key === " " && !e.shiftKey)) {
        e.preventDefault();
        go(active + 1);
      } else if (["ArrowUp", "PageUp"].includes(e.key) || (e.key === " " && e.shiftKey)) {
        e.preventDefault();
        go(active - 1);
      } else if (e.key === "Home") {
        e.preventDefault();
        go(0);
      } else if (e.key === "End") {
        e.preventDefault();
        go(slides.length - 1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, go, slides.length]);

  const last = active >= slides.length - 1;
  return (
    <>
      <div className={styles.progress} style={{ transform: `scaleX(${progress})` }} aria-hidden="true" />
      <div ref={root} className={styles.deck} tabIndex={-1}>
        {children}
      </div>
      <nav className={styles.rail} aria-label="Slides">
        <span className={styles.counter} aria-hidden="true">
          <b key={active}>{String(active + 1).padStart(2, "0")}</b>/{String(slides.length).padStart(2, "0")}
        </span>
        {slides.map((title, i) => (
          <button
            key={title}
            type="button"
            className={styles.dot}
            aria-label={title}
            aria-current={i === active ? "step" : undefined}
            onClick={() => go(i)}
          >
            <span>{title}</span>
          </button>
        ))}
      </nav>
      <button
        type="button"
        className={styles.next}
        data-hidden={last || undefined}
        onClick={() => go(active + 1)}
        aria-label="Next slide"
      >
        <span>{active === 0 ? "Swipe" : (slides[active + 1] ?? "")}</span>
        <ChevronDown size={18} aria-hidden="true" />
      </button>
    </>
  );
}
