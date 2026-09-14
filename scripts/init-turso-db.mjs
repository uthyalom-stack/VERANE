import fs from "fs";
import path from "path";
import crypto from "crypto";
import { createClient } from "@libsql/client";

function resolveConnectionConfig() {
  const tursoUrl = process.env.TURSO_DATABASE_URL;
  const dbUrl = process.env.DATABASE_URL;
  const isProd = process.env.NODE_ENV === "production";

  let url;

  if (tursoUrl) {
    url = tursoUrl;
  } else if (isProd) {
    throw new Error(
      "Missing TURSO_DATABASE_URL environment variable in production. " +
      "Legacy PostgreSQL / Neon DATABASE_URL is not supported by libSQL."
    );
  } else if (dbUrl && (dbUrl.startsWith("file:") || dbUrl.startsWith("sqlite:"))) {
    url = dbUrl;
  } else {
    url = "file:./dev.db";
  }

  if (url.startsWith("postgres://") || url.startsWith("postgresql://")) {
    throw new Error(
      "PostgreSQL connection strings (including Neon URLs) are not supported by libSQL adapter. " +
      "Please set TURSO_DATABASE_URL to a valid libsql:// or https:// URL or local file: path."
    );
  }

  const authToken = process.env.TURSO_AUTH_TOKEN || undefined;
  return { url, authToken };
}

export async function initTursoSchema() {
  console.log("[TURSO DB INIT] Starting production-safe Turso schema initialization/migration...");

  const { url, authToken } = resolveConnectionConfig();

  console.log(`[TURSO DB INIT] Connecting to database target: ${url.startsWith("file:") ? url : url.split("@")[0] || "remote"}`);

  const client = createClient({
    url,
    authToken,
  });

  // Ensure lightweight Prisma-compatible migration tracking table exists
  await client.execute(`
    CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
      "id" TEXT PRIMARY KEY NOT NULL,
      "checksum" TEXT NOT NULL,
      "finished_at" DATETIME,
      "migration_name" TEXT NOT NULL,
      "logs" TEXT,
      "rolled_back_at" DATETIME,
      "started_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "applied_steps_count" INTEGER NOT NULL DEFAULT 0
    );
  `);

  // Query already applied migration names
  const appliedResult = await client.execute(
    `SELECT "migration_name" FROM "_prisma_migrations" WHERE "finished_at" IS NOT NULL;`
  );
  const appliedMigrationSet = new Set(
    appliedResult.rows.map((row) => String(row.migration_name))
  );

  console.log(`[TURSO DB INIT] Currently applied migrations (${appliedMigrationSet.size}):`, Array.from(appliedMigrationSet));

  const migrationsDir = path.join(process.cwd(), "prisma/migrations");

  if (!fs.existsSync(migrationsDir)) {
    console.error("[TURSO DB INIT] Migrations directory not found at:", migrationsDir);
    throw new Error("prisma/migrations directory missing");
  }

  const entries = fs.readdirSync(migrationsDir, { withFileTypes: true });
  const migrationFolders = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  console.log(`[TURSO DB INIT] Found ${migrationFolders.length} migration folder(s) in codebase:`, migrationFolders);

  let appliedCount = 0;
  let skippedCount = 0;

  for (const folder of migrationFolders) {
    if (appliedMigrationSet.has(folder)) {
      console.log(`[TURSO DB INIT] Skipping already applied migration: ${folder}`);
      skippedCount++;
      continue;
    }

    const sqlPath = path.join(migrationsDir, folder, "migration.sql");
    if (!fs.existsSync(sqlPath)) {
      console.warn(`[TURSO DB INIT] Warning: ${folder}/migration.sql not found, skipping.`);
      continue;
    }

    console.log(`[TURSO DB INIT] Applying migration script: ${folder}/migration.sql ...`);
    const sql = fs.readFileSync(sqlPath, "utf-8");
    const checksum = crypto.createHash("sha256").update(sql).digest("hex");
    const migrationId = crypto.randomUUID();

    try {
      // Execute the migration DDL batch
      await client.executeMultiple(sql);

      // Record successful migration execution in tracking table
      await client.execute({
        sql: `INSERT INTO "_prisma_migrations" ("id", "checksum", "finished_at", "migration_name", "applied_steps_count")
              VALUES (?, ?, CURRENT_TIMESTAMP, ?, 1);`,
        args: [migrationId, checksum, folder],
      });

      console.log(`[TURSO DB INIT] Successfully applied and recorded migration: ${folder}`);
      appliedCount++;
    } catch (err) {
      console.error(`[TURSO DB INIT] Error executing migration ${folder}:`, err.message || err);
      throw err;
    }
  }

  // Verify total tables created
  const tablesResult = await client.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';");
  const tableNames = tablesResult.rows.map((row) => String(row.name));
  console.log(`[TURSO DB INIT] Total tables verified in target database: ${tableNames.length}`);
  console.log(`[TURSO DB INIT] Initialization summary: ${appliedCount} applied, ${skippedCount} skipped.`);

  return {
    success: true,
    appliedCount,
    skippedCount,
    tablesCount: tableNames.length,
    tableNames,
  };
}

// Allow running directly via CLI: node scripts/init-turso-db.mjs
if (import.meta.url === `file://${process.argv[1]}`) {
  initTursoSchema()
    .then((res) => {
      console.log("[TURSO DB INIT] Completed successfully!", res);
      process.exit(0);
    })
    .catch((err) => {
      console.error("[TURSO DB INIT] Failed:", err);
      process.exit(1);
    });
}
