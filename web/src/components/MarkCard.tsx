import Gauge from "./Gauge";
import Trend from "./Trend";
import { date, price } from "@/lib/plimsoll/format";
import type { Mark } from "@/lib/plimsoll/types";
import styles from "./MarkCard.module.css";

type Props = {
  mark: Mark;
  badge?: React.ReactNode;
  reporters: string[];
  delay?: number;
  /** Every round of this loan the holder has, oldest first, ending with `mark`. */
  history?: Mark[];
  children?: React.ReactNode;
};

const delta = (d: number) => (d === 0 ? "unchanged" : `${d > 0 ? "▲ +" : "▼ "}${price(d)}`);

export default function MarkCard({ mark, badge, reporters, delay = 0, history = [], children }: Props) {
  const mean = Number(mark.mean);
  const spread = Number(mark.spread);
  return (
    <article className="card" style={{ animationDelay: `${delay}ms` }}>
      <div className="row">
        <div>
          <h3>{mark.loan.borrower}</h3>
          <p className="meta">
            {mark.loan.facility} · matures {date(mark.loan.maturity)}
          </p>
        </div>
        {badge}
      </div>
      <div className={styles.figure}>
        <span className={styles.mean}>{price(mean)}</span>
        <span className={styles.spread}>± {price(spread)}</span>
      </div>
      <Gauge mean={mean} spread={spread} />
      {history.length > 1 && (
        <>
          <Trend
            points={history.map((m) => ({ mean: Number(m.mean), spread: Number(m.spread), asOf: m.asOf }))}
          />
          <p className={styles.change}>
            {history.length} rounds
            <span data-dir={Math.sign(mean - Number(history.at(-2)!.mean))}>
              {delta(mean - Number(history.at(-2)!.mean))} vs last round
            </span>
          </p>
        </>
      )}
      <dl className={styles.facts}>
        <div>
          <dt>As of</dt>
          <dd>{date(mark.asOf)}</dd>
        </div>
        <div>
          <dt>Funds</dt>
          <dd>{mark.count}</dd>
        </div>
        <div>
          <dt>Reported by</dt>
          <dd>{reporters.join(", ")}</dd>
        </div>
      </dl>
      {children}
    </article>
  );
}
