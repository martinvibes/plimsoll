// Contract payloads as the JSON Ledger API encodes them: Int and Decimal as
// strings, Optional as the value or null, Date as YYYY-MM-DD, Time as ISO.

export type Party = string;

export type InstrumentId = { admin: Party; id: string };

export type PanelTerms = {
  name: string;
  minContributors: string;
  feePerNode: string;
  instrumentId: InstrumentId;
};

export type Loan = { id: string; borrower: string; facility: string; maturity: string };

export type Member = { party: Party; auditor: Party | null };

export type Mark = {
  panel: string;
  roundId: string;
  loan: Loan;
  asOf: string;
  count: string;
  mean: string;
  spread: string;
  reporters: Party[];
};

export type Panel = { nodes: Party[]; terms: PanelTerms };

export type Seat = { node: Party; slot: string; nodes: Party[]; panel: string };

export type Round = {
  nodes: Party[];
  terms: PanelTerms;
  roundId: string;
  loan: Loan;
  asOf: string;
  closesAt: string;
  members: Member[];
};

export type Invitation = {
  node: Party;
  slot: string;
  nodes: Party[];
  member: Member;
  roundCid: string;
  roundId: string;
  loan: Loan;
  asOf: string;
  closesAt: string;
};

export type Share = { index: string; value: string; square: string };

export type Parcel = {
  node: Party;
  slot: string;
  contributor: Party;
  auditor: Party | null;
  roundCid: string;
  roundId: string;
  shares: Share[];
};

export type Column = { index: string; total: string; squares: string };

export type PartialSum = {
  node: Party;
  slot: string;
  nodes: Party[];
  roundCid: string;
  contributors: Party[];
  columns: Column[];
};

export type ConsensusMark = { nodes: Party[]; mark: Mark };

export type MarkCopy = {
  nodes: Party[];
  mark: Mark;
  holder: Party;
  auditor: Party | null;
  basis: "Contributed" | "Purchased";
};

export type MembershipApplication = {
  member: Party;
  auditor: Party | null;
  nodes: Party[];
  panel: string;
  approvals: Party[];
};

export type Membership = { nodes: Party[]; panel: string; member: Party; auditor: Party | null };

export type Subscription = { nodes: Party[]; panel: string; reader: Party };

export type Listing = {
  nodes: Party[];
  reader: Party;
  markCid: string;
  roundId: string;
  loan: Loan;
  asOf: string;
  count: string;
  feePerNode: string;
  instrumentId: InstrumentId;
};

export type Metadata = { values: Record<string, string> };

export type SettlementInfo = {
  executor: Party;
  settlementRef: { id: string; cid: string | null };
  requestedAt: string;
  allocateBefore: string;
  settleBefore: string;
  meta: Metadata;
};

export type TransferLeg = {
  sender: Party;
  receiver: Party;
  amount: string;
  instrumentId: InstrumentId;
  meta: Metadata;
};

export type ReadRequest = {
  nodes: Party[];
  reader: Party;
  markCid: string;
  feePerNode: string;
  instrumentId: InstrumentId;
  settlement: SettlementInfo;
};

export type HoldingView = {
  owner: Party;
  instrumentId: InstrumentId;
  amount: string;
  lock: unknown | null;
  meta: Metadata;
};

export type AllocationView = {
  allocation: { settlement: SettlementInfo; transferLegId: string; transferLeg: TransferLeg };
  holdingCids: string[];
  meta: Metadata;
};
