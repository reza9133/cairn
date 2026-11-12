import "@fontsource-variable/bricolage-grotesque";
import "@fontsource-variable/instrument-sans";
import "@fontsource-variable/jetbrains-mono";
import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { syncClock } from "./lib/clock";
import { initWallet } from "./lib/wallet";
import "./lib/theme";
import "./styles/tokens.css";
import "./styles/base.css";
import "./styles/components.css";
import "./styles/pages.css";
import "./styles/docs.css";

initWallet();
syncClock();

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
