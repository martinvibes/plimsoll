import Logo from "@/components/Logo";
import styles from "./loading.module.css";

/** Shown only while the next route is loading. */
export default function Loading() {
  return (
    <div className={styles.screen} role="status" aria-live="polite" aria-atomic="true">
      <div className={styles.visual} aria-hidden="true">
        <Logo size={72} />
      </div>
      <p className={styles.label}>Reading the ledger</p>
    </div>
  );
}
