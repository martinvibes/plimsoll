import styles from "./Gauge.module.css";

type Props = {
  mean: number;
  spread: number;
  /** A mark to compare against the consensus, such as the holder's own. */
  compare?: { value: number; label: string };
};

/** The consensus as a load line: the mean, a band one standard deviation
 *  either side, on a scale that keeps both in view. */
export default function Gauge({ mean, spread, compare }: Props) {
  const points = [mean - 2 * spread, mean + 2 * spread, ...(compare ? [compare.value] : [])];
  const low = Math.floor(Math.min(...points) - 1);
  const high = Math.ceil(Math.max(...points) + 1);
  const at = (v: number) => `${((v - low) / (high - low)) * 100}%`;
  return (
    <div className={styles.gauge} role="img" aria-label={`Consensus ${mean.toFixed(2)}, spread ${spread.toFixed(2)}`}>
      <div className={styles.track}>
        <span className={styles.band} style={{ left: at(mean - spread), width: `calc(${at(mean + spread)} - ${at(mean - spread)})` }} />
        <span className={styles.mean} style={{ left: at(mean) }} />
        {compare && (
          <span className={styles.compare} style={{ left: at(compare.value) }} data-label={compare.label} />
        )}
      </div>
      <div className={styles.scale}>
        <span>{low.toFixed(0)}</span>
        <span>{high.toFixed(0)}</span>
      </div>
    </div>
  );
}
