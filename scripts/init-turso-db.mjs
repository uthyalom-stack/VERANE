import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";
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

function splitSqlStatements(sql) {
  // Split migration SQL without breaking semicolons inside quoted strings or comments.
  const statements = [];
  let current = "";
  let quote = null;
  let lineComment = false;
  let blockComment = false;

  for (let i = 0; i < sql.length; i++) {
    const char = sql[i];
    const next = sql[i + 1];

    if (lineComment) {
      current += char;
      if (char === "\n") lineComment = false;
      continue;
    }
    if (blockComment) {
      current += char;
      if (char === "*" && next === "/") {
        current += next;
        i++;
        blockComment = false;
      }
      continue;
    }
    if (quote) {
      current += char;
      if (char === quote) {
        if (next === quote) {
          current += next;
          i++;
        } else {
          quote = null;
        }
      } else if (char === "\\" && next) {
        current += next;
        i++;
      }
      continue;
    }

    if (char === "-" && next === "-") {
      current += char + next;
      i++;
      lineComment = true;
      continue;
    }
    if (char === "/" && next === "*") {
      current += char + next;
      i++;
      blockComment = true;
      continue;
    }
    if (char === "'" || char === '"' || char === "`") {
      quote = char;
      current += char;
      continue;
    }
    if (char === ";") {
      if (current.trim()) statements.push(current.trim());
      current = "";
      continue;
    }
    current += char;
  }

  if (quote || blockComment) {
    throw new Error("Malformed migration SQL: unterminated quoted string or block comment.");
  }
  if (current.trim()) statements.push(current.trim());
  return statements;
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
    const sqlPath = path.join(migrationsDir, folder, "migration.sql");
    if (!fs.existsSync(sqlPath)) {
      console.warn(`[TURSO DB INIT] Warning: ${folder}/migration.sql not found, skipping.`);
      continue;
    }

    const sql = fs.readFileSync(sqlPath, "utf-8");
    const checksum = crypto.createHash("sha256").update(sql).digest("hex");

    let isApplied = false;
    let maxRetries = 10;
    let attempt = 0;

    while (!isApplied && attempt < maxRetries) {
      attempt++;

      // 1. Check if migration has already been finished by a prior run
      const statusResult = await client.execute({
        sql: `SELECT "checksum", "finished_at" FROM "_prisma_migrations" WHERE "migration_name" = ?;`,
        args: [folder],
      });

      if (statusResult.rows.length > 0 && statusResult.rows[0].finished_at) {
        const storedChecksum = String(statusResult.rows[0].checksum || "");
        if (storedChecksum && storedChecksum !== checksum) {
          throw new Error(
            `Migration checksum mismatch for "${folder}". ` +
            `Expected ${storedChecksum}, but current migration.sql checksum is ${checksum}. ` +
            `Already applied migrations cannot be modified.`
          );
        }

        console.log(`[TURSO DB INIT] Skipping already applied migration: ${folder}`);
        skippedCount++;
        isApplied = true;
        break;
      }

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
          isApplied = true;
          break;
        } else {
          // Concurrent initializer failed and released reservation row. Retry this attempt loop!
          console.log(`[TURSO DB INIT] Retrying migration acquisition for ${folder} (attempt ${attempt + 1}/${maxRetries})...`);
          continue;
        }
      }

      // 3. If this process acquired the reservation, apply the DDL and finalize
      if (reservationAcquired) {
        console.log(`[TURSO DB INIT] Applying migration script: ${folder}/migration.sql ...`);

        let transaction;
        try {
          // SQLite supports transactional DDL. Execute every statement on the same libSQL
          // transaction so a failed statement rolls back earlier table/index creation too.
          transaction = await client.transaction("write");
          const statements = splitSqlStatements(sql);
          if (statements.length === 0) {
            throw new Error(`Migration "${folder}" contains no SQL statements.`);
          }

          for (const statement of statements) {
            await transaction.execute(statement);
          }

          // The schema changes and the successful migration marker commit together.
          await transaction.execute({
            sql: `UPDATE "_prisma_migrations"
                  SET "finished_at" = CURRENT_TIMESTAMP, "applied_steps_count" = 1
                  WHERE "id" = ?;`,
            args: [migrationId],
          });
          await transaction.commit();
          transaction = null;

          console.log(`[TURSO DB INIT] Successfully applied and finalized migration: ${folder}`);
          appliedCount++;
          isApplied = true;
          break;
        } catch (err) {
          if (transaction) {
            await transaction.rollback().catch((rollbackError) => {
              console.error(
                `[TURSO DB INIT] Rollback failed for migration ${folder}:`,
                rollbackError.message || rollbackError
              );
            });
          }
          console.error(`[TURSO DB INIT] Error executing migration ${folder}:`, err.message || err);

          // If the transaction could not be rolled back, keep a durable failure record and
          // refuse automatic retries rather than trust CREATE TABLE IF NOT EXISTS to repair it.
          const failureMessage = String(err?.stack || err?.message || err).slice(0, 4000);
          await client.execute({
            sql: `UPDATE "_prisma_migrations"
                  SET "rolled_back_at" = CURRENT_TIMESTAMP, "logs" = ?
                  WHERE "id" = ?;`,
            args: [failureMessage, migrationId],
          }).catch((trackingError) => {
            console.error(
              `[TURSO DB INIT] Could not record failed migration state for ${folder}:`,
              trackingError.message || trackingError
            );
          });

          throw new Error(
            `Migration "${folder}" failed. Transaction rollback was attempted and the failure record was retained ` +
            `to prevent an unsafe automatic retry. Verify the target schema before rerunning. ` +
            `Original error: ${err?.message || err}`
          );
        }
      }
    }

    if (!isApplied) {
      throw new Error(`Failed to apply migration ${folder} after ${maxRetries} attempts.`);
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

// Robust cross-platform CLI entry point check (Linux, macOS, WSL, Windows)
function isMainModule() {
  if (!process.argv[1]) return false;
  try {
    const scriptPath = path.resolve(fileURLToPath(import.meta.url));
    const entryPath = path.resolve(process.argv[1]);
    return scriptPath === entryPath;
  } catch {
    return false;
  }
}

if (isMainModule()) {
  initTursoSchema()
    .then((res) => {
      console.log("[TURSO DB INIT] Completed successfully!", res);
      process.exit(0);
    })
    .catch((err) => {
      console.error("[TURSO DB INIT] Failed:", err.message || err);
      process.exit(1);
    });
}
