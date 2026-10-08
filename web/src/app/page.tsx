import { ArrowRight, ArrowUpRight } from "lucide-react";
import Link from "@/components/AppLink";
import Saturn from "@/components/Saturn";
import AtomicDemo from "@/components/landing/AtomicDemo";
import CollateralDemo from "@/components/landing/CollateralDemo";
import CountUp from "@/components/landing/CountUp";
import Deck from "@/components/landing/Deck";
import SeatPicker from "@/components/landing/SeatPicker";
import SplitDemo from "@/components/landing/SplitDemo";
import { LEDGER } from "@/lib/ledger/config";
import { loadCast } from "@/lib/plimsoll/cast";
import { date } from "@/lib/plimsoll/format";
import { balance, snapshot } from "@/lib/plimsoll/snapshot";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

const d = (n: number) => ({ "--d": n }) as React.CSSProperties;

/** The panel's record, read live from the first node's view of the ledger. */
async function ledger() {
  try {
    const cast = loadCast();
    const lead = await snapshot(cast.nodes[0]!);
    const fees = await Promise.all(cast.nodes.map(async (n) => balance(await snapshot(n))));
    const terms = lead.panels[0]?.payload.terms;
    const now = Date.now();
    return {
      marks: lead.marks
        .map((m) => m.payload.mark)
        .sort((a, b) => a.roundId.localeCompare(b.roundId))
        .map((m) => ({
          name: m.loan.borrower,
          facility: m.loan.facility,
          mean: Number(m.mean),
          spread: Number(m.spread),
          count: Number(m.count),
          asOf: m.asOf,
        })),
      funds: lead.memberships.length,
      open: lead.rounds.filter((r) => new Date(r.payload.closesAt).getTime() > now).length,
      paid: fees.reduce((a, b) => a + b, 0),
      fee: Number(terms?.feePerNode ?? 25),
      min: Number(terms?.minContributors ?? 5),
    };
  } catch {
    return null;
  }
}

const PINS = [
  { name: "Fund A", at: 18, price: "91.75" },
  { name: "Fund B", at: 64, price: "95.00" },
  { name: "Fund C", at: 37, price: "93.00" },
  { name: "Fund D", at: 82, price: "96.50" },
  { name: "Fund E", at: 49, price: "94.25" },
];

