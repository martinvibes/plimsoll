// Replicated 2-of-3 secret sharing over the integers modulo p = 2^61 - 1, as
// the Daml model checks it (Plimsoll.Field). Runs in the fund's browser: the
// mark and its square are each split into three shares that add up to them
// modulo p, and seat k receives every share but share k.

export const PRIME = (1n << 61n) - 1n;

/** The highest mark a fund may submit: 200.00, in hundredths of a point. */
export const MAX_MARK = 20_000;

export type Share = { index: number; value: bigint; square: bigint };

const reduce = (x: bigint) => ((x % PRIME) + PRIME) % PRIME;

/** A uniform element of [0, p), from the platform's CSPRNG. */
export function randomElement(): bigint {
  const word = new BigUint64Array(1);
  for (;;) {
    crypto.getRandomValues(word);
    const candidate = word[0]! & PRIME;
    if (candidate < PRIME) return candidate;
  }
}

/** The three shares of `mark` (in hundredths of a point). */
export function shareOut(mark: number): Share[] {
  if (!Number.isInteger(mark) || mark < 0 || mark > MAX_MARK) {
    throw new RangeError("A mark is between 0.00 and 200.00 points of par.");
  }
  const x = BigInt(mark);
  const [v1, v2, q1, q2] = [randomElement(), randomElement(), randomElement(), randomElement()];
  return [
    { index: 1, value: v1, square: q1 },
    { index: 2, value: v2, square: q2 },
    { index: 3, value: reduce(x - v1 - v2), square: reduce(x * x - q1 - q2) },
  ];
}

/** The parcel for each seat, 1 to 3: every share but the seat's own. */
export function parcelsFor(shares: Share[]): Share[][] {
  return [1, 2, 3].map((seat) => shares.filter((s) => s.index !== seat));
}

/** The mark that a full set of shares adds up to. */
export function recombine(shares: Array<{ index: number | string; value: bigint | string }>): number {
  const byIndex = new Map(shares.map((s) => [Number(s.index), BigInt(s.value)]));
  if (byIndex.size !== 3) throw new Error("Recombining a mark needs all three shares.");
  return Number(reduce([...byIndex.values()].reduce((a, b) => a + b, 0n)));
}

/** Parse "93.25" into hundredths of a point. */
export function parseMark(input: string): number {
  const match = input.trim().match(/^(\d{1,3})(?:\.(\d{1,2}))?$/);
  if (!match) throw new RangeError("Enter a price like 93.25.");
  const mark = Number(match[1]) * 100 + Number((match[2] ?? "").padEnd(2, "0"));
  if (mark > MAX_MARK) throw new RangeError("A mark is at most 200.00.");
  return mark;
}

export const toWire = (s: Share) => ({ index: String(s.index), value: String(s.value), square: String(s.square) });
