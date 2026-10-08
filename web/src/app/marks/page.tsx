import type { Metadata } from "next";
import { Coins, Lock, ScrollText } from "lucide-react";
import ActionForm from "@/components/ActionForm";
import Collateral from "@/components/Collateral";
import MarkCard from "@/components/MarkCard";
import Offline from "@/components/Offline";
import { buy } from "@/app/actions";
import { LEDGER } from "@/lib/ledger/config";
import { coin, date } from "@/lib/plimsoll/format";
import { nameOf } from "@/lib/plimsoll/personas";
import { session } from "@/lib/plimsoll/session";
import { balance, snapshot } from "@/lib/plimsoll/snapshot";
import type { Loan } from "@/lib/plimsoll/types";
import styles from "./page.module.css";

export const metadata: Metadata = { title: "Marks" };
export const dynamic = "force-dynamic";

type Dated = { loan: Loan; asOf: string; roundId: string };

const loanKey = (loan: Loan) => `${loan.borrower}\u0000${loan.facility}`;
const oldestFirst = (a: Dated, b: Dated) => a.asOf.localeCompare(b.asOf) || a.roundId.localeCompare(b.roundId);

/** One entry per loan: its latest round and every round before it. */
function byLoan<T>(items: T[], markOf: (item: T) => Dated) {
  const loans = new Map<string, T[]>();
  for (const item of [...items].sort((a, b) => oldestFirst(markOf(a), markOf(b)))) {
    const key = loanKey(markOf(item).loan);
    loans.set(key, [...(loans.get(key) ?? []), item]);
  }
  return [...loans.values()]
    .map((rounds) => ({ latest: rounds.at(-1)!, rounds }))
    .sort((a, b) => oldestFirst(markOf(b.latest), markOf(a.latest)));
}

