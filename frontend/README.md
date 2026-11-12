# Cairn — web app

The website for the [Cairn](../README.md) Intelligent Contract on **GenLayer Studionet**.
Static single-page app: Vite + React + TypeScript, three.js for the 3D scenes, `genlayer-js` for the contract.
No backend: it reads the contract through the public Studionet RPC and sends transactions from the visitor's own wallet.

- **Contract:** `0x6a5413E33cDE24E7C2d84d8df134D6a47328f935` (Studionet, chain id 61999) — change it in `src/config.ts`
- **Wallets:** EIP-6963 discovery, working connect / disconnect, network-switch prompt
- **Themes:** Light and Dim
- **Docs:** 15 pages in `src/docs/*.md`, rendered inside the app

## Run

```bash
cd frontend
npm install
npm run dev        # http://localhost:5173
npm run build      # static site in dist/
```

Override the contract or RPC at build time:

```bash
VITE_CAIRN_ADDRESS=0xYourAddress VITE_STUDIONET_RPC=https://studio.genlayer.com/api npm run build
```

## Deploy

The build uses a hash router and relative paths, so it works from any folder or host.
For GitHub Pages, copy `.github/workflows/pages.yml` (included next to this folder) to the repository root, then enable **Settings → Pages → Source: GitHub Actions**.

## Links

- Source: https://github.com/reza9133/cairn
- Author: https://x.com/amirhp771
