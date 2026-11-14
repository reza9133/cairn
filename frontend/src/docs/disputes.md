Every judgement of the AI is **provisional**. This page explains how it can be challenged and how a pool is kept from getting stuck.

## Contest

- **Who:** a member can contest their **own missed round**; any member can contest a round that **another member was credited for**. Only a judgement made by the AI can be contested.
- **When:** while the judgement is inside the pool's **dispute time** (one hour by default).
- **How:** post a **bond** (20% of a slice, at least 0.001 GEN — shown on the pool as *Contest bond*) with a reason of 12 to 300 characters.
- A judgement can be contested **once**.

## Audit

Anyone can run the **audit** on a contested judgement. It is a second, **stricter** look:

- it credits a round only up to **two thirds** of the pool's doubt limit;
- it reads the contester's reason as a **lead to check**, never as a fact;
- its answer is **final**.

What happens to the bond:

| outcome | bond |
| --- | --- |
| contested **your own missed round**, audit credits it | bond returns, round counts |
| contested **someone else's credit**, audit withholds it | bond returns **plus a reward** (25% of a slice); the round stops counting for the other member |
| the audit agrees with the first judgement | bond is **forfeited** into the pot |

## Lapse

If nobody runs the audit within **a day** of the contest, anyone can use **Return the bond**: the bond goes back to its owner and the first judgement stands. This keeps a pool from waiting for a contest nobody cares about.

## Referee

A pool may name a **referee** when it is created. The referee can **overrule** any filed claim that is not final: credit it or not, with a note that stays on the round. A contest waiting for its audit is closed and its bond goes back. A round **without a claim** cannot be credited by a referee. The referee cannot join the pool.

## Nobody is locked in, nobody is locked out

| situation | what the contract does |
| --- | --- |
| nobody asks the judge | after the **review time**, the claim is a **final miss**; it is never credited by default |
| a contest nobody audits | it **lapses** after a day and the bond returns |
| the evidence page cannot be read | retried, then the round is missed (`unverifiable`) |
| too few members at the start | **anyone** can call the pool off; stakes go back |
| a pool is fully final | **anyone** settles it |

A claim that nobody judges resolves as a miss — a pool must not hang, and the timeout must never pay anyone. Anyone may ask the judge, so after you file a claim, ask for the judgement yourself before the review time ends. Rivals are paid for contesting a credit that turns out to be wrong.
