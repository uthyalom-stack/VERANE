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

async function waitForConcurrentMigration(client, folder, timeoutMs = 60000) {
  const pollIntervalMs = 500;
  const startTime = Date.now();

  console.log(`[TURSO DB INIT] Waiting for concurrent initializer applying migration: ${folder}...`);

  while (Date.now() - startTime < timeoutMs) {
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));

    const checkResult = await client.execute({
      sql: `SELECT "finished_at", "rolled_back_at" FROM "_prisma_migrations" WHERE "migration_name" = ?;`,
      args: [folder],
    });

    if (checkResult.rows.length > 0) {
      const row = checkResult.rows[0];
      if (row.finished_at) {
        console.log(`[TURSO DB INIT] Concurrent initializer finished migration: ${folder}`);
        return true;
      }
      if (row.rolled_back_at) {
        throw new Error(`Concurrent initializer failed on migration ${folder} (rolled back).`);
      }
    } else {
      // Reservation row disappeared (failed / cleaned up by other process)
      console.warn(`[TURSO DB INIT] Concurrent reservation for ${folder} was released or removed.`);
      return false;
    }
  }

  throw new Error(`Timed out waiting for concurrent migration ${folder} to finish after ${timeoutMs}ms.`);
}

export async function initTursoSchema() {
  console.log("[TURSO DB INIT] Starting production-safe Turso schema initialization/migration...");

  const { url, authToken } = resolveConnectionConfig();

  console.log(`[TURSO DB INIT] Connecting to database target: ${url.startsWith("file:") ? url : url.split("@")[0] || "remote"}`);

  const client = createClient({
    url,
    authToken,
  });

  // Ensure lightweight Prisma-compatible migration tracking table exists with UNIQUE constraint on migration_name
  await client.execute(`
    CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
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
    // 1. Check if migration has already been finished by a prior run
    const statusResult = await client.execute({
      sql: `SELECT "finished_at" FROM "_prisma_migrations" WHERE "migration_name" = ?;`,
      args: [folder],
    });

    if (statusResult.rows.length > 0 && statusResult.rows[0].finished_at) {
      console.log(`[TURSO DB INIT] Skipping already applied migration: ${folder}`);
      skippedCount++;
      continue;
    }

    const sqlPath = path.join(migrationsDir, folder, "migration.sql");
    if (!fs.existsSync(sqlPath)) {
      console.warn(`[TURSO DB INIT] Warning: ${folder}/migration.sql not found, skipping.`);
      continue;
    }

    const sql = fs.readFileSync(sqlPath, "utf-8");
    const checksum = crypto.createHash("sha256").update(sql).digest("hex");
    const migrationId = crypto.randomUUID();

    // 2. Attempt atomic lock reservation using the UNIQUE constraint on migration_name
    let reservationAcquired = false;
    try {
      await client.execute({
        sql: `INSERT INTO "_prisma_migrations" ("id", "checksum", "finished_at", "migration_name", "started_at", "applied_steps_count")
              VALUES (?, ?, NULL, ?, CURRENT_TIMESTAMP, 0);`,
        args: [migrationId, checksum, folder],
      });
      reservationAcquired = true;
      console.log(`[TURSO DB INIT] Acquired migration lock reservation for: ${folder}`);
    } catch (err) {
      // UNIQUE constraint violation means another process concurrently reserved or finished this migration
      console.log(`[TURSO DB INIT] Migration lock for ${folder} already acquired by another process.`);
      const finished = await waitForConcurrentMigration(client, folder);
      if (finished) {
        skippedCount++;
        continue;
      }
    }

    // 3. If this process acquired the reservation, apply the DDL and finalize
    if (reservationAcquired) {
      console.log(`[TURSO DB INIT] Applying migration script: ${folder}/migration.sql ...`);

      try {
        await client.executeMultiple(sql);

        // Mark finished_at
        await client.execute({
          sql: `UPDATE "_prisma_migrations"
                SET "finished_at" = CURRENT_TIMESTAMP, "applied_steps_count" = 1
                WHERE "id" = ?;`,
          args: [migrationId],
        });

        console.log(`[TURSO DB INIT] Successfully applied and finalized migration: ${folder}`);
        appliedCount++;
      } catch (err) {
        console.error(`[TURSO DB INIT] Error executing migration ${folder}:`, err.message || err);

        // On failure, remove reservation so retry is possible
        await client.execute({
          sql: `DELETE FROM "_prisma_migrations" WHERE "id" = ?;`,
          args: [migrationId],
        }).catch(() => {});

        throw err;
      }
    }
  }

  // Verify total non-sqlite internal tables created
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
