Cairn is **testnet software**: no governance, no upgrade path and no audit beyond the tests in the repository. Read this page before you stake anything — even test tokens — on a result you care about.

## What the design protects against

- **A model that is too generous.** It can only withhold: doubt above the limit becomes `UNCLEAR`, and `UNCLEAR` never credits.
- **A model that is manipulated by text.** A claim that tries to steer the judge is refused without calling the model; a page that tries it is floored at `UNCLEAR`. Everything from users and pages is passed as untrusted data with angle brackets removed.
- **A stuck pool.** Unjudged claims lapse as misses after the review time, unaudited contests lapse, unreadable pages are retried and then count against the claimant, and a pool with too few members can be called off by anyone.
- **A wrong money split.** Payouts are deterministic and add up to the balance exactly; the contract refuses to settle otherwise, and `solvency()` can be checked at any time.
- **A bad bet.** Every contest needs a bond; a wrong contest loses it.

## Trade-offs worth knowing

- **Evidence is whatever the member's page shows when the judge looks.** A member who controls the page controls the evidence. Rival members and the stricter second look are the answer, and a referee for groups that want a human in the loop.
- **A page that cannot be read counts against the claimant.** Choose an evidence page that a plain web fetch can read.
- **Doubt is the model's own estimate.** It is only a threshold the organizer can tighten.
- **A claim nobody judges is a final miss after its review time.** The timeout never credits: a round counts only after a completed judgement, audit or referee ruling. If you file a claim, ask for the judgement yourself before the review time ends.
- **The organizer sets the terms.** Read the rules, the doubt limit and the times before you join. Terms cannot change after the start.

## About this website

- The site has **no server and no database**. It reads the contract through the public Studionet RPC and sends transactions from your wallet.
- It **never asks for a seed phrase or a private key** and never holds your funds. You sign every transaction in your own wallet.
- Evidence links on a pool page open in a new tab with `noopener noreferrer nofollow`. They are written by members: open them with the same care as any link.
- The amount to send for joining and for a contest comes from the contract's own numbers; check it in the wallet's approval screen before you sign.
- The site stores in your browser only: the theme, the last wallet you used (to reconnect), and the last transactions (hashes and labels).

## Reporting a problem

Open an issue on [GitHub](https://github.com/reza9133/cairn/issues). For anything that looks like a vulnerability, please describe it privately to the maintainer on X ([@amirhp771](https://x.com/amirhp771)) before posting details.
