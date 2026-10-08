import "server-only";
import { activeContracts, qualifiedName, type ActiveContract, type Contract } from "@/lib/ledger/client";
import { CIP56, T } from "@/lib/plimsoll/ids";
import type * as P from "@/lib/plimsoll/types";

/** Everything one party can see, read from the ledger in one call. */
export type Snapshot = {
  party: string;
  panels: Contract<P.Panel>[];
  seats: Contract<P.Seat>[];
  rounds: Contract<P.Round>[];
  invitations: Contract<P.Invitation>[];
  parcels: Contract<P.Parcel>[];
  partialSums: Contract<P.PartialSum>[];
  marks: Contract<P.ConsensusMark>[];
  copies: Contract<P.MarkCopy>[];
  applications: Contract<P.MembershipApplication>[];
  memberships: Contract<P.Membership>[];
  subscriptions: Contract<P.Subscription>[];
  listings: Contract<P.Listing>[];
  readRequests: Contract<P.ReadRequest>[];
  holdings: Contract<P.HoldingView>[];
  allocations: Contract<P.AllocationView>[];
};

const TEMPLATES = Object.values(T);
const INTERFACES = [CIP56.Holding, CIP56.Allocation];

export async function snapshot(party: string): Promise<Snapshot> {
  const all = await activeContracts(party, { templates: TEMPLATES, interfaces: INTERFACES });
  const of = <K>(templateId: string) => {
    const name = qualifiedName(templateId);
    return all.filter((c) => qualifiedName(c.templateId) === name).map(asContract<K>);
  };
  const ofInterface = <V>(interfaceId: string) => {
    const name = qualifiedName(interfaceId);
    return all
      .filter((c) => name in c.views)
      .map((c) => ({ contractId: c.contractId, templateId: c.templateId, createdAt: c.createdAt, payload: c.views[name] as V }));
  };
  return {
    party,
    panels: of(T.Panel),
    seats: of(T.Seat),
    rounds: of(T.Round),
    invitations: of(T.Invitation),
    parcels: of(T.Parcel),
    partialSums: of(T.PartialSum),
    marks: of(T.ConsensusMark),
    copies: of(T.MarkCopy),
    applications: of(T.MembershipApplication),
    memberships: of(T.Membership),
    subscriptions: of(T.Subscription),
    listings: of(T.Listing),
    readRequests: of(T.ReadRequest),
    holdings: ofInterface<P.HoldingView>(CIP56.Holding),
    allocations: ofInterface<P.AllocationView>(CIP56.Allocation),
  };
}

function asContract<K>(c: ActiveContract): Contract<K> {
  return { contractId: c.contractId, templateId: c.templateId, createdAt: c.createdAt, payload: c.payload as K };
}

/** `party`'s unlocked balance of `instrument`. */
export function balance(s: Snapshot, instrument?: P.InstrumentId): number {
  return s.holdings
    .filter((h) => h.payload.owner === s.party && h.payload.lock === null)
    .filter((h) => !instrument || (h.payload.instrumentId.admin === instrument.admin && h.payload.instrumentId.id === instrument.id))
    .reduce((sum, h) => sum + Number(h.payload.amount), 0);
}
