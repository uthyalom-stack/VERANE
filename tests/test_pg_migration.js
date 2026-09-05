import assert from "assert";
import { execSync } from "child_process";
import fs from "fs";
import path from "path";

async function runPgMigrationTest() {
  console.log("=== RUNNING REAL POSTGRESQL MIGRATION INTEGRATION TEST ===");

  const testDbUrl = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;

  if (!testDbUrl || !testDbUrl.startsWith("postgres")) {
    console.log("[SKIP] TEST_DATABASE_URL / DATABASE_URL for PostgreSQL is not set. Skipping real PG integration test.");
    console.log("To run real PostgreSQL migration integration test, supply TEST_DATABASE_URL=postgresql://user:pass@host:5432/dbname");
    return;
  }

  // Import pg module dynamically or require
  let Client;
  try {
    const pg = await import("pg");
    Client = pg.default?.Client || pg.Client;
  } catch {
    console.log("[SKIP] 'pg' package not installed in environment for direct node-pg connection. Skipping direct PG test.");
    return;
  }

  const client = new Client({ connectionString: testDbUrl });
  await client.connect();

  try {
    console.log("Connected to test PostgreSQL database. Applying migration SQL...");

    const migrationSqlPath = path.join(process.cwd(), "prisma/migrations/20260907000000_add_product_variant_uniqueness/migration.sql");
    const migrationSql = fs.readFileSync(migrationSqlPath, "utf-8");

    // Execute migration SQL inside transaction
    await client.query("BEGIN;");
    await client.query(migrationSql);
    await client.query("COMMIT;");

    console.log("✓ Migration SQL executed successfully on real PostgreSQL database!");

  } catch (err) {
    await client.query("ROLLBACK;").catch(() => {});
    console.error("Migration Execution Error on PostgreSQL:", err);
    throw err;
  } finally {
    await client.end();
  }
}

runPgMigrationTest().catch((err) => {
  console.error("Real PG Migration Test Failed:", err);
  process.exit(1);
});
