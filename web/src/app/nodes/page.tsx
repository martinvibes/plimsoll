import type { Metadata } from "next";
import { ArrowRight, Check, Megaphone, Sigma } from "lucide-react";
import ActionForm from "@/components/ActionForm";
import Countdown from "@/components/Countdown";
import Gate from "@/components/Gate";
import Offline from "@/components/Offline";
import { decide, openRound, publish, report } from "@/app/actions";
import { coin, date } from "@/lib/plimsoll/format";
import { NODE_NAMES, nameOf } from "@/lib/plimsoll/personas";
import { session } from "@/lib/plimsoll/session";
import { balance, snapshot } from "@/lib/plimsoll/snapshot";
import styles from "./page.module.css";

export const metadata: Metadata = { title: "Nodes" };
export const dynamic = "force-dynamic";

export default async function NodesPage() {
  let view;
  try {
    const { cast, persona, party } = await session();
    if (persona.role !== "node") {
      return (
        <div className="page">
          <Gate role="node" why="Only the panel’s three nodes see rounds." />
        </div>
      );
    }
    view = { cast, persona, party, s: await snapshot(party) };
  } catch (error) {
    return (
      <div className="page">
        <Offline error={error} />
      </div>
    );
  }
  const { cast, persona, party, s } = view;
  const seat = s.seats.find((x) => x.payload.node === party);
  const panel = s.panels[0];
  const slot = Number(seat?.payload.slot ?? 0);
  const min = Number(panel?.payload.terms.minContributors ?? 5);
  const now = Date.now();
  const rounds = [...s.rounds].sort((a, b) => a.payload.closesAt.localeCompare(b.payload.closesAt));

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <p className="eyebrow">
            Seat {slot} · {persona.name}
          </p>
          <h1>
            Sum what you <em>can’t read.</em>
          </h1>
          <p>
            You hold every share but share {slot} of each fund’s mark: two random numbers that say nothing alone. When a
            round closes, report your column sums. Any two reports publish.
          </p>
        </div>
      </div>

      <dl className="stats">
        <div className="stat">
          <dt>Panel</dt>
          <dd style={{ fontSize: 18, lineHeight: 1.7 }}>{panel?.payload.terms.name ?? "—"}</dd>
        </div>
        <div className="stat" style={{ animationDelay: "60ms" }}>
          <dt>Funds admitted</dt>
          <dd>{s.memberships.length}</dd>
        </div>
        <div className="stat" style={{ animationDelay: "120ms" }}>
          <dt>Minimum to reveal</dt>
          <dd>{min}</dd>
        </div>
        <div className="stat" style={{ animationDelay: "180ms" }}>
          <dt>Fees earned</dt>
          <dd>{coin(balance(s))}</dd>
        </div>
      </dl>

      <div className="section-title">
        <h2>Rounds</h2>
        <p>Only the nodes see a round and who was invited.</p>
      </div>
      {rounds.length === 0 ? (
        <div className="panel empty">
          <h2>No rounds open.</h2>
          <p>Open one below.</p>
        </div>
      ) : (
        <div className={styles.rounds}>
          {rounds.map((r, i) => {
            const closed = new Date(r.payload.closesAt).getTime() <= now;
            const mine = s.parcels.filter((p) => p.payload.roundCid === r.contractId && p.payload.node === party);
            const reports = s.partialSums.filter((x) => x.payload.roundCid === r.contractId);
            const reported = reports.some((x) => x.payload.node === party);
            return (
              <article key={r.contractId} className="card" style={{ animationDelay: `${i * 60}ms` }}>
                <div className="row">
                  <div>
                    <h3>{r.payload.loan.borrower}</h3>
                    <p className="meta">
                      {r.payload.loan.facility} · as of {date(r.payload.asOf)}
                    </p>
                  </div>
                  <span className="badge" data-tone={closed ? "done" : "live"}>
                    {closed ? "closed" : <Countdown to={r.payload.closesAt} />}
                  </span>
                </div>
                <div className={styles.body}>
                <div className={styles.seats} aria-label="Reports filed">
                  {r.payload.nodes.map((node, k) => {
                    const filed = reports.some((x) => x.payload.node === node);
                    return (
                      <div key={node} className={styles.seat} data-filed={filed || undefined} data-me={node === party || undefined}>
                        <span>{k + 1}</span>
                        <small>{NODE_NAMES[k]?.split(" ")[0]}</small>
                        <em>
                          {filed ? "reported" : "waiting"}
                          {node === party && " · you"}
                        </em>
                      </div>
                    );
                  })}
                </div>
                <div className={styles.meter} aria-label={`${mine.length} of ${r.payload.members.length} parcels`}>
                  <div>
                    {r.payload.members.map((m, k) => (
                      <i key={m.party} data-in={k < mine.length || undefined} data-min={k === min - 1 || undefined} />
                    ))}
                  </div>
                  <p className="hint">
                    {mine.length} of {r.payload.members.length} invited funds have sent you a parcel
                    {mine.length < min ? ` · ${min - mine.length} more before any sum opens` : " · enough to reveal"}.
                  </p>
                </div>
                </div>
                <div className="action-row">
                  {closed && !reported && mine.length >= min && (
                    <ActionForm
                      action={report.bind(null, r.contractId)}
                      label="Report my column sums"
                      pendingLabel="Summing on-ledger…"
                      tone="signal"
                      icon={<Sigma size={16} aria-hidden="true" />}
                    />
                  )}
                  {reports.length >= 2 && (
                    <ActionForm
                      action={publish.bind(null, r.contractId)}
                      label={`Publish from ${reports.length} reports`}
                      pendingLabel="Cross-checking…"
                      tone="signal"
                      icon={<Megaphone size={16} aria-hidden="true" />}
                    />
                  )}
                  {closed && mine.length < min && !reported && <span className="badge">Too few funds: this round can’t reveal anything</span>}
                </div>
              </article>
            );
          })}
        </div>
      )}

      <div className="split" style={{ marginTop: 48 }}>
        <section className="panel">
          <h2>Open a round</h2>
          <p className="hint">Every admitted fund gets three invitations, one per seat. Three minutes is enough to switch through five funds.</p>
          <ActionForm
            action={openRound}
            label="Open round"
            pendingLabel="Inviting funds…"
            tone="signal"
            icon={<ArrowRight size={16} aria-hidden="true" />}
          >
            <div className={styles.fields}>
              <label className="field">
                <span>Loan id</span>
                <input name="id" defaultValue="HARBORVIEW-UNI-2031" />
              </label>
              <label className="field">
                <span>Borrower</span>
                <input name="borrower" defaultValue="Harborview Veterinary" />
              </label>
              <label className="field">
                <span>Facility</span>
                <input name="facility" defaultValue="Unitranche" />
              </label>
              <label className="field">
                <span>Maturity</span>
                <input name="maturity" type="date" defaultValue="2031-03-31" />
              </label>
              <label className="field">
                <span>As of</span>
                <input name="asOf" type="date" defaultValue={new Date().toISOString().slice(0, 10)} />
              </label>
              <label className="field">
                <span>Open for (minutes)</span>
                <input name="minutes" inputMode="numeric" defaultValue="3" />
              </label>
            </div>
          </ActionForm>
        </section>
        <section className="panel">
          <h2>Admissions</h2>
          <p className="hint">A fund joins only when all three nodes approve, so no node can pad a round with funds it controls.</p>
          {s.applications.length === 0 ? (
            <p className="hint">No applications waiting.</p>
          ) : (
            s.applications.map((a) => (
              <div key={a.contractId} className={styles.application}>
                <div>
                  <strong>{nameOf(cast, a.payload.member)}</strong>
                  <span className={styles.dots} aria-label={`${a.payload.approvals.length} of 3 approvals`}>
                    {a.payload.nodes.map((n, k) => (
                      <i key={n} data-given={a.payload.approvals.includes(n) || undefined} title={NODE_NAMES[k]} />
                    ))}
                    <small>{a.payload.approvals.length} of 3 approvals</small>
                  </span>
                </div>
                {!a.payload.approvals.includes(party) && (
                  <div className="action-row" style={{ marginTop: 0 }}>
                    <ActionForm
                      action={decide.bind(null, a.contractId, true)}
                      label="Approve"
                      icon={<Check size={16} aria-hidden="true" />}
                    />
                    <ActionForm action={decide.bind(null, a.contractId, false)} label="Reject" tone="secondary" />
                  </div>
                )}
              </div>
            ))
          )}
        </section>
      </div>
    </div>
  );
}
