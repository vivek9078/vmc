import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // "standalone" traces only the node_modules this app actually needs into
  // .next/standalone, so the Electron desktop build (see electron/main.js)
  // can bundle a minimal, self-contained server instead of all of
  // node_modules. Has no effect on `next dev` or a normal `next start`.
  output: "standalone",
  // pdf-parse and tesseract.js both do dynamic requires / load worker and
  // WASM assets at runtime rather than being purely import-graph-analyzable,
  // which can confuse Next's bundler under `output: "standalone"`. Marking
  // them external keeps them as normal node_modules requires so the
  // standalone build's file tracer copies their real files across intact.
  serverExternalPackages: ["pdf-parse", "tesseract.js"],
};

export default nextConfig;
