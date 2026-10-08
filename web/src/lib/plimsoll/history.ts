import { qualifiedName, witnessed } from "@/lib/ledger/client";
import { recombine } from "./shares";
import type { Parcel } from "./types";

export type Submission = { roundId: string; fund: string; at: string; parcels: Parcel[]; value: number | null };

/** Every parcel `party` signed or was shown, from its own transaction history.
 *  Nodes consume parcels when they report, but the history keeps them. */
export async function parcelsSeen(party: string): Promise<Array<{ at: string; parcel: Parcel }>> {
  const transactions = await witnessed(party);
  return transactions.flatMap((tx) =>
    tx.events.flatMap((e) =>
      e.kind === "created" && qualifiedName(e.templateId) === "Plimsoll.Round:Parcel"
        ? [{ at: tx.effectiveAt, parcel: e.payload as Parcel }]
        : [],
    ),
  );
}

/** The price each fund submitted to each round, rebuilt from its parcels once
 *  all three share indices are in view; null while any is missing. */
export function submissions(seen: Array<{ at: string; parcel: Parcel }>): Submission[] {
  const keys = [...new Set(seen.map((x) => `${x.parcel.roundId}\u0000${x.parcel.contributor}`))];
  return keys.map((key) => {
    const [roundId, fund] = key.split("\u0000") as [string, string];
    const mine = seen.filter((x) => x.parcel.roundId === roundId && x.parcel.contributor === fund);
    const shares = mine.flatMap((x) => x.parcel.shares);
    const complete = new Set(shares.map((sh) => String(sh.index))).size === 3;
    return { roundId, fund, at: mine[0]!.at, parcels: mine.map((x) => x.parcel), value: complete ? recombine(shares) / 100 : null };
  });
}
