import type { Metadata } from "next";
import { Eye, EyeOff, ShieldCheck } from "lucide-react";
import Offline from "@/components/Offline";
import { loadCast } from "@/lib/plimsoll/cast";
import { PERSONAS, ROLE_LABEL } from "@/lib/plimsoll/personas";
import { snapshot, type Snapshot } from "@/lib/plimsoll/snapshot";
import styles from "./page.module.css";

export const metadata: Metadata = { title: "Who sees what" };
export const dynamic = "force-dynamic";

/** Funds whose every share this party can see, so whose mark it could add up. */
function readable(s: Snapshot): number {
  const seen = new Map<string, Set<string>>();
  for (const p of s.parcels) {
    const set = seen.get(p.payload.contributor) ?? new Set<string>();
    p.payload.shares.forEach((sh) => set.add(sh.index));
    seen.set(p.payload.contributor, set);
  }
  return [...seen.values()].filter((set) => set.size === 3).length;
}

export default async function PrivacyPage() {
  let rows;
  try {
    const cast = loadCast();
    rows = await Promise.all(
      PERSONAS.map(async (persona) => {
        const s = await snapshot(persona.party(cast)!);
        const funds = new Set(s.parcels.map((p) => p.payload.contributor));
        return {
          persona,
          rounds: s.rounds.length,
          parcels: s.parcels.length,
          funds: funds.size,
          readable: readable(s),
          sums: s.partialSums.length,
          marks: s.marks.length,
          copies: s.copies.length,
          members: s.memberships.length,
        };
      }),
    );
  } catch (error) {
    return (
      <div className="page">
        <Offline error={error} />
      </div>
    );
  }

  const of = (role: string) => rows.filter((r) => r.persona.role === role);
  const verdicts = [
    {
      icon: EyeOff,
      value: of("node").reduce((n, r) => n + r.readable, 0),
      label: "fund prices any node can read",
      note: `across the ${of("node").reduce((n, r) => n + r.parcels, 0)} parcels the nodes hold right now`,
    },
    {
      icon: Eye,
      value: of("fund").filter((r) => r.readable > 1).length,
      label: "funds that can read another fund’s price",
      note: `each of ${of("fund").length} funds reads its own, at most`,
    },
    {
      icon: ShieldCheck,
      value: rows.length,
      label: "parties checked, live",
      note: "each through its own view of the ledger, on every load",
      plain: true,
    },
  ];

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <p className="eyebrow">Live from the ledger</p>
          <h1>
            Who sees <em>what.</em>
          </h1>
          <p>
            Each row is one Canton party, read just now from its own view of the ledger. The column to watch is
            “Marks it can read”: a node never gets there, however many parcels it holds.
          </p>
        </div>
      </div>
      <div className={styles.verdicts}>
        {verdicts.map(({ icon: Icon, value, label, note, plain }, i) => (
          <div
            key={label}
            className={styles.verdict}
            data-ok={(!plain && value === 0) || undefined}
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <Icon size={20} aria-hidden="true" />
            <strong>{value}</strong>
            <span>{label}</span>
            <small>{note}</small>
          </div>
        ))}
      </div>
      <div className={`panel ${styles.wrap}`}>
        <table className="table">
          <thead>
            <tr>
              <th>Party</th>
              <th className="num">Rounds</th>
              <th className="num">Parcels held</th>
              <th className="num">Marks it can read</th>
              <th className="num">Node sums</th>
              <th className="num">Members it sees</th>
              <th className="num">Marks</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.persona.key}>
                <td>
                  <span className="who" data-role={r.persona.role}>
                    {r.persona.name}
                  </span>
                  <br />
                  <span className="hint">{ROLE_LABEL[r.persona.role]}</span>
                </td>
                <td className="num">{r.rounds}</td>
                <td className="num">
                  {r.parcels}
                  {r.parcels > 0 && <span className="hint"> · {r.funds} funds</span>}
                </td>
                <td className="num">
                  <span className={styles.readable} data-zero={r.readable === 0 || undefined}>
                    {r.readable === 0 ? "none" : r.persona.role === "auditor" ? `${r.readable} · its client` : `${r.readable} · its own`}
                  </span>
                </td>
                <td className="num">{r.sums}</td>
                <td className="num">{r.members}</td>
                <td className="num">{r.marks + r.copies}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="grid" style={{ marginTop: 32 }}>
        <article className="card">
          <h3>Nodes hold pieces, never marks</h3>
          <p>
            Seat k gets every share but share k. Two random numbers from a mark say nothing about it. Any two nodes
            together could add a fund’s shares, which is why the panel needs three independent firms.
          </p>
        </article>
        <article className="card" style={{ animationDelay: "60ms" }}>
          <h3>Funds see only themselves</h3>
          <p>
            A fund contributes through its own invitations and gets its own copy of the result. It never sees a round,
            another fund’s parcel, or who else marked.
          </p>
        </article>
        <article className="card" style={{ animationDelay: "120ms" }}>
          <h3>Sums open only in a crowd</h3>
          <p>
            A node can’t report until the round closes with at least five funds, enforced in Daml. With mean and spread
            published, three funds could solve for each other, so the floor is at least four.
          </p>
        </article>
      </div>
    </div>
  );
}
