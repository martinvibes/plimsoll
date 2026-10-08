# Plimsoll on the HackCanton DevNet

The HackCanton node is a participant on the Canton DevNet hosted by NODERS.
Each team creates its own parties and uploads its own DARs in the node's
Console, and reaches the Ledger API with a Keycloak token for its hackathon
account. On DevNet readers pay for marks in Canton Coin.

## 1. Parties and the DAR, in the Console

Sign in at <https://console.participant.hackcanton-01.devnet.naas.noders.services/>
with **Sign in with Authfactory**, open **Participants**, then the HackCanton
node.

1. On the **Parties** tab, create one party for each member of the demo cast:
   - nodes: `sextant`, `fathom`, `lodestar`
   - funds: `ashgrove`, `bramble`, `coldwater`, `dunmore`, `eastfield`,
     `fernhill`, `greystone` (the last one applies to join in the demo)
   - reader: `northbank`
   - auditor: `ledgerwise`

   The Console prefixes each with your namespace and gives your ledger user
   act-as rights on it.
2. Under **Collections**, upload `daml/plimsoll/.daml/dist/plimsoll-0.1.0.dar`
   (from `make build`). Canton Coin's packages are on every DevNet node
   already. The seed runs its Daml Script from your machine, so the demo
   package need not be on the node.

## 2. Sign in, seed and run

```bash
make devnet-login   # your hackathon email and password; tokens to .plimsoll/
make devnet-seed    # the demo panel on those parties; cast to .plimsoll/devnet-cast.json
make devnet-web     # the app against DevNet, at http://localhost:3000
make devnet-smoke   # optional: one more round through every app action, and a purchase in CC
make devnet-reset   # archive every Plimsoll contract, to seed the same parties again
```

`make devnet-login` reads the password from the terminal and keeps only the
Keycloak tokens, in a git-ignored file. The app and the scripts refresh the
access token on their own.

`make devnet-seed`:

1. finds the twelve parties among the ones your ledger user can act as, by
   name, and reads Canton Coin's admin (the DSO party) from the validator's
   scan proxy;
2. runs `Plimsoll.Demo:devnet` over the node's gRPC Ledger API: the three
   nodes form the panel, six funds are admitted, the reader subscribes, and
   ten rounds open (three quarters of three loans, plus a live round waiting
   on Ashgrove), each fund splitting its marks into shares; Greystone applies;
3. taps the DevNet faucet (`AmuletRules_DevNet_Tap`, as the reader) so the
   reader holds Canton Coin;
4. waits for the past rounds to close, then has the nodes report and publish
   them and list each mark to the reader, over the JSON Ledger API
   (`web/scripts/publish-closed.ts`). It skips any node that has already
   reported, so if a seed stops early, `scripts/devnet.sh publish` finishes
   the job.

## Canton Coin

Buying a mark is the same on both ledgers: `Listing_Buy` opens a CIP-56
allocation request with one fee leg per node, the reader funds each leg
through its token's allocation factory, and the panel's first node executes
all three legs and hands over the mark in one transaction
(`ReadRequest_Fulfil`). On DevNet the factory and every execute context come
from Canton Coin's own registry, served by the validator's scan proxy
(`web/src/lib/ledger/registry.ts`); on the sandbox the token is the CIP-56
reference test token, whose registry needs no context.

Canton Coin charges holding fees to the payer when it spends, so the reader's
change comes back a fraction of a coin short. Each node receives its fee
exactly.

## Pinned packages

The node is shared, and any team can upload a package with the same name as
one Plimsoll uses and a higher version. The app pins every submission to the
package ids of Plimsoll and the token-standard packages in the model DAR
(`packageIdSelectionPreference`), and `scripts/devnet.sh` stops if the node
lacks any of them.

## What differs from the sandbox

- Money is Canton Coin from the DevNet faucet, not a test token.
- Past rounds close a minute after they open, not thirty seconds.
- Every party is hosted on one participant and driven by one ledger user, as
  in the sandbox demo. In production each node and each fund runs its own
  participant.

- The node's JSON Ledger API returns at most 200 contracts per read. When a
  party's view is larger, the app reads one template at a time at the same
  offset (`web/src/lib/ledger/client.ts`), and `make devnet-reset` reads one
  party and one template at a time.

When the node rejects a request it returns a trace id (TID). Look it up in
the node's Grafana, or send it to NODERS.

## Run on 8 October 2026, in Canton Coin

`make devnet-seed` formed the panel, admitted six funds, published nine
quarter-end marks for three loans and opened the live Tidewell round on the
HackCanton node, with the reader's Canton Coin tapped from the DevNet faucet.
`make devnet-smoke` then passed all 22 checks there: a new round opened, five
funds contributed, every privacy check held, all three nodes reported, the
mark was published, and the reader bought it in Canton Coin.

The purchase is one transaction on the Canton DevNet global synchronizer
(`global-domain::1220be58c29e65de40bf273be1dc2b266d43a9a002ea5b18955aeef7aac881bb471a`),
update id `12200cbb68478d6df02f74153056fecda437d3414cd5825142a143220e1a69775fee`.
It exercises `ReadRequest_Fulfil`, which runs Canton Coin's own
`Allocation_ExecuteTransfer` three times, one fee leg of 25 CC to each node,
unlocks the reader's locked coin (`LockedAmulet_UnlockV2`), creates the
nodes' new `Amulet` holdings and the reader's `MarkCopy`. Update ids are
visible only to the parties in each transaction, so this one can be looked up
on the node by the reader or the nodes.

The smoke test's round, for "Smoke Test Co", stays on the ledger with the demo.
