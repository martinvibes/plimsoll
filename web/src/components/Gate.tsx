import { PERSONAS, ROLE_HINT, ROLE_LABEL, type Role } from "@/lib/plimsoll/personas";
import PersonaPicker from "./PersonaPicker";
import { ROLE_ICON } from "./roleIcons";
import styles from "./Gate.module.css";

/** Shown when the current persona has no business on a page. */
export default function Gate({ role, why }: { role: Role; why: string }) {
  const Icon = ROLE_ICON[role];
  const options = PERSONAS.filter((p) => p.role === role).map(({ key, name, blurb, tag }) => ({
    key,
    name,
    role,
    blurb,
    tag,
  }));
  return (
    <section className={styles.gate} data-role={role}>
      <div className={styles.halo} aria-hidden="true">
        <i />
        <i />
        <span>
          <Icon size={26} />
        </span>
      </div>
      <p className="eyebrow">
        {ROLE_LABEL[role]} view · {ROLE_HINT[role]}
      </p>
      <h2>{why}</h2>
      <p className={styles.lede}>Pick one to step in. Each is its own Canton party and sees only its own contracts.</p>
      <PersonaPicker personas={options} />
    </section>
  );
}
