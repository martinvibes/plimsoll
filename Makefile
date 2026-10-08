DPM ?= dpm
LEDGER_PORT ?= 6865
JSON_PORT ?= 7575
WEB_PORT ?= 3000
DEMO_DAR := daml/plimsoll-demo/.daml/dist/plimsoll-demo-0.1.0.dar
CAST := .plimsoll/cast.json
SCRIPT := $(DPM) script --dar $(DEMO_DAR) --ledger-host localhost --ledger-port $(LEDGER_PORT) --wall-clock-time

.PHONY: build test sandbox seed web smoke devnet-login devnet-seed devnet-web devnet-smoke devnet-reset

# Build the Plimsoll model, its tests and the demo package.
build:
	cd daml && $(DPM) build --all

# Run every Daml Script test (needs a Java 17+ runtime on PATH).
test: build
	cd daml/plimsoll-tests && $(DPM) test

# A local Canton sandbox with Plimsoll loaded and the JSON Ledger API on $(JSON_PORT).
sandbox: build
	$(DPM) sandbox --ledger-api-port $(LEDGER_PORT) --json-api-port $(JSON_PORT) --dar $(DEMO_DAR)

# Seed the running sandbox: parties, a panel, six funds, three past rounds that
# close after 30 seconds and are then published, and one live round. Party ids
# are tagged per run, so it can be run again to start over.
seed:
	@mkdir -p $(dir $(CAST))
	$(SCRIPT) --script-name Plimsoll.Demo:open --output-file $(CAST)
	@echo "Waiting for the past rounds to close..."
	@sleep 35
	$(SCRIPT) --script-name Plimsoll.Demo:publishClosed --input-file $(CAST)

# The app, reading the cast written by `make seed`.
web:
	cd web && corepack pnpm install --frozen-lockfile && corepack pnpm dev --port $(WEB_PORT)

# Open a short round on the seeded sandbox and drive it through every write the
# app offers: five funds contribute, three nodes report, one publishes, the
# reader buys. Checks the mark, the fees and who saw what.
smoke:
	cd web && corepack pnpm --silent smoke

# HackCanton DevNet. Create the parties and upload the model DAR in the node's
# Console first (docs/devnet.md), then sign in, seed and run the app.
devnet-login:
	scripts/devnet.sh login

devnet-seed: build
	scripts/devnet.sh seed

devnet-web:
	WEB_PORT=$(WEB_PORT) scripts/devnet.sh web

devnet-smoke:
	scripts/devnet.sh smoke

# Archive every Plimsoll contract, so the same parties can be seeded again.
devnet-reset:
	scripts/devnet.sh reset
