import fs from "fs";
import path from "path";
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

  console.log(`[TURSO DB INIT] Found ${migrationFolders.length} migration folder(s):`, migrationFolders);

  for (const folder of migrationFolders) {
    const sqlPath = path.join(migrationsDir, folder, "migration.sql");
    if (fs.existsSync(sqlPath)) {
      console.log(`[TURSO DB INIT] Applying migration script: ${folder}/migration.sql ...`);
      const sql = fs.readFileSync(sqlPath, "utf-8");

      try {
        await client.executeMultiple(sql);
        console.log(`[TURSO DB INIT] Successfully applied migration: ${folder}`);
      } catch (err) {
        console.error(`[TURSO DB INIT] Error executing migration ${folder}:`, err.message || err);
        throw err;
      }
    }
  }

  // Verify core tables created
  const tablesResult = await client.execute("SELECT name FROM sqlite_master WHERE type='table';");
  const tableNames = tablesResult.rows.map((row) => String(row.name));
  console.log(`[TURSO DB INIT] Total tables verified in target database: ${tableNames.length}`);
  console.log("[TURSO DB INIT] Tables list:", tableNames);

  return { success: true, tablesCount: tableNames.length, tableNames };
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
