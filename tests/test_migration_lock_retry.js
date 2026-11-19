import assert from "node:assert";
import path from "node:path";
import fs from "node:fs";
import { createClient } from "@libsql/client";
import { initTursoSchema } from "../scripts/init-turso-db.mjs";

async function testReservationReleaseAndRetry() {
  console.log("=== RUNNING CONCURRENT INITIALIZER RESERVATION RELEASE & RETRY TEST ===");

  const testDbPath = path.join(process.cwd(), "prisma/test_retry_lock.db");
  if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);

  process.env.TURSO_DATABASE_URL = `file:${testDbPath}`;

  const client = createClient({ url: `file:${testDbPath}` });

  // 1. Create tracking table manually and insert an unfinished pending reservation row for baseline migration
  await client.execute(`
    CREATE TABLE "_prisma_migrations" (
      "id" TEXT PRIMARY KEY NOT NULL,
      "checksum" TEXT NOT NULL,
      "finished_at" DATETIME,
      "migration_name" TEXT UNIQUE NOT NULL,
      "logs" TEXT,
      "rolled_back_at" DATETIME,
      "started_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "applied_steps_count" INTEGER NOT NULL DEFAULT 0
    );
  `);

  await client.execute(`
    INSERT INTO "_prisma_migrations" ("id", "checksum", "finished_at", "migration_name", "started_at")
    VALUES ('fake_res_id', 'fake_sum', NULL, '20260915000000_init_sqlite', CURRENT_TIMESTAMP);
  `);

  console.log("✓ Inserted simulated pending lock reservation row.");

  // Simulate a process that partially applied the baseline migration before failing.
  // The first table already exists when the initializer retries, so baseline DDL must be idempotent.
  await client.execute(`
    CREATE TABLE IF NOT EXISTS "User" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "email" TEXT NOT NULL,
      "password" TEXT NOT NULL,
      "name" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
  console.log("✓ Simulated partial baseline DDL (User table already exists).");

  // 2. Schedule deletion of fake reservation after 1 second to simulate failed process releasing reservation
  setTimeout(async () => {
    console.log("✓ Simulating failed initializer releasing lock reservation...");
    await client.execute(`DELETE FROM "_prisma_migrations" WHERE "id" = 'fake_res_id';`);
  }, 1000);

  // 3. Execute initTursoSchema() which encounters lock, waits, detects release, retries, acquires reservation, and applies migrations
  const result = await initTursoSchema();
  console.log("Initializer result after retry:", result);

  assert.strictEqual(result.appliedCount, 3, "Initializer should apply all 3 migrations after lock release retry");
  assert.strictEqual(result.tablesCount, 28, "Target database should contain 28 tables including OrderFulfillment");

  // Verify the reconciled schema, not just the migration count.
  const orderColumns = await client.execute('PRAGMA table_info("Order");');
  const userIdColumn = orderColumns.rows.find((row) => row.name === "userId");
  assert.ok(userIdColumn, "Order.userId column exists");
  assert.strictEqual(Number(userIdColumn.notnull), 0, "Order.userId must be nullable for guest checkout");

  const productColumns = await client.execute('PRAGMA table_info("Product");');
  const productColumnNames = new Set(productColumns.rows.map((row) => row.name));
  for (const column of ["weight", "packageLength", "packageWidth", "packageHeight"]) {
    assert.ok(productColumnNames.has(column), `Product.${column} exists for Shipbubble parcel calculations`);
  }

  const categoryColumns = await client.execute('PRAGMA table_info("Category");');
  assert.ok(categoryColumns.rows.some((row) => row.name === "shippingWeight"), "Category.shippingWeight exists");

  const collaborationColumns = await client.execute('PRAGMA table_info("Collaboration");');
  for (const column of ["creatorBrand", "creatorRole"]) {
    assert.ok(collaborationColumns.rows.some((row) => row.name === column), `Collaboration.${column} exists`);
  }

  const fulfillmentTable = await client.execute(
    'SELECT name FROM sqlite_master WHERE type = \'table\' AND name = \'OrderFulfillment\';'
  );
  assert.strictEqual(fulfillmentTable.rows.length, 1, "OrderFulfillment table exists");

  if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);

  console.log("✓ CONCURRENT RESERVATION RELEASE AND RETRY TEST PASSED!\n");
}

testReservationReleaseAndRetry().catch((err) => {
  console.error("❌ Reservation release and retry test failed:", err);
  process.exit(1);
});
