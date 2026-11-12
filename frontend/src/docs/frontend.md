This website is a static single-page app: **Vite + React + TypeScript**, **three.js** for the 3D scenes, and **genlayer-js** for the contract. There is no backend.

## Run it

```bash
cd frontend
npm install
npm run dev          # http://localhost:5173
npm run build        # production build in frontend/dist
npm run preview      # serve the production build locally
```

## Configuration

Everything configurable lives in `src/config.ts`:

| setting | meaning |
| --- | --- |
| `CONTRACT_ADDRESS` | the deployed contract (`0x6a5413E33cDE24E7C2d84d8df134D6a47328f935` on Studionet) |
| `CHAIN` | Studionet id (61999), RPC URL, currency and explorer |
| `GITHUB_URL`, `X_URL` | the links in the header and the footer |
| `LIMITS`, `DEFAULTS` | the contract's ranges, used to validate the forms |

Two environment variables override the defaults at build time: `VITE_CAIRN_ADDRESS` and `VITE_STUDIONET_RPC` (see `.env.example`).

## Deploy

The build is fully static and uses a **hash router** with relative asset paths, so it works from any folder without server rules: GitHub Pages, Netlify, Cloudflare Pages, IPFS, or a plain file server.

A ready-made GitHub Actions workflow is included (`.github/workflows/pages.yml`): enable *Pages → GitHub Actions* in the repository settings and push to `main`.

## How the app is organised

```
src/
  config.ts              address, chain, links, limits
  lib/
    wallet.ts            EIP-6963 discovery, connect / disconnect, network switch
    chain.ts             genlayer-js: reads, writes, receipt decoding
    tx.ts                the transaction flow and its dialog state
    pool.ts              the rules of the contract as pure functions
    format.ts            GEN, time and address formatting, evidence-link check
    errors.ts            every refusal message of the contract
  components/            logo, 3D scene, spinners, wallet UI, forms, tables
  pages/                 Home, Pools, PoolDetail, Create, MyPools, Ledger, Docs
  docs/*.md              these documentation pages (plain Markdown)
  styles/                design tokens, themes and components
```

## Themes

There are two themes: **Light** and **Dim** (a softened dark with moderate contrast). The first visit follows the operating system; the toggle in the top bar remembers your choice. All colours are CSS variables in `src/styles/tokens.css`.

## The 3D parts

- The landing page and the create page use a real-time **three.js** scene: glossy pebbles, a spark, ripples and drifting dust. It pauses when it is off screen or the tab is hidden, honours *reduce motion*, and falls back to the logo when WebGL is not available.
- The loaders are CSS 3D: a stack of stones that drops in and sways.
- Mochi, the mascot, tilts towards the pointer.

## Adding a documentation page

1. Create `src/docs/my-page.md`.
2. Import it and add an entry in `src/docs/index.ts`.

Callouts use `> [!NOTE]`, `> [!TIP]`, `> [!WARNING]` and `> [!DANGER]`. Links such as `[text](/docs/money)` navigate inside the app.
