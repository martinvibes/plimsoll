// Display helpers, safe on the server and in the browser.

export const price = (value: string | number, places = 2) => Number(value).toFixed(places);

export const coin = (value: string | number) =>
  `${Number(value).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} CC`;

export function date(iso: string): string {
  return new Date(`${iso.slice(0, 10)}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** "in 4 min", "2 h ago". */
export function relative(iso: string, now = Date.now()): string {
  const ms = new Date(iso).getTime() - now;
  const minutes = Math.round(Math.abs(ms) / 60_000);
  const span =
    minutes < 1 ? "under a minute" : minutes < 60 ? `${minutes} min` : minutes < 2880 ? `${Math.round(minutes / 60)} h` : `${Math.round(minutes / 1440)} d`;
  return ms >= 0 ? `in ${span}` : `${span} ago`;
}

/** A short form of a long hex value or party id. */
export const short = (value: string, keep = 6) => (value.length > keep * 2 + 1 ? `${value.slice(0, keep)}…${value.slice(-4)}` : value);
