import type { Metadata } from "next";
import ContributeForm from "@/components/ContributeForm";
import Countdown from "@/components/Countdown";
import FundSwitch from "@/components/FundSwitch";
import Gate from "@/components/Gate";
import Gauge from "@/components/Gauge";
import Offline from "@/components/Offline";
import { date, price } from "@/lib/plimsoll/format";
import { parcelsSeen, submissions } from "@/lib/plimsoll/history";
import { NODE_NAMES } from "@/lib/plimsoll/personas";
import { session } from "@/lib/plimsoll/session";
import { snapshot } from "@/lib/plimsoll/snapshot";
import styles from "./page.module.css";

export const metadata: Metadata = { title: "Contribute" };
export const dynamic = "force-dynamic";

export default async function ContributePage() {
  let view;
  try {
    const { persona, party } = await session();
    if (persona.role !== "fund") {
      return (
        <div className="page">
          <Gate role="fund" why="Only funds contribute marks." />
        </div>
      );
    }
    view = { persona, party, s: await snapshot(party), seen: await parcelsSeen(party) };
  } catch (error) {
    return (
      <div className="page">
        <Offline error={error} />
      </div>
    );
  }
  const { persona, party, s, seen } = view;
  const now = Date.now();
  const member = s.memberships.some((m) => m.payload.member === party);
  const application = s.applications.find((a) => a.payload.member === party);
  const rounds = [...new Set(s.invitations.map((i) => i.payload.roundCid))].map((roundCid) => {
    const invitations = s.invitations.filter((i) => i.payload.roundCid === roundCid);
    return { roundCid, first: invitations[0]!.payload, complete: invitations.length === 3 };
  });
  const open = rounds.filter((r) => new Date(r.first.closesAt).getTime() > now);
  // Only this fund can rebuild its own price: it signed all three parcels.
  const standing = submissions(seen)
    .filter((sub) => sub.fund === party && sub.value !== null)
    .flatMap((sub) => {
      const copy = s.copies.find((c) => c.payload.holder === party && c.payload.mark.roundId === sub.roundId);
      if (!copy) return [];
      const { mark } = copy.payload;
      const mean = Number(mark.mean);
      const spread = Number(mark.spread);
      return [{ mark, mine: sub.value!, mean, spread, z: spread ? (sub.value! - mean) / spread : 0 }];
    })
    .sort((a, b) => b.mark.asOf.localeCompare(a.mark.asOf) || b.mark.roundId.localeCompare(a.mark.roundId))
    .filter((x, i, all) => all.findIndex((y) => y.mark.loan.borrower === x.mark.loan.borrower) === i)
    .slice(0, 4);
  const sent = [...new Set(s.parcels.map((p) => p.payload.roundCid))].map((roundCid) => ({
    roundCid,
    parcels: s.parcels.filter((p) => p.payload.roundCid === roundCid),
  }));

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <p className="eyebrow">Contribute · {persona.name}</p>
          <h1>
            Give a mark, <em>get the consensus.</em>
          </h1>
          <p>
            Your browser splits your mark into three random shares. Each node gets two, so none can read it, and the sum
            only opens once enough funds have marked.
          </p>
        </div>
      </div>

      {!member && (
        <section className={`panel ${styles.membership}`}>
          <div>
            <p className="eyebrow">Membership</p>
            <h2>{application ? "Waiting on the panel." : "Not on the panel."}</h2>
            <p className="hint">
              {application
                ? "A fund joins only when all three nodes approve, so no node can pad a round with funds it controls."
                : "This fund has no membership and no application on the ledger."}
            </p>
          </div>
          {application && (
            <ol className={styles.approvals} aria-label="Approvals">
              {application.payload.nodes.map((node, k) => {
                const given = application.payload.approvals.includes(node);
                return (
                  <li key={node} data-given={given || undefined}>
                    <span>{k + 1}</span>
                    {NODE_NAMES[k]?.split(" ")[0]}
                    <small>{given ? "approved" : "pending"}</small>
                  </li>
                );
              })}
            </ol>
          )}
        </section>
      )}

      <div className={styles.layout}>
        <div className={styles.main}>
          <div className={styles.heading}>
            <h2>Open rounds</h2>
            <span className="badge" data-tone={open.length ? "live" : undefined}>
              {open.length} waiting on you
            </span>
          </div>
          {open.length === 0 ? (
            <div className={`panel empty ${styles.quiet}`}>
              <h2>{member ? "No rounds waiting on you." : "Rounds open once you’re in."}</h2>
              <p>
                {member
                  ? "When a node opens a round for a loan in your book, its three invitations appear here."
                  : "Members are invited to every round. Switch to an admitted fund to mark one now."}
              </p>
            </div>
          ) : (
            <div className={styles.rounds}>
              {open.map(({ roundCid, first, complete }, i) => (
                <article key={roundCid} className={`card ${styles.round}`} style={{ animationDelay: `${i * 60}ms` }}>
                  <div className="row">
                    <div>
                      <h3>{first.loan.borrower}</h3>
                      <p className="meta">
                        {first.loan.facility} · as of {date(first.asOf)}
                      </p>
                    </div>
                    <span className="badge" data-tone="live">
                      <Countdown to={first.closesAt} />
                    </span>
                  </div>
                  {complete ? (
                    <ContributeForm roundCid={roundCid} nodeNames={NODE_NAMES} />
                  ) : (
                    <p className="hint">This round’s invitations are incomplete.</p>
                  )}
                </article>
              ))}
            </div>
          )}

          {sent.length > 0 && (
            <>
              <div className="section-title">
                <h2>Sent</h2>
                <p>Each parcel is signed by you and one node, and seen by no other node.</p>
              </div>
              <div className={styles.sent}>
                {sent.map(({ roundCid, parcels }, i) => (
                  <article key={roundCid} className="card" style={{ animationDelay: `${i * 60}ms` }}>
                    <div className="row">
                      <div>
                        <h3 className="mono" style={{ fontSize: 14 }}>
                          {parcels[0]!.payload.roundId}
                        </h3>
                        <p className="meta">{parcels.length} of 3 parcels with the panel</p>
                      </div>
                      <span className="badge" data-tone="signal">
                        sealed
                      </span>
                    </div>
                    <div className={styles.holders}>
                      {[1, 2, 3].map((slot) => {
                        const parcel = parcels.find((p) => Number(p.payload.slot) === slot);
                        return (
                          <div key={slot} className={styles.holder}>
                            <strong>{NODE_NAMES[slot - 1]?.split(" ")[0]}</strong>
                            <span>
                              {[1, 2, 3].map((k) => (
                                <i key={k} data-share={k} data-held={parcel?.payload.shares.some((x) => Number(x.index) === k) || undefined}>
                                  s{k}
                                </i>
                              ))}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </article>
                ))}
              </div>
            </>
          )}

        </div>

        <aside className={styles.aside}>
          <section className={`panel ${styles.standing}`}>
            <p className="eyebrow">Where you stand</p>
            <h2>Your price against the panel.</h2>
            {standing.length === 0 ? (
              <p className="hint">Mark a round. When it publishes, you’ll see how far your price sat from the consensus.</p>
            ) : (
              <ul>
                {standing.map(({ mark, mine, mean, spread, z }) => (
                  <li key={mark.roundId}>
                    <header>
                      <strong>{mark.loan.borrower}</strong>
                      <span className={styles.z} data-tone={Math.abs(z) <= 1 ? "in" : "out"}>
                        {z >= 0 ? "+" : ""}
                        {z.toFixed(2)}σ
                      </span>
                    </header>
                    <p className={styles.vs}>
                      <span>
                        You <b>{price(mine)}</b>
                      </span>
                      <span>
                        Panel <b>{price(mean)}</b> ± {price(spread)}
                      </span>
                    </p>
                    <Gauge mean={mean} spread={spread} compare={{ value: mine, label: "you" }} />
                  </li>
                ))}
              </ul>
            )}
            <p className={styles.note}>Rebuilt from the three parcels you signed. No one else can.</p>
          </section>
          <FundSwitch current={persona.key} />
        </aside>
      </div>
    </div>
  );
}
