#!/usr/bin/env bash
#
# The Plimsoll demo on the HackCanton DevNet node, hosted by NODERS. Parties
# and the DAR are created in the node's Console; the ledger is reached with a
# Keycloak token for your hackathon account.
#
#   scripts/devnet.sh login    sign in once (asks for email and password)
#   scripts/devnet.sh seed     seed the demo panel on the Console's parties
#   scripts/devnet.sh publish  finish publishing closed rounds, if a seed stopped early
#   scripts/devnet.sh web      run the web app against DevNet
#   scripts/devnet.sh smoke    open a round and drive it through every app action
#   scripts/devnet.sh reset    archive every Plimsoll contract, to seed again
#
# On DevNet readers pay in Canton Coin: the reader's coin comes from the DevNet
# faucet, and every fee leg is allocated and settled through Canton Coin's
# CIP-56 registry, reached through the validator's scan proxy.
#
# The node is shared, and any team may upload a later version of a package
# Plimsoll uses, so the app pins every submission to the package ids built
# into the DAR.
#
# Tokens and the cast are written to .plimsoll/, which git ignores.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
STATE="$ROOT/.plimsoll"
TOKENS="$STATE/devnet-tokens.json"
CAST="$STATE/devnet-cast.json"
MODEL_DAR="$ROOT/daml/plimsoll/.daml/dist/plimsoll-0.1.0.dar"
DEMO_DAR="$ROOT/daml/plimsoll-demo/.daml/dist/plimsoll-demo-0.1.0.dar"
DPM="${DPM:-dpm}"

JSON_API="https://ledger-api-json.participant.hackcanton-01.devnet.naas.noders.services"
GRPC_HOST="ledger-api-grpc.participant.hackcanton-01.devnet.naas.noders.services"
SCAN_PROXY="https://validator-api-http.validator.hackcanton-01.devnet.naas.noders.services/api/validator/v0/scan-proxy"
OIDC_TOKEN_URL="https://keycloak.naas.noders.services/realms/noders-appsfactory/protocol/openid-connect/token"
OIDC_CLIENT_ID="web-app-ui-hackcanton-01-devnet"

# Console party names, in the order the demo uses them.
NODES="sextant fathom lodestar"
FUNDS="ashgrove bramble coldwater dunmore eastfield fernhill greystone"
READER="northbank"
AUDITOR="ledgerwise"

# Past rounds close a minute after they open (Plimsoll.Demo:devnet).
CLOSE_SECONDS=60

die() { echo "devnet: $*" >&2; exit 1; }

# Saves a Keycloak token response (stdin) over the stored tokens, keeping the
# refresh token when the response does not rotate it.
save_tokens() {
  local response tmp
  response="$(cat)"
  jq -e .access_token > /dev/null <<< "$response" || die "Keycloak refused: $response"
  mkdir -p "$STATE"
  tmp="$(mktemp "$TOKENS.XXXXXX")"
  if [[ -f "$TOKENS" ]]; then
    jq --argjson new "$response" '. * $new' "$TOKENS" > "$tmp"
  else
    printf '%s\n' "$response" > "$tmp"
  fi
  chmod 600 "$tmp"
  mv "$tmp" "$TOKENS"
}

