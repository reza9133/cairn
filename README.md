# Cairn

**Commitment pools judged by an AI that can only be as generous as the pool allows.**

A cairn is a stack of stones that marks a trail: each stone is one step that somebody really took. Cairn is a GenLayer Intelligent
Contract where a group of people stake money on keeping a promise, round after round, and every round has to be backed by a public
page. An AI judge reads the claim and the page and decides whether the round counts. Rounds that were kept give the member's
money back; rounds that were missed put money into a pot that the people who kept their promise share.

The contract is written for GenLayer **Studionet**. Everything about money is deterministic Python; the model is asked one narrow
question and its answer can only make a round *harder* to credit, never easier.

> Status of this repository: the contract passes the static check and the local test suite (see *Tests*), and the live script has
> been rehearsed offline against the real contract code. The live Studionet run (`bash scripts/run-all.sh`) is the step that has to
> be done on your side; its report is the evidence that the real model and the real validators behave as the tests assume.

---

## The idea in one minute

1. An **organizer** opens a pool: a title, the **rules in plain words** (what a member promises to do in every round and what counts
   as proof), the **stake**, the number of **rounds**, the length of a round, when the pool starts, and how many members it needs
   (2 to 12). An optional **referee** can be named.
2. Every member **joins before the start** by sending exactly the stake and naming **one public evidence page** (a log, a profile, a
   blog, a repository page). No two members of a pool can use the same page.
3. The stake is split into one **slice per round**. In every round a member files a short **claim** ("what I did").
4. After the round closes, **anyone** can ask the **AI judge** about a claim. The judge reads the rules, the claim and the member's
   evidence page and answers `MET`, `UNCLEAR` or `NOT_MET` with a *doubt* from 0 to 100. A round counts only for `MET` with a doubt
   at or below the pool's limit.
5. Every judgement is **provisional**. For a while it can be **contested** by posting a bond: the member can contest their own
   missed round, any other member can contest a round somebody else was credited for. A second, **stricter** AI look settles it.
6. When all rounds are final, **anyone settles** the pool. A member gets back the slices of the rounds that counted, plus a share of
   the **pot** (the missed slices, forfeited bonds and rounding dust) in proportion to the rounds that counted.

Example: three members stake 0.006 GEN each over two rounds (a slice is 0.003). Alice keeps both rounds, Bob keeps one, Carol none.
The pool holds 0.018, the credited slices are 3 x 0.003 = 0.009, so the pot is 0.009. Alice gets 0.006 + 0.009 x 2/3 = 0.012,
Bob gets 0.003 + 0.009 x 1/3 = 0.006, Carol gets nothing.

---

## Why the AI is a brake and not a judge with a wallet

* **No claim, no credit.** A round without a claim is a deterministic miss. The model is never asked about it.
* **The model can only withhold.** Its answer is settled against the pool's doubt limit: `MET` with too much doubt becomes `UNCLEAR`,
  and `UNCLEAR` never credits. A page that tries to talk to the judge is floored at `UNCLEAR`; a *claim* that tries to steer the
  judge is refused without asking the model at all. (The tripwire is a convenience, not the defence: the strict second look, the
  bond and the referee still hold when a clever text gets past it.)
* **Everything the AI says can be contested** by someone with money on the line, and the second look is stricter: it credits only up
  to two thirds of the pool's doubt limit, and it reads the contester's reason as a lead, never as a fact.
* **Humans are never locked out and never locked in.** The optional referee can overrule any claim that is not final. Nobody has to
  be present for the pool to finish: a claim nobody judged lapses as a final miss once its review time is over (it is never credited
  without a completed judgement), a contest nobody audits lapses and
  returns its bond, an unreadable page is retried and then counts against the claimant, and a pool that did not get enough members
  can be called off by anyone.
* **Validators lean the same way.** A validator accepts the leader's judgement only if it is exactly as strict as its own, or one
  step stricter (never more lenient, never two steps stricter), with the doubt inside a band, and with every deterministic flag the
  validator found (for example a steering page) also present.

---

## Lifecycle

```
joining ──start time──▶ running ──last round closes──▶ finishing ──everything final──▶ settled
   │                       │
   └─ cancelled            └─ (too few members at the start) ──▶ failed ──▶ cancelled by anyone
```

