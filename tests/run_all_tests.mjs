import { spawn } from "child_process";
import path from "path";

const testFiles = [
  "tests/test_security_audit_suite.js",
  "tests/test_turso_shared_client_adapter.js",
  "tests/test_customer_auth.js",
  "tests/test_brand_tracking.js",
  "tests/test_email_system.js",
  "tests/test_live_search_suite.js",
  "tests/test_migration_safety.js",
  "tests/test_migration_lock_retry.js",
  "tests/test_paystack_initialize.js",
  "tests/test_product_archival_suite.js",
  "tests/test_receipt_pdf_logos.js",
  "tests/test_registration_email.js",
];

async function runTestFile(file) {
  return new Promise((resolve, reject) => {
    console.log(`\n==================================================`);
    console.log(`RUNNING TEST: ${file}`);
    console.log(`==================================================`);

    const proc = spawn(
      process.execPath,
      ["--experimental-loader", "./tests/loader.mjs", file],
      {
        stdio: "inherit",
        env: {
          ...process.env,
          TURSO_DATABASE_URL: process.env.TURSO_DATABASE_URL || "file:./prisma/dev.db",
          DATABASE_URL: process.env.DATABASE_URL || "file:./prisma/dev.db",
        },
      }
    );

    proc.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Test file ${file} failed with exit code ${code}`));
      }
    });
  });
}

async function runAllTests() {
  console.log("=== VÉRANE FULL TURSO REGRESSION SUITE RUNNER ===");
  let passed = 0;
  let failed = 0;

  for (const file of testFiles) {
    try {
      await runTestFile(file);
      passed++;
    } catch (err) {
      console.error(`\n❌ FAILED: ${file}`);
      console.error(err.message);
      failed++;
      process.exit(1);
    }
  }

  console.log("\n==================================================");
  console.log(`ALL VÉRANE REGRESSION TESTS PASSED! (${passed}/${testFiles.length})`);
  console.log("==================================================\n");
}

runAllTests().catch((err) => {
  console.error("Test runner execution error:", err);
  process.exit(1);
});
