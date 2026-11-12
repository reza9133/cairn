import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base "./" makes the build work from any sub-path (GitHub Pages, IPFS, a plain folder).
// The app uses a hash router, so no server rewrite rules are needed.
export default defineConfig({
  base: "./",
  plugins: [react()],
  build: {
    target: "es2020",
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        manualChunks: {
          three: ["three"],
          genlayer: ["genlayer-js"],
        },
      },
    },
  },
  define: { global: "globalThis" },
});
