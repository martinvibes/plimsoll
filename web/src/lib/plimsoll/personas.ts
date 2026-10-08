// The demo's cast as people see it. One server submits for every persona on
// the demo ledger; in production each runs its own participant.

export type Role = "fund" | "node" | "reader" | "auditor";

export type Cast = {
  registry: string;
  nodes: string[];
  funds: string[];
  auditor: string;
  reader: string;
};

export type Persona = {
  key: string;
  name: string;
  role: Role;
  blurb: string;
  /** A one-word status shown on compact persona tiles. */
  tag?: string;
  party: (cast: Cast) => string | undefined;
};

export const NODE_NAMES = ["Sextant Valuation", "Fathom Pricing", "Lodestar Data"];
export const FUND_NAMES = [
  "Ashgrove Credit",
  "Bramble Capital",
  "Coldwater Partners",
  "Dunmore Lending",
  "Eastfield Credit",
  "Fernhill Debt",
  "Greystone Partners",
];

const FUND_TAGS: (string | undefined)[] = ["audited", undefined, undefined, undefined, undefined, "new", "applicant"];

const FUND_BLURBS = [
  "Direct lender. Ledgerwise audits it.",
  "Mid-market fund on the panel.",
  "Sponsor-backed senior loans.",
  "Unitranche specialist.",
  "Credit opportunities fund.",
  "Admitted, yet to mark a round.",
  "Applied to join. Waiting on the nodes.",
];

export const PERSONAS: Persona[] = [
  ...FUND_NAMES.map((name, i) => ({
    key: name.split(" ")[0]!.toLowerCase(),
    name,
    role: "fund" as const,
    blurb: FUND_BLURBS[i]!,
    tag: FUND_TAGS[i],
    party: (c: Cast) => c.funds[i],
  })),
  ...NODE_NAMES.map((name, i) => ({
    key: name.split(" ")[0]!.toLowerCase(),
    name,
    role: "node" as const,
    blurb: `Seat ${i + 1}. Holds every share but share ${i + 1}.`,
    party: (c: Cast) => c.nodes[i],
  })),
  {
    key: "northbank",
    name: "Northbank",
    role: "reader",
    blurb: "NAV lender. Buys independent marks for its collateral.",
    party: (c) => c.reader,
  },
  {
    key: "ledgerwise",
    name: "Ledgerwise Audit",
    role: "auditor",
    blurb: "Ashgrove’s auditor. Sees what Ashgrove sent, nothing else.",
    party: (c) => c.auditor,
  },
];

export const DEFAULT_PERSONA = PERSONAS[0]!;

export const ROLE_LABEL: Record<Role, string> = {
  fund: "Fund",
  node: "Node",
  reader: "Lender",
  auditor: "Auditor",
};

export const ROLE_GROUP: Record<Role, string> = {
  fund: "Funds",
  node: "Panel nodes",
  reader: "Lender",
  auditor: "Auditor",
};

/** What each role does here, in a few words. */
export const ROLE_HINT: Record<Role, string> = {
  fund: "Send a split price",
  node: "Sum shares, publish marks",
  reader: "Buy the mark in CC",
  auditor: "Check a client’s marks",
};

export function personaByKey(key: string | undefined): Persona {
  return PERSONAS.find((p) => p.key === key) ?? DEFAULT_PERSONA;
}

/** A display name for any party in the cast. */
export function nameOf(cast: Cast, party: string): string {
  const node = cast.nodes.indexOf(party);
  if (node >= 0) return NODE_NAMES[node] ?? party;
  const fund = cast.funds.indexOf(party);
  if (fund >= 0) return FUND_NAMES[fund] ?? party;
  if (party === cast.reader) return "Northbank";
  if (party === cast.auditor) return "Ledgerwise Audit";
  if (party === cast.registry) return "Registry";
  return party.split("::")[0] ?? party;
}