For round `r` (starting at 0), with the pool starting at `start`, a round length `len` and a grace time `grace`:

| moment | what it is |
| --- | --- |
| `start + r*len` | the round opens: claims for it are accepted |
| `start + (r+1)*len` | the round closes: the judge can be asked about its claims |
| `start + (r+1)*len + grace` | the last moment to claim (a round without a claim is a final miss) |
| `max(close, claim time) + review_span` | `judge_by`: a claim nobody judged is a final miss from here on (it never counts without a completed judgement) |
| judgement time + `dispute_span` | the judgement becomes final, unless it was contested |
| contest time + 1 day | a contest nobody audited lapses; the bond goes back and the judgement stands |

A round is **final** when no contest, audit or ruling can change it any more. The pool can be settled when every round of every
member is final and the last round has closed.

---

## Money rules

| rule | value |
| --- | --- |
| slice | `stake // rounds`; at least 0.001 GEN |
| contest bond | 20% of a slice, at least 0.001 GEN (reported as `bond_due`) |
| reward for an upheld contest of someone else's round | 25% of a slice, paid with the bond back |
| a lost contest | the bond stays in the pot |
| a won contest of your own missed round | the bond goes back, and the round counts |
| payout of a member | `credited * slice + pot * credited / total credited` |
| rounding remainder | to the member with the most credited rounds (the earliest to join on a tie) |
| nobody credited | the whole balance is shared equally |

The books are checked by `solvency()`: everything ever paid in is either paid out or held by a pool, and the bonds held by the pools
add up to the bonds the contract reports. The payouts of a settlement add up to the pool's balance exactly (the contract refuses to
settle otherwise).

---

## The judge

* The model gets the pool title, the rules, the round number and its time window (UTC), the member's claim and the first 4000
  characters of the readable text of the evidence page (scripts, styles and comments are dropped). Everything from users and from
  pages is passed as untrusted data, with angle brackets removed so that no text can close a prompt tag.
* Verdicts: `MET` (clearly shown, inside the window, within the rules), `UNCLEAR`, `NOT_MET`. `doubt` is the model's estimate, 0 to
  100, that crediting the round would be a mistake. `flags` come from a fixed vocabulary:
  `off_rules, injection, vague, stale, mismatch, unverifiable`.
* An evidence page that cannot be read (or is almost empty) is retried every two minutes, up to three times, and then the round is
  missed with the flag `unverifiable`. An audit that cannot read the page three times returns the bond and leaves the judgement.
* The judge never re-rolls: once a readable page has been judged, that judgement stands until it is contested, and an audit is final.

---

## Reference

### Write methods

| method | who | what |
| --- | --- | --- |
| `create_pool(title, rules, stake, rounds, round_len, starts_in, min_entrants, max_entrants, referee)` | anyone | opens a pool; `referee` is an address or an empty string |
| `set_terms(pool_id, grace, review_span, dispute_span, doubt_limit)` | organizer, before the start | tunes the time limits and the judge's strictness |
| `cancel_pool(pool_id)` | organizer before the start; anyone after the start if too few members joined | sends every stake back |
| `join(pool_id, evidence_url)` payable | anyone but the referee, before the start | exact stake; one evidence page per member |
| `leave(pool_id)` | member, before the start | takes the stake back; cannot join this pool again |
| `claim(pool_id, round_no, note)` | member | files the claim for an open round |
| `judge(pool_id, who, round_no)` | anyone, after the round closed | asks the AI judge about one claim |
| `contest(pool_id, who, round_no, reason)` payable | member (see above) | posts the bond and asks for the second look |
| `audit(pool_id, who, round_no)` | anyone | runs the stricter second look on a contested judgement |
| `lapse_contest(pool_id, who, round_no)` | anyone, a day after a contest | returns the bond of an unaudited contest |
| `overrule(pool_id, who, round_no, credit, note)` | referee | settles a filed claim by hand while it is not final |
| `settle(pool_id)` | anyone | shares the pool out once every round is final |

`who` is the member's address. `starts_in`, `round_len`, `grace`, `review_span` and `dispute_span` are in seconds.

