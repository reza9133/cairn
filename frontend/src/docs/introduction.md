Cairn is a **GenLayer Intelligent Contract** where a group of people stake money on keeping a promise, round after round. Every round has to be backed by a **public page**. An **AI judge** reads the claim and the page and decides whether the round counts. Rounds that were kept give the member's money back; rounds that were missed put money into a **pot** that the people who kept going share.

> [!NOTE]
> A cairn is a stack of stones that marks a trail. Each stone is a step somebody really took. In Cairn, each stone is one round with a claim and a page behind it — you will see them everywhere on this site.

## The idea in one minute

1. An **organizer** opens a pool: a title, the **rules in plain words** (what a member promises to do in every round and what counts as proof), the **stake**, the number of **rounds**, the length of a round, when the pool starts and how many members it needs (2 to 12). An optional **referee** can be named.
2. Every member **joins before the start** by sending exactly the stake and naming **one public evidence page** (a log, a profile, a blog, a repository page). No two members of a pool can use the same page.
3. The stake is split into one **slice per round**. In every round a member files a short **claim** — "what I did".
4. After the round closes, **anyone** can ask the **AI judge** about a claim. The judge reads the rules, the claim and the member's evidence page and answers `MET`, `UNCLEAR` or `NOT_MET`, with a *doubt* from 0 to 100. A round counts only for `MET` with a doubt at or below the pool's limit.
5. Every judgement is **provisional**. For a while it can be **contested** by posting a bond: the member can contest their own missed round, any other member can contest a round somebody else was credited for. A second, **stricter** AI look settles it.
6. When all rounds are final, **anyone settles** the pool. A member gets back the slices of the rounds that counted, plus a share of the **pot** in proportion to the rounds that counted.

## A worked example

Three members stake **0.006 GEN** each over **two rounds** (a slice is 0.003). Alice keeps both rounds, Bob keeps one, Carol none.

The pool holds 0.018 GEN and the credited slices are 3 × 0.003 = 0.009, so the pot is 0.009.

| member | rounds counted | payout |
| --- | --- | --- |
| Alice | 2 | 0.006 + 0.009 × 2/3 = **0.012** |
| Bob | 1 | 0.003 + 0.009 × 1/3 = **0.006** |
| Carol | 0 | **0** |

Try your own numbers in the [calculators](/docs/calculator).

## Why the AI is a brake and not a judge with a wallet

- **No claim, no credit.** A round without a claim is a deterministic miss. The model is never asked about it.
- **The model can only withhold.** Its answer is settled against the pool's doubt limit: `MET` with too much doubt becomes `UNCLEAR`, and `UNCLEAR` never credits. A page that tries to talk to the judge is floored at `UNCLEAR`; a *claim* that tries to steer the judge is refused without asking the model at all.
- **Everything the AI says can be contested** by someone with money on the line, and the second look is stricter: it credits only up to two thirds of the pool's doubt limit, and it reads the contester's reason as a lead, never as a fact.
- **Humans are never locked out and never locked in.** The optional referee can overrule any claim that is not final. Nobody has to be present for the pool to finish.
- **Validators lean the same way.** A validator accepts the leader's judgement only if it is exactly as strict as its own, or one step stricter — never more lenient — with the doubt inside a band, and with every deterministic flag the validator found also present.

## Where to go next

- New here? Follow the [Quickstart](/docs/quickstart).
- Want to know exactly when things happen? See [Lifecycle & timing](/docs/lifecycle).
- Building on the contract? Read the [Contract reference](/docs/reference).
