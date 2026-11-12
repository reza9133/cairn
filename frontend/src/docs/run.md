The repository contains the contract, a local test suite that needs no network, a rehearsal of the live script, and the script that runs the whole contract against the real Studionet.

## Quick start

```bash
bash scripts/setup.sh                 # python and node packages (pytest, genlayer-test, genvm-linter, genlayer-js)
npm run keys                          # creates four test accounts in .env and asks Studionet to fund them
bash scripts/run-all.sh               # static check, local tests, then the live run on Studionet
```

`run-all.sh` options: `SKIP_LOCAL=1` runs only the live part, `SKIP_LIVE=1` only the local checks, and extra arguments go to the live script (`bash scripts/run-all.sh --only basics,nostart`).

## Tests (no network)

```bash
genvm-lint check contracts/cairn.py
python3 -m pytest -q
```

In the last full run all 350 tests passed: 331 unit, adversarial and consensus tests, 3 rehearsal runs and 16 random-game tests. Without the random games the suite takes under a minute.

The suite runs the contract in the GenVM direct runner with the web and the model mocked. It covers input checks, the whole lifecycle, every refusal (each refused call is also shown to change nothing), payouts against an independent model, the validators' acceptance rule case by case, hostile text and pages, the order of effects, and random games that must keep the books balanced.

> [!NOTE]
> The direct runner needs a GenVM runtime. On a machine where it cannot download one, copy the tarball that `genvm-lint` fetched (`~/.cache/genvm-linter/genvm-universal-*.tar.xz`) into `~/.cache/gltest-direct/`.

## The rehearsal

`tests/direct/test_rehearsal.py` runs `scripts/e2e.mjs` in Node with a virtual clock and a stand-in for `genlayer-js` (`rehearsal/`). Every call of the live script is answered by the real contract code, with the web and the model mocked in three different ways so that every branch of the arena is walked. It proves that the live script takes the right steps in the right order. It cannot prove how the real model behaves.

## The live run on Studionet

`scripts/e2e.mjs` deploys `contracts/cairn.py` (unless `CAIRN_ADDRESS` is set) and runs three scenarios with real transactions and the real AI. Expect about 40 minutes of chain time.

| scenario | time | what it does |
| --- | --- | --- |
| `basics` | about 4 min | refused pool creations, terms, joining, leaving, a duplicate member, calling a pool off before it starts |
| `nostart` | about 4 min | a pool that gets too few members is called off by a stranger after its start time |
| `arena` | about 30 min | three members and a referee play a full pool |

Reports are written to `reports/cairn-e2e-<time>.{json,md,html}` after every transaction.

## Deploying your own copy

```bash
node scripts/deploy.mjs      # deploys contracts/cairn.py and writes .cairn-address
```

Then build this website against your address:

```bash
cd frontend
VITE_CAIRN_ADDRESS=0xYourAddress npm run build
```

## Repository layout

```
contracts/cairn.py            the Intelligent Contract
tests/direct/                 the local suite (pytest, no network)
scripts/e2e.mjs               the live Studionet run, with its report writer
scripts/deploy.mjs            deploys the contract and writes .cairn-address
scripts/keys.mjs              creates and funds test accounts
scripts/receipt.mjs           reads the outcome of a decided transaction
scripts/setup.sh, run-all.sh  installation and the one-command run
rehearsal/                    the offline stand-in used by the rehearsal test
frontend/                     this website
```