### Views

`stats()`, `solvency()`, `get_pool(id)`, `list_pools(offset, limit)`, `pools_of(address, offset, limit)`,
`get_round(pool_id, who, round_no)` and `standing(pool_id)` (credited and pending rounds of every member, and what each would
receive if the pool were settled now). All of them return JSON text.

In `get_pool`, every member has `marks`, one character per round:

| mark | meaning |
| --- | --- |
| `.` | no claim yet and the round can still be claimed (or has not opened) |
| `_` | no claim and the claim time is over: a final miss |
| `c` | claimed, waiting for the judge |
| `p` / `m` | judged credited / missed, still open to contest |
| `P` / `M` | credited / missed and final |

### Numbers in the JSON

* pool `state`: 0 open, 1 cancelled, 2 settled. `phase`: `joining`, `failed`, `running`, `finishing`, `settled`, `cancelled`.
* round `decided_by`: 0 nobody, 1 the AI, 2 default (unreadable evidence), 3 audit, 4 referee. Round `state`: `OPEN`, `CLAIMED`,
  `PASSED`, `MISSED`.
* `bond_state`: 0 none, 1 held, 2 refunded, 3 forfeited, 4 rewarded.

### Limits

| | |
| --- | --- |
| title / rules / claim / contest reason | 3-60 / 20-1200 / 12-300 / 12-300 characters |
| rounds | 2 to 14 |
| members | 2 to 12 at once; at most 24 entries ever recorded in a pool (members who left still count) |
| round length, start delay | 1 minute to 30 days |
| grace | 0 to 7 days (default 10 minutes) |
| review time | 10 minutes to 30 days (default 3 days) |
| dispute time | 2 minutes to 7 days (default 1 hour) |
| doubt limit | 0 to 100 (default 35); the audit uses two thirds of it |

---

## Trade-offs worth knowing

* **Evidence is whatever the member's page shows when the judge looks.** A member who controls the page controls the evidence.
  Rival members and the stricter second look are the answer, and a referee for groups that want a human in the loop.
* **A page that cannot be read counts against the claimant.** Choose an evidence page that a plain web fetch can read (no login, no
  heavy scripts).
* **Doubt is the model's own estimate.** The contract does not pretend it is a probability; it only uses it as a threshold the
  organizer can tighten.
* **A claim nobody judges is a final miss after its review time.** The timeout never credits anything: a round counts only when a
  completed judgement, audit or referee ruling says so. A pool still cannot hang, because the timeout resolves the claim, and the
  claimant is the one who has to make sure the judge runs (anyone may ask it, so the claimant simply does) before `judge_by`.
* **This is testnet software.** There is no governance, no upgrade path, and no audit beyond the tests in this repository.

---

## Running it

```bash
bash scripts/setup.sh                 # python and node packages (pytest, genlayer-test, genvm-linter, genlayer-js)
npm run keys                          # creates four test accounts in .env and asks Studionet to fund them
bash scripts/run-all.sh               # static check, local tests, then the live run on Studionet
```

`run-all.sh` options: `SKIP_LOCAL=1` runs only the live part, `SKIP_LIVE=1` only the local checks, and extra arguments go to the live
script (`bash scripts/run-all.sh --only basics,nostart`).

### Tests (no network)

```bash
genvm-lint check contracts/cairn.py
python3 -m pytest -q
```

In the last full run all 354 tests passed: 335 unit, adversarial and consensus tests, 3 rehearsal runs, and 16 random-game tests.
Without the random games the suite takes under a minute; the random games take about three minutes on a single slow CPU.

The suite runs the contract in the GenVM direct runner with the web and the model mocked. It covers input checks, the whole
lifecycle, every refusal (each refused call is also shown to change nothing), payouts against an independent model, the validators'
acceptance rule case by case, hostile text and pages, the order of effects, random games that must keep the books balanced, and a
**rehearsal** of the live script (below).

The direct runner needs a GenVM runtime. On a machine where it cannot download one, copy the tarball that `genvm-lint` fetched
(`~/.cache/genvm-linter/genvm-universal-*.tar.xz`) into `~/.cache/gltest-direct/`.

