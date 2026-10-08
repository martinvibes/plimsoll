/** The ledger could not be read: say why, and how to fix it. */
export default function Offline({ error }: { error: unknown }) {
  const message = error instanceof Error ? error.message : String(error);
  return (
    <div className="panel empty">
      <p className="eyebrow">Ledger unavailable</p>
      <h2>Plimsoll can’t reach its ledger.</h2>
      <p>{message}</p>
      <p className="hint">
        Locally: <span className="mono">make sandbox</span>, then <span className="mono">make seed</span>.
      </p>
    </div>
  );
}
