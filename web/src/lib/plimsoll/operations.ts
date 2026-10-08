import "server-only";
import { exercise, submit } from "@/lib/ledger/client";
import { LEDGER } from "@/lib/ledger/config";
import { disclosedOf, NO_EXTRA_ARGS, registryFor } from "@/lib/ledger/registry";
import { CIP56, T } from "@/lib/plimsoll/ids";
import { snapshot } from "@/lib/plimsoll/snapshot";
import type * as P from "@/lib/plimsoll/types";

// Every ledger step the app takes, each submitted as the party who would take
// it in production.

// Funds -----------------------------------------------------------------------

/** Send each seat its parcel, all three in one transaction. The parcels were
 *  split in the fund's browser; `parcels[k]` goes to seat k + 1. */
export async function contribute(fund: string, roundCid: string, parcels: P.Share[][]) {
  const s = await snapshot(fund);
  const invitations = s.invitations.filter((i) => i.payload.roundCid === roundCid);
  if (invitations.length !== 3) throw new Error("This round has no open invitation for you.");
  await submit({
    actAs: [fund],
    commands: invitations.map((i) => {
      const shares = parcels[Number(i.payload.slot) - 1];
      if (!shares) throw new Error("A parcel is missing.");
      return exercise(T.Invitation, i.contractId, "Invitation_Contribute", { shares });
    }),
  });
}

// Nodes -----------------------------------------------------------------------

export async function openRound(node: string, loan: P.Loan, asOf: string, closesInMinutes: number) {
  const s = await snapshot(node);
  const panel = s.panels[0];
  if (!panel) throw new Error("This node sits on no panel.");
  const roundId = `${loan.id}/${asOf}`;
  await submit({
    actAs: [node],
    commands: [
      exercise(T.Panel, panel.contractId, "Panel_OpenRound", {
        opener: node,
        roundId,
        loan,
        asOf,
        closesAt: new Date(Date.now() + closesInMinutes * 60_000).toISOString(),
        memberships: s.memberships.map((m) => m.contractId),
      }),
    ],
  });
}

/** Collect this node's parcels for a closed round and publish its column sums. */
export async function report(node: string, roundCid: string) {
  const s = await snapshot(node);
  const seat = s.seats.find((x) => x.payload.node === node);
  if (!seat) throw new Error("This node has no seat.");
  const parcels = s.parcels.filter((p) => p.payload.roundCid === roundCid && p.payload.node === node);
  await submit({
    actAs: [node],
    commands: [exercise(T.Seat, seat.contractId, "Seat_Report", { roundCid, parcels: parcels.map((p) => p.contractId) })],
  });
}

/** Publish from every report filed, then list the mark to every subscribed reader. */
export async function publish(node: string, roundCid: string) {
  const s = await snapshot(node);
  const reports = s.partialSums.filter((r) => r.payload.roundCid === roundCid);
  const [created] = await submit({
    actAs: [node],
    commands: [
      exercise(T.Round, roundCid, "Round_Publish", { publisher: node, reports: reports.map((r) => r.contractId) }),
    ],
  }).then((events) => events.filter((e) => e.templateId.endsWith(":Plimsoll.Mark:ConsensusMark")));
  const panel = s.panels[0];
  if (!created || !panel || s.subscriptions.length === 0) return;
  await submit({
    actAs: [node],
    commands: [
      exercise(T.Panel, panel.contractId, "Panel_List", {
        node,
        markCid: created.contractId,
        subscriptions: s.subscriptions.map((x) => x.contractId),
      }),
    ],
  });
}

export async function decide(node: string, applicationCid: string, approve: boolean) {
  await submit({
    actAs: [node],
    commands: [
      exercise(
        T.MembershipApplication,
        applicationCid,
        approve ? "MembershipApplication_Approve" : "MembershipApplication_Reject",
        { node },
      ),
    ],
  });
}

// Readers ---------------------------------------------------------------------

/** Buy a listed mark: open the request, fund one fee leg per node from the
 *  reader's CIP-56 holdings, and have the executor settle every leg and hand
 *  over the mark in one transaction. */
export async function buy(reader: string, listingCid: string) {
  const [request] = await submit({
    actAs: [reader],
    commands: [exercise(T.Listing, listingCid, "Listing_Buy", {})],
  }).then((events) => events.filter((e) => e.templateId.endsWith(":Plimsoll.Access:ReadRequest")));
  if (!request) throw new Error("The listing did not open a request.");
  const s = await snapshot(reader);
  const open = s.readRequests.find((r) => r.contractId === request.contractId);
  if (!open) throw new Error("The request is not visible to the reader.");
  const { settlement, nodes, feePerNode, instrumentId } = open.payload;
  const allocationCids: string[] = [];
  for (const [i, node] of nodes.entries()) {
    allocationCids.push(
      await allocate({
        settlement,
        transferLegId: `fee-${i + 1}`,
        transferLeg: { sender: reader, receiver: node, amount: feePerNode, instrumentId, meta: { values: {} } },
      }),
    );
  }
  const registry = registryFor(instrumentId);
  const contexts = await Promise.all(allocationCids.map((cid) => registry.allocationContext(cid, "execute-transfer")));
  await submit({
    actAs: [settlement.executor],
    disclosedContracts: disclosedOf(contexts),
    commands: [
      exercise(T.ReadRequest, request.contractId, "ReadRequest_Fulfil", {
        allocations: allocationCids.map((cid, i) => ({ _1: cid, _2: contexts[i]!.extraArgs })),
      }),
    ],
  });
}

/** Fund one settlement leg from the sender's own holdings through the
 *  registry's allocation factory, as the sender's CIP-56 wallet would. */
async function allocate(spec: P.AllocationView["allocation"]): Promise<string> {
  const { sender, instrumentId } = spec.transferLeg;
  const s = await snapshot(sender);
  const inputs = s.holdings.filter(
    (h) =>
      h.payload.owner === sender &&
      h.payload.lock === null &&
      h.payload.instrumentId.admin === instrumentId.admin &&
      h.payload.instrumentId.id === instrumentId.id,
  );
  if (inputs.length === 0) throw new Error(`No ${LEDGER.coin} to pay with.`);
  const args = {
    expectedAdmin: instrumentId.admin,
    allocation: spec,
    requestedAt: new Date(Date.now() - 5000).toISOString(),
    inputHoldingCids: inputs.map((h) => h.contractId),
    extraArgs: NO_EXTRA_ARGS,
  };
  const { factoryId, extraArgs, disclosed } = await registryFor(instrumentId).allocationFactory(args);
  await submit({
    actAs: [sender],
    disclosedContracts: disclosed,
    commands: [exercise(CIP56.AllocationFactory, factoryId, "AllocationFactory_Allocate", { ...args, extraArgs })],
  });
  const funded = (await snapshot(sender)).allocations.find(
    (a) =>
      a.payload.allocation.transferLegId === spec.transferLegId &&
      a.payload.allocation.settlement.settlementRef.id === spec.settlement.settlementRef.id,
  );
  if (!funded) throw new Error("The registry did not create the allocation.");
  return funded.contractId;
}
