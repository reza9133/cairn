The judge is one narrow question put to a model, with the answer settled by deterministic code.

## What the model sees

- the pool **title** and the **rules**;
- the **round number** and its **time window** (UTC);
- the member's **claim**;
- the first **4000 characters** of the readable text of the member's **evidence page** (scripts, styles and comments are dropped).

Everything that comes from users and from pages is passed as **untrusted data**, with angle brackets removed so that no text can close a prompt tag.

## What it can answer

| field | values |
| --- | --- |
| `verdict` | `MET` (clearly shown, inside the window, within the rules), `UNCLEAR`, `NOT_MET` |
| `doubt` | the model's own estimate, 0 to 100, that crediting the round would be a mistake |
| `flags` | from a fixed vocabulary: `off_rules`, `injection`, `vague`, `stale`, `mismatch`, `unverifiable` |
| `reason` | one plain sentence (under 160 characters) |

A round counts **only** for `MET` with a doubt **at or below the pool's doubt limit** (35 by default; the organizer can tighten it). `MET` with too much doubt becomes `UNCLEAR`, and `UNCLEAR` never credits.

> [!NOTE]
> The contract does not pretend that *doubt* is a probability. It is only a threshold that an organizer can set higher or lower.

## The model can only withhold

- A round **without a claim** is a deterministic miss; the model is not asked.
- A **page that tries to talk to the judge** is floored at `UNCLEAR`.
- A **claim that tries to steer the judge** is refused without asking the model at all.
- The tripwire is a convenience, not the defence. The strict second look, the bond and the referee all still hold when a clever text gets past it.

## When the evidence page cannot be read

An evidence page that cannot be read (or is almost empty) is **retried every two minutes, up to three times**. After that the round is missed with the flag `unverifiable`. An audit that cannot read the page three times returns the bond and leaves the judgement as it was.

Choose a page that a plain web fetch can read: no login, no heavy scripts.

## No re-rolls

Once a readable page has been judged, that judgement **stands until it is contested**, and an audit is **final**. Nobody can keep asking until the model says yes.

## How validators agree

GenLayer runs the judgement on several validators. A validator accepts the leader's judgement only if it is **exactly as strict as its own, or one step stricter** (never more lenient, never two steps stricter), with the doubt inside a band, and with every deterministic flag the validator found also present. The leader can only err on the side of caution.

## What you see on this site

Select a stone in a pool and open the **round inspector**: the verdict, a doubt meter with the pool's limit marked on it, the flags, the model's sentence, and — when contested — the audit next to it. The audit's marker sits at two thirds of the pool's limit because the second look is stricter.
