import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@libsql/client";
import { initTursoSchema } from "../scripts/init-turso-db.mjs";

const testDbPath = path.join(process.cwd(), "prisma/test_failed_migration.db");
const migrationName = "99999999999999_test_failed_transaction";
const migrationDir = path.join(process.cwd(), "prisma/migrations", migrationName);

async function run() {
  console.log("=== TESTING TURSO MIGRATION TRANSACTION ROLLBACK ===");
  if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
  if (fs.existsSync(migrationDir)) fs.rmSync(migrationDir, { recursive: true, force: true });

  fs.mkdirSync(migrationDir, { recursive: true });
  fs.writeFileSync(
    path.join(migrationDir, "migration.sql"),
    'CREATE TABLE "ShouldRollback" ("id" TEXT PRIMARY KEY);\nTHIS IS INTENTIONALLY INVALID SQL;\n',
    "utf8"
  );

  process.env.TURSO_DATABASE_URL = `file:${testDbPath}`;
  process.env.DATABASE_URL = `file:${testDbPath}`;
  const client = createClient({ url: `file:${testDbPath}` });

  try {
    await assert.rejects(() => initTursoSchema(), /Migration .* failed/);

    const table = await client.execute(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'ShouldRollback';"
    );
    assert.equal(table.rows.length, 0, "DDL before the failing statement must be rolled back");

    const failure = await client.execute({
      sql: 'SELECT "rolled_back_at", "logs" FROM "_prisma_migrations" WHERE "migration_name" = ?;',
      args: [migrationName],
    });
    assert.equal(failure.rows.length, 1, "failed migration record must be retained");
    assert.ok(failure.rows[0].rolled_back_at, "failed migration must be marked as failed");
    assert.ok(String(failure.rows[0].logs || "").length > 0, "failure details must be recorded");

    await assert.rejects(
      () => initTursoSchema(),
      /Concurrent initializer failed|rolled back/i,
      "a later initializer must not silently retry a failed migration"
    );

    console.log("✓ Failed migration rolled back atomically and unsafe automatic retry was blocked.");
  } finally {
    await client.close();
    if (fs.existsSync(migrationDir)) fs.rmSync(migrationDir, { recursive: true, force: true });
    if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
  }
}

run().catch((error) => {
  console.error("❌ Failed migration transaction test failed:", error);
  process.exit(1);
});
