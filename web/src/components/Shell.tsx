"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import { Menu, X } from "lucide-react";
import Link from "./AppLink";
import Live from "./Live";
import Logo from "./Logo";
import PersonaMenu from "./PersonaMenu";
import Toaster from "./Toaster";
import type { Persona } from "@/lib/plimsoll/personas";
import styles from "./Shell.module.css";

const destinations = [
  ["/marks", "Marks"],
  ["/contribute", "Contribute"],
  ["/nodes", "Nodes"],
  ["/audit", "Audit"],
  ["/privacy", "Who sees what"],
] as const;

type Props = {
  children: React.ReactNode;
  persona: Pick<Persona, "key" | "name" | "role">;
  network: string;
};

export default function Shell({ children, persona, network }: Props) {
  const path = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const nav = useRef<HTMLElement>(null);
  const landing = path === "/";

  // The active page's pill glides to whichever link is current.
  useLayoutEffect(() => {
    const el = nav.current;
    if (!el) return;
    const place = () => {
      const active = el.querySelector<HTMLElement>("a[aria-current]");
      el.toggleAttribute("data-active", Boolean(active));
      if (!active) return;
      el.style.setProperty("--x", `${active.offsetLeft}px`);
      el.style.setProperty("--w", `${active.offsetWidth}px`);
    };
    place();
    const frame = requestAnimationFrame(() => el.setAttribute("data-ready", ""));
    const resized = new ResizeObserver(place);
    resized.observe(el);
    return () => {
      cancelAnimationFrame(frame);
      resized.disconnect();
    };
  }, [path]);
  const navigation = () =>
    destinations.map(([url, label]) => (
      <Link
        key={url}
        href={url}
        onClick={() => setMenuOpen(false)}
        aria-current={path === url || path.startsWith(`${url}/`) ? "page" : undefined}
      >
        {label}
      </Link>
    ));

  return (
    <div className={styles.frame} data-landing={landing || undefined} data-role={persona.role}>
      <a className="skip" href="#main">
        Skip to content
      </a>
      <header className={styles.header}>
        <Link className={styles.brand} href="/" aria-label="Plimsoll home">
          <Logo size={32} />
          Plimsoll
        </Link>
        <nav ref={nav} className={styles.desktopNavigation} aria-label="Main navigation">
          <span className={styles.pill} aria-hidden="true" />
          {navigation()}
        </nav>
        <div className={styles.walletArea}>
          <span className={styles.network}>
            <i aria-hidden="true" />
            {network}
          </span>
          <PersonaMenu current={persona} />
        </div>
        <Dialog.Root open={menuOpen} onOpenChange={setMenuOpen}>
          <Dialog.Trigger asChild>
            <button type="button" className={styles.menuTrigger} aria-label="Open navigation" aria-expanded={menuOpen}>
              <Menu size={22} aria-hidden="true" />
            </button>
          </Dialog.Trigger>
          <Dialog.Portal>
            <Dialog.Overlay className={styles.menuOverlay} />
            <Dialog.Content className={styles.menuContent}>
              <div className={styles.menuHeading}>
                <Dialog.Title>Plimsoll</Dialog.Title>
                <Dialog.Close asChild>
                  <button className="icon-button" aria-label="Close navigation">
                    <X size={20} aria-hidden="true" />
                  </button>
                </Dialog.Close>
              </div>
              <Dialog.Description className="hint">Consensus marks for private credit, on Canton.</Dialog.Description>
              <nav className={styles.mobileNavigation} aria-label="Main navigation">
                {navigation()}
                <Link href="/docs" onClick={() => setMenuOpen(false)}>
                  Docs
                </Link>
              </nav>
              <span className={styles.network}>
                <i aria-hidden="true" />
                {network}
              </span>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      </header>
      <main id="main" tabIndex={-1} className={styles.main}>
        {children}
      </main>
      {!landing && path !== "/docs" && <Live />}
      <Toaster />
      <footer className={styles.footer} hidden={landing}>
        <nav aria-label="Resources">
          <Link href="/docs">Docs</Link>
          <Link href="/privacy">Who sees what</Link>
          <a href="https://github.com/martinvibes/plimsoll" target="_blank" rel="noreferrer">
            Source ↗
          </a>
        </nav>
        <small>Plimsoll · consensus marks for private credit · built on Canton</small>
      </footer>
    </div>
  );
}