# A claim from the stored access token, e.g. `claim sub`.
claim() {
  local payload
  payload="$(jq -r .access_token "$TOKENS" | cut -d. -f2 | tr '_-' '/+')"
  while (( ${#payload} % 4 )); do payload+="="; done
  base64 -d <<< "$payload" | jq -r ".$1"
}

# A valid access token, refreshed when it has less than a minute left.
access_token() {
  [[ -f "$TOKENS" ]] || die "not signed in; run: make devnet-login"
  if (( $(claim exp) - 60 < $(date +%s) )); then
    jq -j .refresh_token "$TOKENS" | curl -sS "$OIDC_TOKEN_URL" \
      --data-urlencode grant_type=refresh_token \
      --data-urlencode client_id="$OIDC_CLIENT_ID" \
      --data-urlencode refresh_token@- | save_tokens
  fi
  jq -r .access_token "$TOKENS"
}

login() {
  local email password
  read -rp "HackCanton email: " email
  read -rsp "Password: " password
  echo
  printf %s "$password" | curl -sS "$OIDC_TOKEN_URL" \
    --data-urlencode grant_type=password \
    --data-urlencode client_id="$OIDC_CLIENT_ID" \
    --data-urlencode username="$email" \
    --data-urlencode password@- \
    --data-urlencode "scope=openid daml_ledger_api offline_access" | save_tokens
  echo "Signed in as ledger user $(claim sub). Tokens saved to .plimsoll/ (never commit them)."
}

# The cast, from the parties your ledger user can act as (the Console names
# each `<namespace>-<name>`), with Canton Coin's admin, the DSO, as registry.
cast_from_rights() {
  local token="$1" user="$2" dso
  dso="$(curl -sS --fail-with-body "$SCAN_PROXY/amulet-rules" -H "Authorization: Bearer $token" |
    jq -r .amulet_rules.contract.payload.dso)"
  curl -sS --fail-with-body "$JSON_API/v2/users/$user/rights" -H "Authorization: Bearer $token" |
    jq --arg dso "$dso" --arg nodes "$NODES" --arg funds "$FUNDS" --arg reader "$READER" --arg auditor "$AUDITOR" '
      [.rights[].kind.CanActAs.value.party? // empty] as $parties
      | def one($name):
          [$parties[] | select(contains("-" + $name + "::"))] | unique
          | if length == 1 then .[0]
            else error("expected one party named \($name), found \(length): create it in the Console")
            end;
      { registry: $dso,
        reader: one($reader),
        nodes: [$nodes | split(" ")[] | one(.)],
        funds: [$funds | split(" ")[] | one(.)],
        auditor: one($auditor) }'
}

# The ids of Plimsoll and the token-standard packages it builds on, as a JSON
# array read from the model DAR's file names. The node must have each one.
pinned_packages() {
  local token="$1" ids missing
  [[ -f "$MODEL_DAR" ]] || die "no DAR at $MODEL_DAR; run: make build"
  ids="$(unzip -Z1 "$MODEL_DAR" | sed -nE 's#^(.*/)?(plimsoll|splice-.*)-[0-9.]+-([0-9a-f]{64})\.dalf$#\3#p' | jq -Rn '[inputs]')"
  missing="$(curl -sS --fail-with-body "$JSON_API/v2/packages" -H "Authorization: Bearer $token" |
    jq -r --argjson ids "$ids" '$ids - .packageIds | .[]')"
  [[ -z "$missing" ]] || die "the node lacks packages from $MODEL_DAR: $missing. Upload the DAR in the Console."
  printf '%s\n' "$ids"
}

# Runs a Daml Script from the demo DAR on DevNet, as your ledger user.
daml_script() {
  local name="$1" token_file
  shift
  token_file="$(mktemp)"
  printf %s "$(access_token)" > "$token_file"
  "$DPM" script --dar "$DEMO_DAR" --script-name "Plimsoll.Demo:$name" \
    --ledger-host "$GRPC_HOST" --ledger-port 443 --tls \
    --access-token-file "$token_file" --user-id "$(claim sub)" \
    --wall-clock-time "$@" || { rm -f "$token_file"; return 1; }
  rm -f "$token_file"
}

seed() {
  [[ ! -f "$CAST" ]] || die "already seeded ($CAST); run: make devnet-reset to start over"
  [[ -f "$DEMO_DAR" ]] || die "no DAR at $DEMO_DAR; run: make build"
  local token user input started
  token="$(access_token)"
  user="$(claim sub)"
  pinned_packages "$token" > /dev/null
  input="$(mktemp)"
  cast_from_rights "$token" "$user" > "$input"
  echo "Seeding the demo panel as ledger user $user:"
  jq -r 'to_entries[] | "  \(.key): \(.value)"' "$input"
  started="$(date +%s)"
  daml_script devnet --input-file "$input" --output-file "$CAST" || { rm -f "$input" "$CAST"; die "seed failed"; }
  rm -f "$input"
  echo "Panel formed and rounds opened. The reader's Canton Coin, from the faucet:"
  ledger_env faucet
  local wait=$(( started + CLOSE_SECONDS + 5 - $(date +%s) ))
  if (( wait > 0 )); then
    echo "Waiting ${wait}s for the past rounds to close..."
    sleep "$wait"
  fi
  echo "Publishing the past rounds:"
  ledger_env publish-closed
  echo "Seeded. Cast written to .plimsoll/devnet-cast.json."
}

# Plimsoll's templates, as `Module:Template`.
TEMPLATES="Panel:PanelProposal Panel:Panel Seat:Seat Round:Round Round:Invitation Round:Parcel Round:PartialSum
  Mark:ConsensusMark Mark:MarkCopy Membership:MembershipApplication Membership:Membership
  Access:Subscription Access:Listing Access:ReadRequest"

# Archives every active Plimsoll contract of the cast's parties, so the same
# parties can be seeded again. Possible only because this demo's one ledger
# user acts as every party. Canton Coin stays: its holdings are the DSO's to
# archive, and the next seed tops them up. The node's JSON API returns at most
# 200 contracts per read, so it reads one party and one template at a time.
reset() {
  local token user parties offset contracts count answer party template
  token="$(access_token)"
  user="$(claim sub)"
  parties="$(cast_from_rights "$token" "$user" | jq -c '[.reader, .auditor] + .nodes + .funds')"
  offset="$(curl -sS --fail-with-body "$JSON_API/v2/state/ledger-end" -H "Authorization: Bearer $token" | jq .offset)"
  contracts="$(
    for party in $(jq -r '.[]' <<< "$parties"); do
      for template in $TEMPLATES; do
        jq -n --arg party "$party" --arg template "#plimsoll:Plimsoll.$template" --argjson offset "$offset" '{
            activeAtOffset: $offset,
            eventFormat: {
              filtersByParty: {($party): {cumulative: [{identifierFilter: {TemplateFilter: {value: {templateId: $template, includeCreatedEventBlob: false}}}}]}},
              verbose: false
            }
          }' | curl -sS --fail-with-body "$JSON_API/v2/state/active-contracts" -H "Authorization: Bearer $token" \
            -H 'content-type: application/json' -d @- |
          jq -c '[.[].contractEntry.JsActiveContract.createdEvent // empty | {templateId, contractId}]'
      done
    done | jq -sc 'add | unique_by(.contractId)'
  )"
  count="$(jq length <<< "$contracts")"
  if (( count == 0 )); then
    echo "Nothing to archive."
  else
    jq -r '.[].templateId | split(":")[1:] | join(":")' <<< "$contracts" | sort | uniq -c
    read -rp "Archive these $count contracts? [y/N] " answer
    [[ "$answer" == y ]] || die "nothing archived"
    local batch=0
    while (( batch * 50 < count )); do
      jq -n --argjson contracts "$contracts" --argjson parties "$parties" --argjson batch "$batch" \
        --arg user "$user" --arg commandId "plimsoll-reset-$(date +%s)-$batch" '{
          commands: [$contracts[$batch * 50:($batch + 1) * 50][] | {ExerciseCommand: (. + {choice: "Archive", choiceArgument: {}})}],
          commandId: $commandId,
          userId: $user,
          actAs: $parties
        }' | curl -sS --fail-with-body "$JSON_API/v2/commands/submit-and-wait" -H "Authorization: Bearer $(access_token)" \
          -H 'content-type: application/json' -d @- > /dev/null
      batch=$(( batch + 1 ))
    done
    echo "Archived $count contracts."
  fi
  rm -f "$CAST"
}

