Cairn connects to your wallet with **EIP-6963** (multi injected provider discovery), the modern way for browser wallets to announce themselves.

## Connecting

1. Press **Connect wallet**. The site asks the page's wallets to announce themselves and lists them with their own name and icon.
2. Pick one. Your wallet shows its approval screen (`eth_requestAccounts`).
3. Your address and GEN balance appear in the top bar.

Because the list comes from the wallets themselves, having several wallets installed does not cause conflicts: you choose which one Cairn uses. If a wallet is installed but missing from the list, press **Look again**. Wallets that do not support EIP-6963 yet are offered as **Browser wallet** when they inject the classic provider.

The site remembers which wallet you used and reconnects quietly on your next visit — unless you disconnected on purpose.

## Disconnecting

Open the wallet menu in the top bar and choose **Disconnect**. The site forgets the account at once, stops listening to the wallet and will not reconnect by itself. Where the wallet supports `wallet_revokePermissions` (for example MetaMask), the site's permission is revoked as well, so the wallet asks again next time.

You can also **Switch wallet** from the same menu to choose another wallet or account without leaving the page.

## The right network

Cairn runs on **GenLayer Studionet**:

| | |
| --- | --- |
| Network name | GenLayer Studionet |
| Chain ID | 61999 (`0xf22f`) |
| RPC URL | `https://studio.genlayer.com/api` |
| Currency | GEN |

When your wallet is on another network you will see:

- a **banner** under the top bar saying which network the wallet is on, with a **Switch network** button;
- a **dialog** right after connecting that explains the problem and switches for you;
- a **guard** on every action: pressing a button that sends a transaction first asks your wallet to switch.

The switch uses `wallet_switchEthereumChain`. If the network is not in your wallet, the site falls back to `wallet_addEthereumChain` with the values above and your wallet asks you to approve adding it. If you reject the request, nothing breaks — you just stay where you were and can try again.

## Changing account or network inside the wallet

The site listens to `accountsChanged`, `chainChanged` and `disconnect`. Switching account or network in your wallet updates the page immediately; locking the wallet or disconnecting it there disconnects the site too.

## What a transaction looks like

Every action opens a **transaction dialog** that follows four steps: confirm in your wallet, sent to GenLayer, validators reach consensus, done. Calls that ask the AI (judging and auditing) say so and can take a few minutes. You may hide the dialog; a small pill in the corner keeps showing the time. The last transactions are listed in the wallet menu with links to the explorer.

## Troubleshooting

- **"No wallet found"** — install a browser wallet (MetaMask, Rabby, Rainbow…) and press *Look again*.
- **The connect button does nothing** — check whether the wallet is locked, or has a pending request open in its own window.
- **"You closed the request in your wallet"** — you rejected a request; start again whenever you like.
- **The balance shows 0** — your wallet is probably on another network, or the address has no Studionet funds. Fund it with Studionet test tokens (the repository's `npm run keys` script funds test accounts through the simulator).
- **A transaction is stuck at "Validators reach consensus"** — AI calls are slow. Keep the tab open; if it takes more than ten minutes, check the transaction in the explorer.