export default async function Home() {
  const live = await ledger();
  const marks = live?.marks ?? [];
  const lead = marks[0];
  const fee = live?.fee ?? 25;

  return (
    <Deck>
      {/* 1 ─ Hero */}
      <section data-slide="Plimsoll" data-active="" className={`${styles.slide} ${styles.hero}`}>
        <div className={styles.heroStage}>
          <p className="r" style={d(0)}>
            <span className="badge" data-tone="live">
              {live ? `Live on ${LEDGER.network}` : "Canton"}
            </span>
          </p>
          <h1 className="r" style={d(1)}>
            Private credit,
            <br />
            <em>marked by consensus.</em>
          </h1>
          <p className={`${styles.lede} r`} style={d(2)}>
            Funds pool their loan marks without showing them to anyone, not even the nodes that run the panel. Lenders
            pay in Canton Coin for the number.
          </p>
          <div className={`${styles.planet} r`} style={d(3)}>
            <Saturn />
          </div>
          <div className={`${styles.actions} r`} style={d(4)}>
            <Link className="button" href="/marks">
              Open the app <ArrowRight size={18} aria-hidden="true" />
            </Link>
            <Link className="button secondary" href="/docs">
              How it works
            </Link>
          </div>
        </div>
        {marks.length > 0 && (
          <div className={styles.ticker} aria-label="Published marks, as the panel records them">
            <div>
              {[0, 1, 2, 3].flatMap((loop) =>
                marks.map((m) => (
                  <span key={`${loop}-${m.name}`} aria-hidden={loop > 0 || undefined}>
                    <b>{m.name}</b> {m.facility} <strong>{m.mean.toFixed(2)}</strong>
                    <em>± {m.spread.toFixed(2)}</em> · {m.count} funds
                  </span>
                )),
              )}
            </div>
          </div>
        )}
      </section>

      {/* 2 ─ The problem */}
      <section data-slide="The problem" className={styles.slide} style={{ "--glow": "var(--fund)" } as React.CSSProperties}>
        <div className={styles.twoUp}>
          <div className={styles.copy}>
            <p className={`${styles.kicker} r`} style={d(0)}>
              01 · The problem
            </p>
            <h2 className="r" style={d(1)}>
              One loan. Five books.
              <br />
              <em>Five prices.</em>
            </h2>
            <p className="r" style={d(2)}>
              Private loans almost never trade, so every fund that holds one prices it itself, quarter after quarter. The
              bank financing those funds sees five different numbers for the same loan and has to take each on trust.
            </p>
            <p className="r" style={d(3)}>
              Funds would compare notes, if it didn’t mean showing their book to competitors.
            </p>
          </div>
          <div className={`${styles.scatter} r`} style={d(2)} aria-label="Five funds' private prices for one loan, scattered">
            <div className={styles.axis}>
              <span>90</span>
              <span>95</span>
              <span>100</span>
            </div>
            {PINS.map((pin, i) => (
              <div key={pin.name} className={styles.pin} style={{ "--at": pin.at, "--i": i } as React.CSSProperties}>
                <span className={styles.tag}>
                  {pin.name}
                  <b aria-hidden="true">{pin.price}</b>
                </span>
                <i />
              </div>
            ))}
            <div className={styles.lender}>
              <span className={styles.lenderChip}>N</span>
              <p>
                <strong>Northbank, lending against all five.</strong>
                <br />
                Which one is the price?
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 3 ─ The split */}
      <section data-slide="The split" className={styles.slide} style={{ "--glow": "#ff6b3d" } as React.CSSProperties}>
        <div className={styles.twoUp}>
          <div className={styles.copy}>
            <p className={`${styles.kicker} r`} style={d(0)}>
              02 · The split
            </p>
            <h2 className="r" style={d(1)}>
              Three pieces. <em>Three nodes. No one reads it.</em>
            </h2>
            <p className="r" style={d(2)}>
              The fund&rsquo;s browser splits its price into three random numbers that add up to it modulo a 61-bit prime.
              Each node gets two. None gets all three.
            </p>
            <div className={styles.seatStrip}>
              {["Sextant", "Fathom", "Lodestar"].map((node, i) => (
                <div key={node} className={`${styles.seatRow} r`} style={d(i + 3)}>
                  <span className={styles.seatNo}>{i + 1}</span>
                  <strong>{node}</strong>
                  {[1, 2, 3].map((k) =>
                    k === i + 1 ? (
                      <span key={k} className={styles.missing}>
                        s<sub>{k}</sub>
                      </span>
                    ) : (
                      <span key={k} className={styles.held} data-share={k} style={{ "--k": k } as React.CSSProperties}>
                        s<sub>{k}</sub>
                      </span>
                    ),
                  )}
                </div>
              ))}
            </div>
            <p className={`${styles.rule} r`} style={d(6)}>
              Sums run in Daml, from the parcels. Any two reports give the total, never one fund&rsquo;s price. Below{" "}
              <b>{live?.min ?? 5} funds</b>, no sum opens.
            </p>
          </div>
          <div className="r" style={d(2)}>
            <SplitDemo />
          </div>
        </div>
      </section>

      {/* 4 ─ The mark */}
      <section data-slide="The mark" className={styles.slide} style={{ "--glow": "#2dd58b" } as React.CSSProperties}>
        <div className={styles.center}>
          <p className={`${styles.kicker} r`} style={d(0)}>
            03 · The mark
          </p>
          <h2 className="r" style={d(1)}>
            Everyone who gave, <em>gets.</em>
          </h2>
          <p className={`${styles.centerLede} r`} style={d(2)}>
            The panel publishes the mean, the spread and how many funds marked — never which ones. Each contributor gets
            its copy free. {live ? "These are on the ledger right now." : ""}
          </p>
          {marks.length > 0 ? (
            <div className={styles.markRow}>
              {marks.slice(0, 3).map((m, i) => {
                const low = Math.floor(m.mean - 3 * m.spread - 1);
                const high = Math.ceil(m.mean + 3 * m.spread + 1);
                const at = (v: number) => ((v - low) / (high - low)) * 100;
                return (
                  <article key={m.name} className={`${styles.markCard} r`} style={d(i + 3)}>
                    <header>
                      <strong>{m.name}</strong>
                      <span>{m.facility}</span>
                    </header>
                    <p className={styles.markValue}>
                      <CountUp value={m.mean} places={2} />
                      <small>± {m.spread.toFixed(2)}</small>
                    </p>
                    <div className={styles.band}>
                      <i style={{ left: `${at(m.mean - m.spread)}%`, width: `${at(m.mean + m.spread) - at(m.mean - m.spread)}%` }} />
                      <b style={{ left: `${at(m.mean)}%` }} />
                    </div>
                    <footer>
                      <span>{m.count} funds</span>
                      <span>as of {date(m.asOf)}</span>
                    </footer>
                  </article>
                );
              })}
            </div>
          ) : (
            <p className="hint r" style={d(3)}>
              Start the sandbox and run <code>make seed</code> to see live marks here.
            </p>
          )}
          {live && (
            <dl className={`${styles.liveStats} r`} style={d(6)}>
              <div>
                <dt>Marks published</dt>
                <dd>
                  <CountUp value={marks.length} />
                </dd>
              </div>
              <div>
                <dt>Funds on the panel</dt>
                <dd>
                  <CountUp value={live.funds} />
                </dd>
              </div>
              <div>
                <dt>Rounds open</dt>
                <dd>
                  <CountUp value={live.open} />
                </dd>
              </div>
              <div>
                <dt>Paid to nodes</dt>
                <dd>
                  <CountUp value={live.paid} places={2} /> <small>CC</small>
                </dd>
              </div>
            </dl>
          )}
        </div>
      </section>

      {/* 5 ─ Canton Coin */}
      <section data-slide="Canton Coin" className={styles.slide} style={{ "--glow": "var(--reader)" } as React.CSSProperties}>
        <div className={styles.twoUp}>
          <div className={styles.copy}>
            <p className={`${styles.kicker} r`} style={d(0)}>
              04 · The lender
            </p>
            <h2 className="r" style={d(1)}>
              One transaction. Three fees. <em>One mark.</em>
            </h2>
            <p className="r" style={d(2)}>
              A lender sees the loan, the date and how many funds marked it — not the number. Buying opens a CIP-56
              allocation request with a fee leg to each node. The legs and the mark settle together, or nothing does.
            </p>
            <p className="r" style={d(3)}>
              Fees go to the nodes, never the funds, so a payment can’t reveal who contributed. Try shorting a leg.
            </p>
          </div>
          <div className="r" style={d(2)}>
            <AtomicDemo fee={fee} mark={lead && { name: lead.name, mean: lead.mean, spread: lead.spread }} />
          </div>
        </div>
      </section>

      {/* 6 ─ Collateral */}
      <section data-slide="Collateral" className={styles.slide} style={{ "--glow": "var(--fund)" } as React.CSSProperties}>
        <div className={styles.twoUp}>
          <div className={styles.copy}>
            <p className={`${styles.kicker} r`} style={d(0)}>
              05 · The use
            </p>
            <h2 className="r" style={d(1)}>
              Price the borrowing base <em>on more than one fund’s word.</em>
            </h2>
            <p className="r" style={d(2)}>
              A NAV lender values each loan at the lower of the fund’s own mark and an independent price. Plimsoll is that
              price: the consensus less one standard deviation.
            </p>
            <p className="r" style={d(3)}>
              Mark the fund up and watch the lender’s exposure stay put.
            </p>
          </div>
          <div className="r" style={d(2)}>
            <CollateralDemo marks={marks.map(({ name, mean, spread }) => ({ name, mean, spread }))} />
          </div>
        </div>
      </section>

      {/* 7 ─ Take a seat */}
      <section data-slide="Take a seat" className={`${styles.slide} ${styles.finale}`}>
        <div className={styles.center}>
          <p className={`${styles.kicker} r`} style={d(0)}>
            Your turn
          </p>
          <h2 className={`${styles.finaleTitle} r`} style={d(1)}>
            Take a <em>seat.</em>
          </h2>
          <p className={`${styles.centerLede} r`} style={d(2)}>
            Every screen reads the ledger as the party you choose. Switch at any time from the top right.
          </p>
          <SeatPicker />
          <div className={`${styles.proof} r`} style={d(7)}>
            <p>
              <strong>
                <CountUp value={26} />
              </strong>{" "}
              Daml tests
            </p>
            <p>
              <strong>
                <CountUp value={22} />
              </strong>{" "}
              live ledger checks
            </p>
            <Link href="/privacy" className={styles.proofLink}>
              Who sees what, party by party <ArrowUpRight size={16} aria-hidden="true" />
            </Link>
          </div>
          <nav className={`${styles.finaleLinks} r`} style={d(8)} aria-label="Resources">
            <Link href="/docs">Docs</Link>
            <a href="https://github.com/martinvibes/plimsoll" target="_blank" rel="noreferrer">
              Source ↗
            </a>
            <small>Plimsoll · built on Canton</small>
          </nav>
        </div>
      </section>
    </Deck>
  );
}