# Runs a pnpm script in web/ against DevNet. The app refreshes the token itself.
ledger_env() {
  local packages
  packages="$(pinned_packages "$(access_token)" | jq -r 'join(",")')"
  cd "$ROOT/web"
  PLIMSOLL_LEDGER_URL="$JSON_API" \
  PLIMSOLL_NETWORK="Canton DevNet" \
  PLIMSOLL_PACKAGE_PREFERENCE="$packages" \
  PLIMSOLL_REGISTRY_URL="$SCAN_PROXY" \
  PLIMSOLL_LEDGER_TOKEN_FILE=../.plimsoll/devnet-tokens.json \
  PLIMSOLL_OIDC_TOKEN_URL="$OIDC_TOKEN_URL" \
  PLIMSOLL_OIDC_CLIENT_ID="$OIDC_CLIENT_ID" \
  PLIMSOLL_CAST_FILE=../.plimsoll/devnet-cast.json \
  PLIMSOLL_SMOKE_CLOSE_SECONDS=90 \
    corepack pnpm --silent "$@"
}

web_env() {
  [[ -f "$CAST" ]] || die "not seeded yet; run: make devnet-seed"
  ledger_env "$@"
}

case "${1:-}" in
  login) login ;;
  seed) seed ;;
  publish) web_env publish-closed ;;
  web) web_env dev --port "${WEB_PORT:-3000}" ;;
  smoke) web_env smoke ;;
  reset) reset ;;
  *) die "usage: scripts/devnet.sh login | seed | publish | web | smoke | reset" ;;
esac
