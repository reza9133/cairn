## Phases of a pool

```
joining ──start time──▶ running ──last round closes──▶ finishing ──everything final──▶ settled
   │                       │
   └─ cancelled            └─ (too few members at the start) ──▶ failed ──▶ cancelled by anyone
```

| phase | what it means | who can do what |
| --- | --- | --- |
| **joining** | before the start time | members join or leave; the organizer tunes terms or calls the pool off |
| **failed** | the start time passed but fewer than the minimum members joined | anyone can call the pool off; every stake goes back |
| **running** | rounds are being played | members claim; anyone asks the judge; members contest |
| **finishing** | the last round closed | judgements and disputes are being finalised; anyone settles when all is final |
| **settled** | stakes were shared out | nothing more happens |
| **cancelled** | the pool never ran | stakes were returned |

The phase is computed by the contract from the chain clock, so it is always current when you read it.

## The moments of a round

For round `r` (starting at 0), with the pool starting at `start`, a round length `len` and a grace time `grace`:

| moment | what it is |
| --- | --- |
| `start + r*len` | the round **opens**: claims for it are accepted |
| `start + (r+1)*len` | the round **closes**: the judge can be asked about its claims |
| `start + (r+1)*len + grace` | the **last moment to claim** (a round without a claim is a final miss) |
| `max(close, claim time) + review_span` | **`judge_by`**: a claim nobody judged counts as credited from here on |
| judgement time + `dispute_span` | the judgement becomes **final**, unless it was contested |
| contest time + 1 day | a contest nobody audited **lapses**; the bond goes back and the judgement stands |

A round is **final** when no contest, audit or ruling can change it any more. The pool can be settled when every round of every member is final and the last round has closed.

> [!TIP]
> The [schedule calculator](/docs/calculator) turns your round length, grace, review and dispute times into a table of every moment.

## Claiming during the grace time

A round stays claimable until the end of its grace time (10 minutes by default), even though the next round may already be open. That is why a member can sometimes claim two rounds at the same moment; the claim form lists exactly the rounds that are still open to you.

## Marks

In the member table every stone is a character of the member's `marks` string:

| mark | meaning |
| --- | --- |
| `.` | no claim yet and the round can still be claimed (or has not opened) |
| `_` | no claim and the claim time is over: a final miss |
| `c` | claimed, waiting for the judge |
| `p` / `m` | judged credited / missed, still open to contest |
| `P` / `M` | credited / missed and final |
