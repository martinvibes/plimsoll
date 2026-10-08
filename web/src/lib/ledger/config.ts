import "server-only";

/** Where the JSON Ledger API lives and how the app authenticates to it. */
export const LEDGER = {
  url: (process.env.PLIMSOLL_LEDGER_URL ?? "http://localhost:7575").replace(/\/$/, ""),
  /** The network's name, as the app's header shows it. */
  network: process.env.PLIMSOLL_NETWORK ?? "Canton sandbox",
  /** What readers pay in: Canton Coin once its registry is set, else the sandbox's CIP-56 test token. */
  coin: process.env.PLIMSOLL_REGISTRY_URL ? "Canton Coin" : "test CC",
  /** The ledger user to submit as; defaults to the token's subject, else `plimsoll-web`. */
  userId: process.env.PLIMSOLL_LEDGER_USER,
  /** A fixed bearer token. The local sandbox needs none. */
  token: process.env.PLIMSOLL_LEDGER_TOKEN,
  /** A Keycloak token file (`make devnet-login`), refreshed before it expires. */
  tokenFile: process.env.PLIMSOLL_LEDGER_TOKEN_FILE,
  oidc: {
    tokenUrl: process.env.PLIMSOLL_OIDC_TOKEN_URL,
    clientId: process.env.PLIMSOLL_OIDC_CLIENT_ID,
  },
  /** Package ids every submission prefers, comma-separated; see `submit`. */
  packagePreference: (process.env.PLIMSOLL_PACKAGE_PREFERENCE ?? "").split(",").filter(Boolean),
};
