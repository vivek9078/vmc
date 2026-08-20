// Runs automatically after `next build` (see the "postbuild" script in
// package.json). `output: "standalone"` in next.config.ts traces only the
// node_modules the server actually needs into .next/standalone — it does
// NOT copy the `public/` folder or `.next/static/` (the built CSS/JS
// chunks) into that folder, because Next has no way to know which static
// assets you want at runtime. The official docs
// (https://nextjs.org/docs/app/api-reference/config/next-config-js/output)
// say to copy both by hand before running `node .next/standalone/server.js`.
// This project's Render start command runs that file directly, so without
// this step the deployed app would 500/404 on every CSS/JS chunk and on
// public assets like the favicon — server starts and login can succeed
// (that's a server action, no static assets involved), but every page
// after that renders unstyled/broken, which is consistent with "dashboard
// not opening correctly" even though authentication itself is fine.
import { cpSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const standaloneDir = join(root, ".next", "standalone");

if (!existsSync(standaloneDir)) {
  console.warn("[postbuild] .next/standalone not found — is output: \"standalone\" still set in next.config.ts? Skipping asset copy.");
  process.exit(0);
}

// public/ -> .next/standalone/public
const publicSrc = join(root, "public");
const publicDest = join(standaloneDir, "public");
if (existsSync(publicSrc)) {
  cpSync(publicSrc, publicDest, { recursive: true });
  console.log("[postbuild] copied public/ -> .next/standalone/public");
}

// .next/static/ -> .next/standalone/.next/static
const staticSrc = join(root, ".next", "static");
const staticDestDir = join(standaloneDir, ".next");
const staticDest = join(staticDestDir, "static");
if (existsSync(staticSrc)) {
  mkdirSync(staticDestDir, { recursive: true });
  cpSync(staticSrc, staticDest, { recursive: true });
  console.log("[postbuild] copied .next/static/ -> .next/standalone/.next/static");
}