### The rehearsal (no network)

`tests/direct/test_rehearsal.py` runs `scripts/e2e.mjs` in Node with a virtual clock and a stand-in for `genlayer-js`
(`rehearsal/`). Every call of the live script is answered by the real contract code, with the web and the model mocked in three
different ways so that every branch of the arena is walked (a dismissed contest, an upheld contest with the reward, a member
winning a contest of their own round). It proves that the live script takes the right steps in the right order and that its checks
agree with the contract. It cannot prove how the real model behaves. It also walks the review timeout (the `unattended` scenario
below) and checks that a claim nobody judged ends as a miss with a zero payout.

### The live run on Studionet

`scripts/e2e.mjs` deploys `contracts/cairn.py` (unless `CAIRN_ADDRESS` is set) and runs four scenarios with real transactions and the
real AI. Expect about 60 minutes of chain time in total (`--only` runs a subset).

| scenario | time | what it does |
| --- | --- | --- |
| `basics` | about 4 min | refused pool creations, terms, joining, leaving, a duplicate member, calling a pool off before it starts |
| `nostart` | about 4 min | a pool that gets too few members is called off by a stranger after its start time |
| `unattended` | about 20 min | a claim nobody sends to the judge is a final miss after its review time, nothing brings it back, and at the settlement it receives no credited slice (below) |
| `arena` | about 30 min | three members and a referee play a full pool (below) |

The unattended claim: a two-member pool with the shortest times the contract allows (review time 10 minutes). Alice and Bob each file
a claim in round 1; only Bob's is sent to the real judge. While the review time runs Alice's claim is `CLAIMED`, provisional, with no
credit. When it is over the claim is a final `MISSED` with no decision on record, the judge, a contest and an audit are all refused,
and at the settlement Alice is credited no round. The check that Alice is paid exactly nothing (Bob takes the credited slice and the
whole pot) runs whenever the real judge credited Bob; if it did not, nobody holds a credit, the pool is shared equally, and the run
notes that instead. The payouts are checked against the independent model in both cases.

The arena: two rounds on the subject of the Moon. Alice's evidence page is the Moon article, Bob's is the Mars article, and
Carol's is the Earth article. Round 1: all three claim; Carol's claim tries to steer the judge. The real judge is asked about each;
then a contest of Alice's round by a rival (or by Alice herself if the judge refused her) is audited by the real auditor; Carol
contests her own steering claim and loses her bond (that answer is fixed, the model is never asked); round 2: Bob and Carol claim,
Alice does not; the referee overrules Bob's second round; after every dispute time the pool is settled by a stranger.

The model's answers are not fixed, so the arena accepts any of them and checks what must hold for all: a round counts exactly when the
judge said `MET` with enough confidence, an audit's outcome follows the auditor's answer (including who gets the bond), refused
calls change no totals, the standing view projects what an independent payout model computes, every member is paid exactly that,
and the contract's books balance at the end.

Accounts are read from the environment or from `.env`; `.env.example` lists them and the amounts they need. The referee and the
outsider are random accounts when not given (the outsider only sends unpaid calls, the referee is funded through the simulator).

Reports are written to `reports/cairn-e2e-<time>.{json,md,html}` after every transaction; the HTML page refreshes itself during the
run. The exit code is 1 when any check failed.

---

## Website

`frontend/` is the web app for this contract (Vite + React + three.js + genlayer-js): pools, create, claims, judging, ledger and full documentation, with EIP-6963 wallet connect and a Studionet network switch. See [frontend/README.md](frontend/README.md).

```bash
cd frontend && npm install && npm run dev
```

## Layout

```
contracts/cairn.py            the Intelligent Contract
tests/direct/                 the local suite (pytest, no network)
scripts/e2e.mjs               the live Studionet run, with its report writer
scripts/deploy.mjs            deploys the contract and writes .cairn-address
scripts/keys.mjs              creates and funds test accounts
scripts/receipt.mjs           reads the outcome of a decided transaction
scripts/setup.sh, run-all.sh  installation and the one-command run
rehearsal/                    the offline stand-in used by the rehearsal test
.devcontainer/                a ready-to-use Codespace
```
