import { PrismaClient } from "@prisma/client";
import { PrismaLibSQL } from "@prisma/adapter-libsql";
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

  // Double check to ensure postgresql connection string is never passed to libSQL client
  if (url.startsWith("postgres://") || url.startsWith("postgresql://")) {
    throw new Error(
      "PostgreSQL connection strings (including Neon URLs) are not supported by libSQL adapter. " +
      "Please set TURSO_DATABASE_URL to a valid libsql:// or https:// URL or local file: path."
    );
  }

  const authToken = process.env.TURSO_AUTH_TOKEN || undefined;
  return { url, authToken };
}

function createPrismaClient() {
  const { url, authToken } = resolveConnectionConfig();

  const libsql = createClient({
    url,
    authToken,
  });

  const adapter = new PrismaLibSQL(libsql);
  return new PrismaClient({ adapter });
}

const prisma = global.prisma || createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  global.prisma = prisma;
}

export default prisma;
