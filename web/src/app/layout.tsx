import type { Metadata } from "next";
import localFont from "next/font/local";
import Shell from "@/components/Shell";
import { LEDGER } from "@/lib/ledger/config";
import { currentPersona } from "@/lib/plimsoll/session";
import "./globals.css";

const sans = localFont({ src: "../fonts/SpaceGrotesk.ttf", variable: "--font-sans", display: "swap", weight: "300 700" });
const display = localFont({
  src: [
    { path: "../fonts/InstrumentSerif-Regular.ttf", weight: "400", style: "normal" },
    { path: "../fonts/InstrumentSerif-Italic.ttf", weight: "400", style: "italic" },
  ],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "Plimsoll — consensus marks for private credit", template: "%s · Plimsoll" },
  description:
    "Funds pool their private-loan marks without showing them to anyone. Lenders pay in Canton Coin for the consensus.",
  icons: { icon: "/brand/favicon.svg" },
};

export default async function Layout({ children }: { children: React.ReactNode }) {
  const { key, name, role } = await currentPersona();
  return (
    <html lang="en" className={`${sans.variable} ${display.variable}`}>
      {/* Browser extensions add body attributes before hydration. */}
      <body suppressHydrationWarning>
        <Shell persona={{ key, name, role }} network={LEDGER.network}>
          {children}
        </Shell>
      </body>
    </html>
  );
}