export default async function MarksPage() {
  let view;
  try {
    const { cast, persona, party } = await session();
    view = { cast, persona, party, s: await snapshot(party) };
  } catch (error) {
    return (
      <div className="page">
        <Offline error={error} />
      </div>
    );
  }
  const { cast, persona, party, s } = view;
  const names = (parties: string[]) => parties.map((p) => nameOf(cast, p).split(" ")[0]!);

  // A node holds the panel's record; everyone else holds copies made out to
  // them, or, for an auditor, to its client.
  const held =
    persona.role === "node"
      ? s.marks.map((m) => ({ mark: m.payload.mark, basis: "Panel" }))
      : s.copies
          .filter((c) => (persona.role === "auditor" ? c.payload.auditor === party : c.payload.holder === party))
          .map((c) => ({ mark: c.payload.mark, basis: c.payload.basis as string }));
  const loans = byLoan(held, (h) => h.mark);
  const bought = new Set(held.map((h) => h.mark.roundId));
  const listings = byLoan(
    s.listings.filter((l) => !bought.has(l.payload.roundId)),
    (l) => l.payload,
  );
  const sold = s.copies.filter((c) => c.payload.basis === "Purchased").length;
  const avg = held.length ? held.reduce((n, h) => n + Number(h.mark.count), 0) / held.length : 0;

  const intro: Record<string, string> = {
    fund: "Every round you mark, you get the consensus back for free. You never learn who else marked.",
    node: "The panel’s published record, one line per loan. Each holder gets its own copy; no copy names a fund.",
    reader: `Independent prices for the loans in your collateral. Pay each node in ${LEDGER.coin} and the mark arrives in the same transaction.`,
    auditor: "The consensus your client received, to test its own valuation against.",
  };

  const stats =
    persona.role === "node"
      ? [
          ["Loans marked", String(loans.length)],
          ["Rounds published", String(held.length)],
          ["Copies issued", `${s.copies.length}`, sold ? `${sold} sold` : undefined],
          ["Fees earned", coin(balance(s))],
        ]
      : [
          [persona.role === "reader" ? "Loans priced" : "Loans", String(loans.length)],
          ["Avg. funds per mark", avg ? avg.toFixed(1) : "—"],
          ["For sale to you", persona.role === "reader" ? String(listings.length) : "—"],
          [LEDGER.coin, coin(balance(s))],
        ];

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <p className="eyebrow">Consensus marks · {persona.name}</p>
          <h1>
            The <em>marks.</em>
          </h1>
          <p>{intro[persona.role]}</p>
        </div>
      </div>

      <dl className="stats">
        {stats.map(([label, value, note], i) => (
          <div key={label} className="stat" style={{ animationDelay: `${i * 60}ms` }}>
            <dt>{label}</dt>
            <dd>
              {value}
              {note && <small>{note}</small>}
            </dd>
          </div>
        ))}
      </dl>

      {persona.role === "reader" && listings.length > 0 && (
        <>
          <div className="section-title">
            <h2>For sale</h2>
            <p>The loan, the date and how many funds marked it. The number arrives in the transaction that pays.</p>
          </div>
          <div className="grid">
            {listings.map(({ latest: l, rounds }, i) => (
              <article key={l.contractId} className={`card ${styles.sealed}`} style={{ animationDelay: `${i * 60}ms` }}>
                <div className="row">
                  <div>
                    <h3>{l.payload.loan.borrower}</h3>
                    <p className="meta">
                      {l.payload.loan.facility} · as of {date(l.payload.asOf)}
                      {rounds.length > 1 && ` · latest of ${rounds.length}`}
                    </p>
                  </div>
                  <span className="badge">{l.payload.count} funds</span>
                </div>
                <p className={styles.hidden} aria-label="Hidden until paid">
                  <Lock size={18} aria-hidden="true" />
                  <span aria-hidden="true">88.88</span>
                </p>
                <ol className={styles.legs} aria-label="Fee legs">
                  {l.payload.nodes.map((node) => (
                    <li key={node}>
                      <i />
                      {nameOf(cast, node).split(" ")[0]}
                      <b>{coin(l.payload.feePerNode)}</b>
                    </li>
                  ))}
                </ol>
                <div className={styles.price}>
                  <div>
                    <strong>{coin(Number(l.payload.feePerNode) * l.payload.nodes.length)}</strong>
                    <span>three legs, one transaction</span>
                  </div>
                  <ActionForm
                    action={buy.bind(null, l.contractId)}
                    label="Buy the mark"
                    pendingLabel="Paying 3 nodes…"
                    tone="signal"
                    icon={<Coins size={16} aria-hidden="true" />}
                  />
                </div>
              </article>
            ))}
          </div>
        </>
      )}

      <div className="section-title">
        <h2>{persona.role === "reader" ? "Your marks" : persona.role === "node" ? "The record" : "Published"}</h2>
        <p>Mean and one standard deviation, in points of par.</p>
      </div>
      {loans.length === 0 ? (
        <div className={`panel empty ${styles.none}`}>
          <span className={styles.noneIcon}>
            <ScrollText size={24} aria-hidden="true" />
          </span>
          <h2>No marks yet.</h2>
          <p>
            {persona.role === "reader"
              ? "Buy one above. It lands here in the same transaction that pays the nodes."
              : persona.role === "fund"
                ? "Contribute to a round; when it publishes, your copy lands here."
                : "Marks appear here when a round publishes."}
          </p>
        </div>
      ) : (
        <div className="grid">
          {loans.map(({ latest: { mark, basis }, rounds }, i) => (
            <MarkCard
              key={`${mark.roundId}-${basis}`}
              mark={mark}
              reporters={names(mark.reporters)}
              delay={i * 60}
              history={rounds.map((r) => r.mark)}
              badge={
                <span className="badge" data-tone={basis === "Purchased" ? "signal" : "done"}>
                  {basis}
                </span>
              }
            >
              {persona.role === "reader" && <Collateral mean={Number(mark.mean)} spread={Number(mark.spread)} />}
            </MarkCard>
          ))}
        </div>
      )}
    </div>
  );
}
