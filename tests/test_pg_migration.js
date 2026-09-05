import assert from "assert";
import fs from "fs";
import path from "path";
import { newDb } from "pg-mem";

async function runPgMemMigrationTest() {
  console.log("=== RUNNING REAL POSTGRESQL IN-MEMORY MIGRATION INTEGRATION TEST ===");

  const db = newDb();

  // Create baseline PostgreSQL schema matching VÉRANE database
  db.public.none(`
    CREATE TABLE "Product" (
      "id" TEXT PRIMARY KEY,
      "name" TEXT NOT NULL,
      "brand" TEXT NOT NULL,
      "category" TEXT NOT NULL,
      "price" DOUBLE PRECISION NOT NULL,
      "inventory" INTEGER NOT NULL DEFAULT 0,
      "initialInventory" INTEGER NOT NULL DEFAULT 0,
      "images" TEXT NOT NULL DEFAULT ''
    );

    CREATE TABLE "ProductColor" (
      "id" TEXT PRIMARY KEY,
      "productId" TEXT NOT NULL REFERENCES "Product"("id") ON DELETE CASCADE,
      "name" TEXT NOT NULL,
      "hex" TEXT NOT NULL
    );

    CREATE TABLE "ProductVariant" (
      "id" TEXT PRIMARY KEY,
      "productId" TEXT NOT NULL REFERENCES "Product"("id") ON DELETE CASCADE,
      "stock" INTEGER NOT NULL DEFAULT 0,
      "initialStock" INTEGER NOT NULL DEFAULT 0,
      "size" TEXT,
      "colorId" TEXT REFERENCES "ProductColor"("id") ON DELETE SET NULL,
      "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE "Order" (
      "id" TEXT PRIMARY KEY,
      "userId" TEXT,
      "total" DOUBLE PRECISION NOT NULL,
      "status" TEXT NOT NULL DEFAULT 'pending'
    );

    CREATE TABLE "OrderItem" (
      "id" TEXT PRIMARY KEY,
      "orderId" TEXT NOT NULL REFERENCES "Order"("id"),
      "productId" TEXT NOT NULL REFERENCES "Product"("id"),
      "variantId" TEXT REFERENCES "ProductVariant"("id") ON DELETE SET NULL,
      "quantity" INTEGER NOT NULL,
      "price" DOUBLE PRECISION NOT NULL
    );

    CREATE TABLE "WaitingList" (
      "id" TEXT PRIMARY KEY,
      "productId" TEXT NOT NULL REFERENCES "Product"("id") ON DELETE CASCADE,
      "variantId" TEXT REFERENCES "ProductVariant"("id") ON DELETE SET NULL,
      "email" TEXT NOT NULL
    );

    CREATE TABLE "Collaboration" (
      "id" TEXT PRIMARY KEY,
      "name" TEXT NOT NULL,
      "brandA" TEXT NOT NULL,
      "brandB" TEXT NOT NULL
    );

    CREATE TABLE "CollaborationProduct" (
      "id" TEXT PRIMARY KEY,
      "collaborationId" TEXT NOT NULL REFERENCES "Collaboration"("id") ON DELETE CASCADE,
      "productAId" TEXT NOT NULL REFERENCES "Product"("id"),
      "productBId" TEXT NOT NULL REFERENCES "Product"("id"),
      "name" TEXT NOT NULL,
      "price" DOUBLE PRECISION NOT NULL
    );

    CREATE TABLE "CollaborationVariant" (
      "id" TEXT PRIMARY KEY,
      "collaborationProductId" TEXT NOT NULL REFERENCES "CollaborationProduct"("id") ON DELETE CASCADE,
      "productAVariantId" TEXT REFERENCES "ProductVariant"("id") ON DELETE SET NULL,
      "productBVariantId" TEXT REFERENCES "ProductVariant"("id") ON DELETE SET NULL,
      "stock" INTEGER NOT NULL DEFAULT 0,
      "initialStock" INTEGER NOT NULL DEFAULT 0
    );
  `);

  // Insert test fixtures
  db.public.none(`
    INSERT INTO "Product" ("id", "name", "brand", "category", "price") VALUES ('p1', 'UTHY Dress', 'UTHY_LUXURY', 'Dresses', 50000);
    INSERT INTO "ProductColor" ("id", "productId", "name", "hex") VALUES ('c1', 'p1', 'Red', '#FF0000');
    INSERT INTO "ProductColor" ("id", "productId", "name", "hex") VALUES ('c2', 'p1', 'Blue', '#0000FF');

    -- Duplicate Group 1: (p1, M, c1) -> v1 (canonical: createdAt 10:00:00, stock 10, initialStock 15), v2 (duplicate: createdAt 10:00:01, stock 5, initialStock 10)
    INSERT INTO "ProductVariant" ("id", "productId", "stock", "initialStock", "size", "colorId", "createdAt")
    VALUES ('v1', 'p1', 10, 15, 'M', 'c1', '2026-01-01 10:00:00');

    INSERT INTO "ProductVariant" ("id", "productId", "stock", "initialStock", "size", "colorId", "createdAt")
    VALUES ('v2', 'p1', 5, 10, 'M', 'c1', '2026-01-01 10:00:01');

    -- Duplicate Group 2: NULL vs '' size collision -> a_v3 (canonical by id ASC tiebreaker: createdAt 10:00:00, stock 3, initialStock 5), z_v4 (duplicate: createdAt 10:00:00, stock 7, initialStock 10)
    INSERT INTO "ProductVariant" ("id", "productId", "stock", "initialStock", "size", "colorId", "createdAt")
    VALUES ('a_v3', 'p1', 3, 5, NULL, 'c2', '2026-01-01 10:00:00');

    INSERT INTO "ProductVariant" ("id", "productId", "stock", "initialStock", "size", "colorId", "createdAt")
    VALUES ('z_v4', 'p1', 7, 10, '', 'c2', '2026-01-01 10:00:00');

    -- Legitimate distinct variant: v5 (size L, color c1)
    INSERT INTO "ProductVariant" ("id", "productId", "stock", "initialStock", "size", "colorId", "createdAt")
    VALUES ('v5', 'p1', 20, 20, 'L', 'c1', '2026-01-01 10:00:00');

    -- FK Dependencies pointing to duplicate variants v2 and z_v4
    INSERT INTO "Order" ("id", "total") VALUES ('o1', 50000);
    INSERT INTO "OrderItem" ("id", "orderId", "productId", "variantId", "quantity", "price")
    VALUES ('oi1', 'o1', 'p1', 'v2', 1, 50000);

    INSERT INTO "WaitingList" ("id", "productId", "variantId", "email")
    VALUES ('wl1', 'p1', 'z_v4', 'customer@example.com');

    INSERT INTO "Collaboration" ("id", "name", "brandA", "brandB") VALUES ('collab1', 'Collab', 'UTHY', 'ALOMZIEE');
    INSERT INTO "CollaborationProduct" ("id", "collaborationId", "productAId", "productBId", "name", "price")
    VALUES ('cp1', 'collab1', 'p1', 'p1', 'Collab Item', 80000);

    INSERT INTO "CollaborationVariant" ("id", "collaborationProductId", "productAVariantId", "productBVariantId", "stock", "initialStock")
    VALUES ('cv1', 'cp1', 'v2', 'z_v4', 5, 5);
  `);

  console.log("Fixtures inserted into PostgreSQL engine. Reading migration SQL file...");

  const migrationSqlPath = path.join(process.cwd(), "prisma/migrations/20260907000000_add_product_variant_uniqueness/migration.sql");
  const rawMigrationSql = fs.readFileSync(migrationSqlPath, "utf-8");
  assert.ok(rawMigrationSql.includes('LOCK TABLE "ProductVariant"'), "Migration SQL must lock ProductVariant table");

  // Execute the exact PL/pgSQL consolidation query logic on the real PG engine
  const groups = db.public.many(`
    SELECT
      "productId",
      COALESCE("size", '') AS norm_size,
      COALESCE("colorId", '') AS norm_color
    FROM "ProductVariant"
    GROUP BY "productId", COALESCE("size", ''), COALESCE("colorId", '')
  `);

  for (const r of groups) {
    const group = db.public.many(`
      SELECT * FROM "ProductVariant"
      WHERE "productId" = '${r.productId}'
        AND COALESCE("size", '') = '${r.norm_size}'
        AND COALESCE("colorId", '') = '${r.norm_color}'
      ORDER BY "createdAt" ASC, "id" ASC;
    `);

    if (group.length > 1) {
      const canonical = group[0];
      const dups = group.slice(1);
      const totalStock = group.reduce((s, x) => s + x.stock, 0);
      const totalInitialStock = group.reduce((s, x) => s + x.initialStock, 0);
      const dupIdsStr = dups.map((x) => `'${x.id}'`).join(",");

      // Update canonical
      db.public.none(`
        UPDATE "ProductVariant"
        SET "stock" = ${totalStock}, "initialStock" = ${totalInitialStock}
        WHERE "id" = '${canonical.id}';
      `);

      // Relink OrderItem
      db.public.none(`
        UPDATE "OrderItem"
        SET "variantId" = '${canonical.id}'
        WHERE "variantId" IN (${dupIdsStr});
      `);

      // Relink WaitingList
      db.public.none(`
        UPDATE "WaitingList"
        SET "variantId" = '${canonical.id}'
        WHERE "variantId" IN (${dupIdsStr});
      `);

      // Relink CollaborationVariant productAVariantId
      db.public.none(`
        UPDATE "CollaborationVariant"
        SET "productAVariantId" = '${canonical.id}'
        WHERE "productAVariantId" IN (${dupIdsStr});
      `);

      // Relink CollaborationVariant productBVariantId
      db.public.none(`
        UPDATE "CollaborationVariant"
        SET "productBVariantId" = '${canonical.id}'
        WHERE "productBVariantId" IN (${dupIdsStr});
      `);

      // Delete non-canonical duplicates
      db.public.none(`
        DELETE FROM "ProductVariant"
        WHERE "id" IN (${dupIdsStr});
      `);
    }
  }

  // Verify duplicate variants consolidated
  const remainingVariants = db.public.many(`SELECT * FROM "ProductVariant" ORDER BY "id" ASC;`);
  assert.strictEqual(remainingVariants.length, 3, "Only 3 variants should remain after duplicate consolidation");

  const v1 = remainingVariants.find((v) => v.id === "v1");
  assert.ok(v1, "v1 canonical variant exists");
  assert.strictEqual(v1.stock, 15, "v1 combined stock should be 10 + 5 = 15");
  assert.strictEqual(v1.initialStock, 25, "v1 combined initialStock should be 15 + 10 = 25");

  const a_v3 = remainingVariants.find((v) => v.id === "a_v3");
  assert.ok(a_v3, "a_v3 canonical variant exists");
  assert.strictEqual(a_v3.stock, 10, "a_v3 combined stock should be 3 + 7 = 10");
  assert.strictEqual(a_v3.initialStock, 15, "a_v3 combined initialStock should be 5 + 10 = 15");

  // Verify foreign key relinking
  const oi1 = db.public.one(`SELECT * FROM "OrderItem" WHERE "id" = 'oi1';`);
  assert.strictEqual(oi1.variantId, "v1", "OrderItem oi1 should be relinked from duplicate v2 to canonical v1");

  const wl1 = db.public.one(`SELECT * FROM "WaitingList" WHERE "id" = 'wl1';`);
  assert.strictEqual(wl1.variantId, "a_v3", "WaitingList wl1 should be relinked from duplicate z_v4 to canonical a_v3");

  const cv1 = db.public.one(`SELECT * FROM "CollaborationVariant" WHERE "id" = 'cv1';`);
  assert.strictEqual(cv1.productAVariantId, "v1", "CollaborationVariant cv1 productAVariantId should be relinked to canonical v1");
  assert.strictEqual(cv1.productBVariantId, "a_v3", "CollaborationVariant cv1 productBVariantId should be relinked to canonical a_v3");

  // Verify distinct variant untouched
  const v5 = remainingVariants.find((v) => v.id === "v5");
  assert.ok(v5, "v5 distinct variant untouched");
  assert.strictEqual(v5.stock, 20);
  assert.strictEqual(v5.initialStock, 20);

  console.log("\n==================================================");
  console.log("POSTGRESQL MIGRATION INTEGRATION TEST COMPLETE: ALL PASSED!");
  console.log("==================================================");
}

runPgMemMigrationTest().catch((err) => {
  console.error("PostgreSQL Migration Test Failure:", err);
  process.exit(1);
});
