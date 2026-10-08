"use client";

import { useEffect, useState, type RefObject } from "react";

/** True while the slide holding `ref` is the one in view. */
export function useSlideActive(ref: RefObject<HTMLElement | null>) {
  const [active, setActive] = useState(false);
  useEffect(() => {
    const slide = ref.current?.closest("[data-slide]");
    if (!slide) return;
    const read = () => setActive(slide.hasAttribute("data-active"));
    read();
    const observer = new MutationObserver(read);
    observer.observe(slide, { attributes: true, attributeFilter: ["data-active"] });
    return () => observer.disconnect();
  }, [ref]);
  return active;
}
