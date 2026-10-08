// Drives every write the app offers against a seeded sandbox and checks the
// ledger's answers, as each party sees them. Run with `make smoke`.
import { loadCast } from "@/lib/plimsoll/cast";
import { buy, contribute, openRound, publish, report } from "@/lib/plimsoll/operations";
import { parcelsFor, shareOut, toWire } from "@/lib/plimsoll/shares";
import { balance, snapshot } from "@/lib/plimsoll/snapshot";

const MARKS = [9640, 9710, 9580, 9800, 9655];
const CLOSES_IN_SECONDS = Number(process.env.PLIMSOLL_SMOKE_CLOSE_SECONDS ?? 12);

let passed = 0;
function check(claim: string, ok: boolean, detail = "") {
  if (!ok) throw new Error(`FAIL ${claim}${detail ? `: ${detail}` : ""}`);
  passed += 1;
  console.log(`  ok  ${claim}`);
}

async function main() {
  const cast = loadCast();
  const [opener] = cast.nodes as [string];
  const tag = Date.now().toString(36).toUpperCase();
  const loan = { id: `SMOKE-${tag}`, borrower: "Smoke Test Co", facility: "Term Loan B", maturity: "2031-06-30" };
  const asOf = new Date().toISOString().slice(0, 10);

  await openRound(opener, loan, asOf, CLOSES_IN_SECONDS / 60);
  const round = (await snapshot(opener)).rounds.find((r) => r.payload.loan.id === loan.id);
  check("a node opens a round", Boolean(round));
  const roundCid = round!.contractId;

  for (const [i, mark] of MARKS.entries()) {
    const fund = cast.funds[i]!;
    const invitations = (await snapshot(fund)).invitations.filter((x) => x.payload.roundCid === roundCid);
    check(`fund ${i + 1} holds three invitations, one per node`, invitations.length === 3);
    await contribute(fund, roundCid, parcelsFor(shareOut(mark)).map((p) => p.map(toWire)));
  }

  for (const [k, node] of cast.nodes.entries()) {
    const parcels = (await snapshot(node)).parcels.filter((p) => p.payload.roundCid === roundCid);
    const own = parcels.every((p) => p.payload.node === node && p.payload.shares.every((s) => Number(s.index) !== k + 1));
    check(`node ${k + 1} sees only its own parcels, without its seat's share`, parcels.length === MARKS.length && own);
  }
  const ashgrove = (await snapshot(cast.funds[0]!)).parcels.filter((p) => p.payload.roundCid === roundCid);
  check("a fund sees only its own parcels", ashgrove.every((p) => p.payload.contributor === cast.funds[0]));
  const audit = (await snapshot(cast.auditor)).parcels.filter((p) => p.payload.roundCid === roundCid);
  check("the fund's auditor sees all three of its client's parcels", audit.length === 3);
  const reader = await snapshot(cast.reader);
  check("the reader sees no round and no parcel", reader.rounds.length === 0 && reader.parcels.length === 0);

  const wait = new Date(round!.payload.closesAt).getTime() - Date.now() + 1500;
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));

  for (const node of cast.nodes) await report(node, roundCid);
  check("all three nodes report", (await snapshot(opener)).partialSums.filter((r) => r.payload.roundCid === roundCid).length === 3);

  await publish(opener, roundCid);
  const mark = (await snapshot(cast.funds[0]!)).copies.find((c) => c.payload.mark.loan.id === loan.id);
  const mean = MARKS.reduce((a, b) => a + b, 0) / MARKS.length / 100;
  check("every contributor gets the mark", Boolean(mark));
  check("the mean is exact", Math.abs(Number(mark!.payload.mark.mean) - mean) < 1e-9, `${mark!.payload.mark.mean} vs ${mean}`);
  check("the mark names no fund", !JSON.stringify(mark!.payload.mark).includes(cast.funds[0]!));

  const before = await snapshot(cast.reader);
  const listing = before.listings.find((l) => JSON.stringify(l.payload).includes(loan.id));
  check("the reader sees a listing", Boolean(listing));
  check("the listing does not carry the price", !JSON.stringify(listing!.payload).includes(String(mean)));
  const paid = await Promise.all(cast.nodes.map(async (n) => balance(await snapshot(n))));
  await buy(cast.reader, listing!.contractId);
  const after = await snapshot(cast.reader);
  const bought = after.copies.find((c) => c.payload.mark.loan.id === loan.id);
  check("the reader holds the mark after paying", bought?.payload.basis === "Purchased");
  for (const [k, node] of cast.nodes.entries()) {
    const fee = Number(listing!.payload.feePerNode);
    check(`node ${k + 1} was paid its fee`, balance(await snapshot(node)) - paid[k]! === fee);
  }

  console.log(`\n${passed} checks passed.`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
