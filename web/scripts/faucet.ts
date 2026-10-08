// Tops up the reader's Canton Coin from the DevNet faucet, so it can buy
// marks. `scripts/devnet.sh seed` runs it after the panel is formed.
import { bearerToken } from "@/lib/ledger/auth";
import { exercise, submit } from "@/lib/ledger/client";
import { loadCast } from "@/lib/plimsoll/cast";
import { balance, snapshot } from "@/lib/plimsoll/snapshot";

const SCAN = (process.env.PLIMSOLL_REGISTRY_URL ?? "").replace(/\/$/, "");
/** Enough for eight marks at three fees of 25, with room for holding fees. */
const TARGET = 650;

type ScanContract = {
  contract: { template_id: string; contract_id: string; created_event_blob: string; payload: Record<string, unknown> };
  domain_id: string;
};

async function scan<T>(path: string): Promise<T> {
  const token = await bearerToken();
  const res = await fetch(`${SCAN}${path}`, { headers: token ? { authorization: `Bearer ${token}` } : {} });
  if (!res.ok) throw new Error(`scan proxy ${path}: ${res.status} ${await res.text()}`);
  return (await res.json()) as T;
}

const disclose = (c: ScanContract) => ({
  templateId: c.contract.template_id,
  contractId: c.contract.contract_id,
  createdEventBlob: c.contract.created_event_blob,
  synchronizerId: c.domain_id,
});

async function main() {
  if (!SCAN) throw new Error("Set PLIMSOLL_REGISTRY_URL to the validator's scan proxy.");
  const { reader, registry } = loadCast();
  const held = balance(await snapshot(reader), { admin: registry, id: "Amulet" });
  const short = Math.ceil(TARGET - held);
  if (short <= 0) {
    console.log(`  reader: already holds ${held.toFixed(2)} CC`);
    return;
  }
  const { amulet_rules: rules } = await scan<{ amulet_rules: ScanContract }>("/amulet-rules");
  const { open_mining_rounds: rounds } = await scan<{ open_mining_rounds: ScanContract[] }>(
    "/open-and-issuing-mining-rounds",
  );
  const now = new Date().toISOString();
  const round = rounds
    .filter((r) => String(r.contract.payload.opensAt) <= now)
    .sort((a, b) => String(a.contract.payload.opensAt).localeCompare(String(b.contract.payload.opensAt)))
    .at(-1);
  if (!round) throw new Error("No mining round is open.");
  await submit({
    actAs: [reader],
    disclosedContracts: [disclose(rules), disclose(round)],
    commands: [
      exercise(rules.contract.template_id, rules.contract.contract_id, "AmuletRules_DevNet_Tap", {
        receiver: reader,
        amount: `${short}.0`,
        openRound: round.contract.contract_id,
      }),
    ],
  });
  console.log(`  reader: tapped ${short} CC`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
