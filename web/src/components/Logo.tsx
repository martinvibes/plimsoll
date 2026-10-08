/** The Plimsoll mark: a ring with the load line through it. */
export default function Logo({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" focusable="false">
      <circle cx="32" cy="32" r="19" fill="none" stroke="currentColor" strokeWidth="4.5" />
      <rect x="4" y="29.5" width="56" height="5" rx="1" fill="var(--signal)" />
    </svg>
  );
}
