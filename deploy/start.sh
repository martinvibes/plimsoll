#!/usr/bin/env bash
# SPDX-License-Identifier: Apache-2.0

# Starts the hosted demo (deploy/Dockerfile): the Canton sandbox with
# Plimsoll, a fresh demo panel, then the web app. The sandbox keeps its state
# in memory, so every start is a new ledger and a new panel. If either process
# stops, the container stops, and the host restarts it.
set -euo pipefail

# Against a remote ledger, such as the HackCanton DevNet (docs/devnet.md), only
# the web app runs: the cast comes from PLIMSOLL_CAST, and the Keycloak tokens
# from PLIMSOLL_LEDGER_TOKENS, written to the token file the app refreshes.
if [[ -n "${PLIMSOLL_LEDGER_URL:-}" ]]; then
  if [[ -n "${PLIMSOLL_LEDGER_TOKENS:-}" ]]; then
    mkdir -p "$(dirname "$PLIMSOLL_LEDGER_TOKEN_FILE")"
    (umask 077 && printf '%s' "$PLIMSOLL_LEDGER_TOKENS" > "$PLIMSOLL_LEDGER_TOKEN_FILE")
  fi
  exec node /app/server.js
fi

java ${CANTON_JAVA_OPTS:--Xmx512m} -jar /opt/plimsoll/canton.jar sandbox \
  --ledger-api-port 6865 --json-api-port 7575 --dar /opt/plimsoll/plimsoll-demo.dar &
canton=$!

echo "Waiting for the ledger"
until node -e 'fetch("http://localhost:7575/readyz").then((r) => process.exit(r.ok ? 0 : 1), () => process.exit(1))'; do
  kill -0 "$canton" 2>/dev/null || { echo "The sandbox stopped" >&2; exit 1; }
  sleep 2
done

script() {
  java ${SCRIPT_JAVA_OPTS:--Xmx512m} -jar /opt/plimsoll/daml-script.jar \
    --dar /opt/plimsoll/plimsoll-demo.dar --ledger-host localhost --ledger-port 6865 \
    --wall-clock-time "$@"
}

# The DAR finishes loading just after the ledger reports ready, so the seed
# gets a few tries. Each try allocates freshly tagged parties.
mkdir -p "$(dirname "$PLIMSOLL_CAST_FILE")"
for try in 1 2 3 4 5; do
  script --script-name Plimsoll.Demo:open --output-file "$PLIMSOLL_CAST_FILE" && break
  [[ $try == 5 ]] && { echo "Seeding failed" >&2; exit 1; }
  sleep 5
done

# The past rounds close thirty seconds after they open; then the nodes report
# and publish them.
echo "Waiting for the past rounds to close"
sleep 35
script --script-name Plimsoll.Demo:publishClosed --input-file "$PLIMSOLL_CAST_FILE"
echo "Seeded the demo panel"

node /app/server.js &
web=$!

wait -n "$canton" "$web"
echo "A process stopped; exiting so the host restarts the demo" >&2
exit 1
