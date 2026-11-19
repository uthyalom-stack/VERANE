import assert from "node:assert/strict";
import { spawn } from "node:child_process";

const port = Number(process.env.CF_PREVIEW_PORT || 8787);
const baseUrl = `http://127.0.0.1:${port}`;
const command = process.platform === "win32" ? "npx.cmd" : "npx";

const preview = spawn(
  command,
  ["opennextjs-cloudflare", "preview", `--port=${port}`],
  {
    stdio: "inherit",
    env: process.env,
  }
);

let previewExited = false;
let previewExitCode = null;
preview.once("exit", (code) => {
  previewExited = true;
  previewExitCode = code;
});

async function waitForPreview() {
  const deadline = Date.now() + 90_000;
  let lastError;

  while (Date.now() < deadline) {
    if (previewExited) {
      throw new Error(`Cloudflare preview exited early (code ${previewExitCode}).`);
    }

    try {
      return await fetch(`${baseUrl}/admin/login`, {
        redirect: "manual",
        signal: AbortSignal.timeout(5_000),
      });
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  throw new Error(
    `Cloudflare preview did not become ready within 90 seconds. Last error: ${lastError?.message || "unknown"}`
  );
}

try {
  const loginPage = await waitForPreview();
  assert.equal(loginPage.status, 200, "public admin login page should load in Workers runtime");
  assert.equal(
    loginPage.headers.get("x-content-type-options"),
    "nosniff",
    "Edge middleware security headers should be applied"
  );
  assert.match(
    loginPage.headers.get("cache-control") || "",
    /no-store/,
    "admin pages should not be cached"
  );
  console.log("✓ Workers runtime serves the public admin login page and middleware headers");

  const protectedPage = await fetch(`${baseUrl}/admin/analytics`, {
    redirect: "manual",
    signal: AbortSignal.timeout(10_000),
  });
  assert.equal(protectedPage.status, 307, "unauthenticated admin page should redirect");
  const redirectUrl = new URL(protectedPage.headers.get("location"), baseUrl);
  assert.equal(redirectUrl.pathname, "/admin/login");
  assert.equal(redirectUrl.searchParams.get("redirect"), "/admin/analytics");
  console.log("✓ Edge middleware redirects unauthenticated admin page requests");

  const adminApi = await fetch(`${baseUrl}/api/admin/session`, {
    redirect: "manual",
    signal: AbortSignal.timeout(10_000),
  });
  assert.equal(adminApi.status, 401, "unauthenticated admin API request should be rejected");
  const apiBody = await adminApi.json();
  assert.equal(apiBody.success, false);
  assert.equal(apiBody.error, "Unauthorized");
  console.log("✓ Edge middleware rejects unauthenticated admin API requests");

  console.log("Cloudflare Workers runtime smoke tests passed.");
} catch (error) {
  console.error("Cloudflare Workers runtime smoke tests failed:", error);
  process.exitCode = 1;
} finally {
  preview.kill("SIGTERM");
}
