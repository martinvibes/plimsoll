import styles from "./Trend.module.css";

type Point = { mean: number; spread: number; asOf: string };

const W = 300;
const H = 64;
const PAD = 8;

/** A loan's consensus round after round: the mean inside its ±1σ band. */
export default function Trend({ points }: { points: Point[] }) {
  const lo = Math.min(...points.map((p) => p.mean - p.spread));
  const hi = Math.max(...points.map((p) => p.mean + p.spread));
  const span = hi - lo || 1;
  const x = (i: number) => (points.length === 1 ? W / 2 : PAD + (i / (points.length - 1)) * (W - 2 * PAD));
  const y = (v: number) => H - PAD - ((v - lo) / span) * (H - 2 * PAD);
  const xs = points.length === 1 ? [PAD, W - PAD] : points.map((_, i) => x(i));
  const ps = points.length === 1 ? [points[0]!, points[0]!] : points;
  const upper = ps.map((p, i) => `${i ? "L" : "M"}${xs[i]},${y(p.mean + p.spread)}`).join("");
  const lower = ps
    .map((p, i) => `L${xs[i]},${y(p.mean - p.spread)}`)
    .reverse()
    .join("");
  const line = ps.map((p, i) => `${i ? "L" : "M"}${xs[i]},${y(p.mean)}`).join("");
  const last = points.at(-1)!;
  return (
    <div className={styles.trend} role="img" aria-label={`Consensus over ${points.length} rounds`}>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true">
        <path className={styles.band} d={`${upper}${lower}Z`} />
        <path className={styles.line} d={line} />
      </svg>
      <span
        className={styles.dot}
        style={{ left: `${(x(points.length - 1) / W) * 100}%`, top: `${(y(last.mean) / H) * 100}%` }}
      />
    </div>
  );
}
