Everything about money is **deterministic Python**. The model never touches an amount.

## The rules

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

## Where money comes from and goes

- **Joining** sends exactly the stake into the pool's balance. Leaving before the start takes it back.
- **Contesting** sends a bond. It sits in the pool's *bonds held* until the dispute ends, then goes back, is paid as a reward, or joins the pot.
- **Settling** pays every member from the pool's balance. The pot is the balance that is not a credited slice: missed slices, forfeited bonds and rounding dust.

## The worked example

Three members, 0.006 GEN each, two rounds. Slice 0.003. Alice 2 rounds, Bob 1, Carol 0.

- Pool balance: 0.018. Credited slices: 3 × 0.003 = 0.009. **Pot: 0.009.**
- Alice: 0.006 + 0.009 × 2/3 = **0.012**
- Bob: 0.003 + 0.009 × 1/3 = **0.006**
- Carol: **0**

## Exactness

The payouts of a settlement add up to the pool's balance **exactly**: any division remainder goes to the member with the most counted rounds. The contract refuses to settle if the arithmetic does not close (`The books of this pool do not add up.`).

## The books of the whole contract

The **Ledger** page reads `solvency()`: everything ever paid in is either paid out or held by a pool, and the bonds held by the pools add up to the bonds the contract reports. If that ever stopped being true, the page would say so in red.

## Contest economics

- **Contesting your own missed round** — you risk the bond. If the second look agrees with you, the bond returns and the round counts.
- **Contesting someone else's credit** — you risk the bond to catch a wrong credit. If the second look agrees, you get the bond back **plus a reward of 25% of a slice**, and the round stops counting for the other member.
- **Losing** — the bond joins the pot and is shared by the members who kept their promise.

A round only counts after a completed judgement, audit or referee ruling: an unjudged claim is a final miss once the review time is over and earns no slice. So a member should ask for the judgement of their own claim in time, and a member who suspects a false credit can contest it while the dispute time runs.
