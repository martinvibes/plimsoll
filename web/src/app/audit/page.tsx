import type { Metadata } from "next";
import Gate from "@/components/Gate";
import Gauge from "@/components/Gauge";
import Offline from "@/components/Offline";
import { date, price } from "@/lib/plimsoll/format";
import { parcelsSeen, submissions } from "@/lib/plimsoll/history";
import { nameOf } from "@/lib/plimsoll/personas";
import { session } from "@/lib/plimsoll/session";
import { snapshot } from "@/lib/plimsoll/snapshot";
import styles from "./page.module.css";

export const metadata: Metadata = { title: "Audit" };
export const dynamic = "force-dynamic";

export default async function AuditPage() {
  let view;
  try {
    const { cast, persona, party } = await session();
    if (persona.role !== "auditor") {
      return (
        <div className="page">
          <Gate role="auditor" why="Only a fund’s auditor sees what the fund submitted." />
        </div>
      );
    }
    view = { cast, persona, s: await snapshot(party), seen: await parcelsSeen(party) };
  } catch (error) {
    return (
      <div className="page">
        <Offline error={error} />
      </div>
    );
  }
  const { cast, persona, s, seen } = view;
  // Round ids end in the as-of date, so newest first is a reverse sort on it.
  const asOf = (roundId: string) => roundId.split("/").at(-1)!;
  const rounds = submissions(seen)
    .map((sub) => ({ ...sub, copy: s.copies.find((c) => c.payload.mark.roundId === sub.roundId) }))
    .sort((a, b) => asOf(b.roundId).localeCompare(asOf(a.roundId)));

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <p className="eyebrow">Audit · {persona.name}</p>
          <h1>
            What your client sent, <em>and what came back.</em>
          </h1>
          <p>
            You observe all three of your client’s parcels, so you can add its shares back into the mark it submitted,
            signed and timestamped. Then test it against the consensus. You see no other fund.
          </p>
        </div>
      </div>
      {rounds.length === 0 ? (
        <div className="panel empty">
          <h2>Nothing submitted yet.</h2>
          <p>When your client contributes to a round, its parcels appear here.</p>
        </div>
      ) : (
        <div className="grid">
          {rounds.map(({ roundId, parcels, value: submitted, copy, at, fund }, i) => {
            const mean = copy ? Number(copy.payload.mark.mean) : null;
            const spread = copy ? Number(copy.payload.mark.spread) : null;
            const z = mean !== null && spread && submitted !== null ? (submitted - mean) / spread : null;
            return (
              <article key={roundId} className="card" style={{ animationDelay: `${i * 60}ms` }}>
                <div className="row">
                  <div>
                    <h3>{copy?.payload.mark.loan.borrower ?? roundId.split("/")[0]}</h3>
                    <p className="meta">
                      {nameOf(cast, fund)} · as of {date(asOf(roundId))} · sent {date(at)}
                    </p>
                  </div>
                  <span className="badge" data-tone={copy ? "done" : "live"}>
                    {copy ? "published" : "round open"}
                  </span>
                </div>
                <dl className={styles.figures}>
                  <div>
                    <dt>Submitted</dt>
                    <dd>{submitted !== null ? price(submitted) : "—"}</dd>
                  </div>
                  <div>
                    <dt>Consensus</dt>
                    <dd>{mean !== null ? price(mean) : "—"}</dd>
                  </div>
                  <div>
                    <dt>Gap</dt>
                    <dd data-tone={z === null ? undefined : Math.abs(z) <= 1 ? "in" : "out"}>
                      {z !== null ? `${z >= 0 ? "+" : ""}${z.toFixed(2)}σ` : "—"}
                    </dd>
                  </div>
                </dl>
                {mean !== null && spread !== null && submitted !== null && (
                  <Gauge mean={mean} spread={spread} compare={{ value: submitted, label: "client" }} />
                )}
                <p className="hint" style={{ marginTop: 22 }}>
                  Rebuilt from {parcels.length} parcels, shares{" "}
                  {[...new Set(parcels.flatMap((p) => p.shares.map((sh) => `s${sh.index}`)))].sort().join(", ")}.
                </p>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
