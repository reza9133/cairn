## Do I need my own wallet and tokens?

Yes. Every action is a transaction you sign. Cairn runs on GenLayer Studionet, a test network, so you need Studionet GEN (it has no real value).

## Who runs the AI judge?

Nobody in particular. Anyone can ask for a judgement; GenLayer validators then fetch the evidence page, ask a model and agree on the answer. The result is written to the contract.

## Why does judging take minutes?

A judgement involves a web fetch and a model call on several validators, then consensus. The transaction dialog shows the steps; you can hide it and keep working.

## What if my evidence page is down or unreadable?

The judge retries every two minutes, up to three times, then the round counts as missed (`unverifiable`). Pick a page that a plain web fetch can read.

## Can the organizer take the money?

No. The organizer sets terms before the start, but money only leaves a pool through `settle`, `cancel_pool` (stakes return to their owners) or `leave`. Payouts are computed by the contract.

## What happens if nobody judges my claim?

After the pool's *review time* (three days by default) an unjudged claim is a final miss: it is never credited by default, and it earns no slice of the stake. Anyone can ask the judge, so ask for the judgement of your own claim once the round has closed. Rivals can contest a credit that is wrong, so a false claim is not free.

## Can I leave after the pool started?

No. You can leave only before the start; a member who leaves cannot join that pool again.

## What if too few people join?

When the start time passes with fewer than the minimum members, the pool is in the *Not enough members* phase and anyone can call it off. Every stake goes back.

## Is the referee required?

No. A referee is an optional human who can overrule any claim that is not final. They cannot join the pool.

## Is it safe?

It is testnet software without an audit. See [Trade-offs & security](/docs/security).

## Where is the source?

On [GitHub](https://github.com/reza9133/cairn). The author is on X: [@amirhp771](https://x.com/amirhp771).
