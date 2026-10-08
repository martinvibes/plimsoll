// Reports and publishes every closed round, and lists each mark to the
// reader, picking up wherever an earlier run stopped: a node that has already
// reported a round is skipped. `scripts/devnet.sh seed` runs it once the past
// rounds close.
import { loadCast } from "@/lib/plimsoll/cast";
import { publish, report } from "@/lib/plimsoll/operations";
import { snapshot } from "@/lib/plimsoll/snapshot";

async function main() {
  const { nodes } = loadCast();
  const [lead] = nodes as [string];
  const now = Date.now();
  const closed = (await snapshot(lead)).rounds
    .filter((r) => new Date(r.payload.closesAt).getTime() <= now)
    .sort((a, b) => a.payload.roundId.localeCompare(b.payload.roundId));
  for (const round of closed) {
    for (const node of nodes) {
      const done = (await snapshot(node)).partialSums.some(
        (s) => s.payload.roundCid === round.contractId && s.payload.node === node,
      );
      if (!done) await report(node, round.contractId);
    }
    await publish(lead, round.contractId);
    console.log(`  published ${round.payload.roundId}`);
  }
  if (closed.length === 0) console.log("  no closed rounds left to publish");
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
