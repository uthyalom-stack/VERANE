import { PrismaClient } from "@prisma/client";
import { PrismaLibSQL } from "@prisma/adapter-libsql";
import { createClient } from "@libsql/client";

function createPrismaClient() {
  const connectionUrl =
    process.env.TURSO_DATABASE_URL ||
    process.env.DATABASE_URL ||
    "file:./dev.db";

  const authToken = process.env.TURSO_AUTH_TOKEN || undefined;

  // If using libSQL remote URL (libsql:// or https:// or wss://) or explicit file: via driver adapter
  const libsql = createClient({
    url: connectionUrl,
    authToken: authToken,
  });

  const adapter = new PrismaLibSQL(libsql);
  return new PrismaClient({ adapter });
}

const prisma = global.prisma || createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  global.prisma = prisma;
}

export default prisma;
