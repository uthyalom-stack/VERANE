import { spawnSync } from "node:child_process";

const env = { ...process.env };

// Next.js collects route/page data during build and imports the Prisma module.
// Cloudflare Workers Builds may not have runtime secrets available at build time.
// Supply a harmless local libSQL URL only when no URL is configured; this is
// strictly for build-time module initialization and is never deployed as a
// runtime binding. Real Worker runtime variables remain dashboard-managed.
if (!env.TURSO_DATABASE_URL) {
  env.TURSO_DATABASE_URL = "file:./prisma/cloudflare-build.db";
}
if (!env.DATABASE_URL) {
  env.DATABASE_URL = "file:./prisma/cloudflare-build.db";
}
if (!env.TURSO_AUTH_TOKEN) {
  env.TURSO_AUTH_TOKEN = "cloudflare-build-placeholder";
}
env.NODE_ENV = "production";

const command = process.platform === "win32" ? "npm.cmd" : "npm";
const install = spawnSync(
  command,
  [
    "install",
    "--include=dev",
    "--no-save",
    "--package-lock=false",
    "@opennextjs/cloudflare@1.20.17",
    "wrangler@4.165.0",
  ],
  { stdio: "inherit", env }
);
if (install.status !== 0) process.exit(install.status ?? 1);

const prisma = spawnSync(
  command,
  ["exec", "prisma", "generate"],
  { stdio: "inherit", env }
);
if (prisma.status !== 0) process.exit(prisma.status ?? 1);

const build = spawnSync(
  command,
  ["exec", "opennextjs-cloudflare", "build"],
  { stdio: "inherit", env }
);
process.exit(build.status ?? 1);
