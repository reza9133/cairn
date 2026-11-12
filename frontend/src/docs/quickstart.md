This page walks through a complete pool using only this website. You need a browser wallet and some GEN on **GenLayer Studionet** (the test network the contract is deployed on).

> [!NOTE]
> Studionet is a testnet. Its tokens have no real value and it can be reset. Use it to try things out.

## 1. Connect your wallet

Press **Connect wallet** in the top bar. The dialog lists every wallet your browser announces (EIP-6963), so you choose the exact one you want. After you approve, the site checks the network: if your wallet is on another chain, a dialog offers **Switch to GenLayer Studionet** and adds the network for you when it is missing. See [Wallet & network](/docs/wallet).

## 2. Create a pool

Open **Create**. Fill in:

- **Title** and **Rules** — say what a member does in every round and what counts as proof. The AI reads these words, so be concrete ("a run of at least 3 km, logged with the date on the member's page").
- **Stake**, **rounds** and **round length** — the stake is split into one slice per round, and every slice must be worth at least 0.001 GEN.
- **Starts in** — give people time to join (an hour or more is sensible).
- **Minimum / maximum members** and an optional **referee**.

The stones on the right grow with the number of rounds. Press **Create the pool** and approve the transaction. When validators accept it, you are taken to the new pool.

> [!TIP]
> Creating a pool costs only gas. As the organizer you join like everybody else, by sending the stake.

## 3. Join

Each member opens the pool, presses **Join**, pastes **one public evidence page** and sends exactly the stake. The page is checked in the form before anything is sent. Joining closes when the pool starts. If fewer than the minimum number of members joined, anyone can call the pool off and every stake goes back.

## 4. Claim, round by round

When a round opens, members file a **claim**: a sentence or two on what they did. You can do it from the **Actions** panel or by selecting your stone in the member table. A claim needs 12 to 300 characters.

## 5. Ask the judge

After a round closes, **anyone** can select a member's stone and press **Ask the AI judge**. Validators fetch the page, ask a model and agree on the answer. This commonly takes one to a few minutes; the transaction dialog shows the progress and you can hide it while you keep working.

## 6. Contest if it looks wrong

Within the pool's dispute time (one hour by default), a judgement can be contested by posting a bond. A stricter second look — the **audit** — decides. See [Contests, audits & referee](/docs/disputes).

## 7. Settle

When every round of every member is final and the last round has closed, anyone can press **Settle the pool**. Each member receives their credited slices plus a share of the pot. The **Counted** and **Projected** columns show what each member would get at any moment.

## Reading the stones

| stone | meaning |
| --- | --- |
| open (outlined) | no claim yet and the round can still be claimed, or has not opened |
| gold | claimed, waiting for the judge |
| teal | credited (a lighter tone while it can still be contested, solid when final) |
| muted | missed (the same: provisional or final) |

Hover a stone to see its meaning; select it for the full story of that round.
