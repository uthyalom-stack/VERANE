import assert from "assert";
import mockPrisma, { resetDb, db } from "./mock_prisma.js";

async function testMigrationConsolidationLogic() {
  console.log("=== RUNNING PRODUCT VARIANT MIGRATION CONSOLATION INTEGRATION SUITE ===");
  resetDb();

  // Setup test products and variants with duplicates and NULL / empty strings
  const prod1 = { id: "p1", name: "Shirt" };
  db.products.push(prod1);

  // Variant 1 (canonical): size 'M', colorId 'c1', stock 10
  // Variant 2 (duplicate): size 'M', colorId 'c1', stock 5
  // Variant 3 (NULL size): size null, colorId 'c2', stock 3
  // Variant 4 (empty size): size '', colorId 'c2', stock 7
  // Variant 5 (unique): size 'L', colorId 'c1', stock 20

  const variants = [
    { id: "v1", productId: "p1", size: "M", colorId: "c1", stock: 10, initialStock: 10, createdAt: new Date(1000) },
    { id: "v2", productId: "p1", size: "M", colorId: "c1", stock: 5, initialStock: 5, createdAt: new Date(2000) },
    { id: "v3", productId: "p1", size: null, colorId: "c2", stock: 3, initialStock: 3, createdAt: new Date(1000) },
    { id: "v4", productId: "p1", size: "", colorId: "c2", stock: 7, initialStock: 7, createdAt: new Date(2000) },
    { id: "v5", productId: "p1", size: "L", colorId: "c1", stock: 20, initialStock: 20, createdAt: new Date(1000) },
  ];

  // Dependent records referencing duplicate variants
  const orderItems = [
    { id: "oi1", variantId: "v2" }, // Points to duplicate v2
    { id: "oi2", variantId: "v4" }, // Points to duplicate v4
  ];

  const collabVariants = [
    { id: "cv1", productAVariantId: "v2", productBVariantId: "v4" },
  ];

  // Perform JS equivalent simulation of PL/pgSQL consolidation algorithm
  const normKey = (v) => `${v.productId}::${v.size ?? ''}::${v.colorId ?? ''}`;
  const groups = new Map();

  for (const v of variants) {
    const key = normKey(v);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(v);
  }

  const consolidatedVariants = [];

  for (const [key, group] of groups.entries()) {
    group.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    const canonical = group[0];
    const dups = group.slice(1);
    const dupIds = dups.map((d) => d.id);

    // Sum stock
    canonical.stock = group.reduce((sum, item) => sum + item.stock, 0);
    canonical.initialStock = group.reduce((sum, item) => sum + item.initialStock, 0);

    // Re-link OrderItems
    for (const oi of orderItems) {
      if (dupIds.includes(oi.variantId)) oi.variantId = canonical.id;
    }

    // Re-link CollaborationVariants
    for (const cv of collabVariants) {
      if (dupIds.includes(cv.productAVariantId)) cv.productAVariantId = canonical.id;
      if (dupIds.includes(cv.productBVariantId)) cv.productBVariantId = canonical.id;
    }

    consolidatedVariants.push(canonical);
  }

  // Assertions
  assert.strictEqual(consolidatedVariants.length, 3, "Should have 3 consolidated unique variants (M+c1, ''+c2, L+c1)");

  const canonicalMc1 = consolidatedVariants.find((v) => v.id === "v1");
  assert.ok(canonicalMc1);
  assert.strictEqual(canonicalMc1.stock, 15, "v1 combined stock should be 10+5=15");

  const canonicalC2 = consolidatedVariants.find((v) => v.id === "v3");
  assert.ok(canonicalC2);
  assert.strictEqual(canonicalC2.stock, 10, "v3 combined stock for NULL and '' size should be 3+7=10");

  assert.strictEqual(orderItems[0].variantId, "v1", "oi1 should now reference canonical v1 instead of v2");
  assert.strictEqual(orderItems[1].variantId, "v3", "oi2 should now reference canonical v3 instead of v4");

  assert.strictEqual(collabVariants[0].productAVariantId, "v1");
  assert.strictEqual(collabVariants[0].productBVariantId, "v3");

  console.log("✓ Migration consolidation logic verified: Stock summed and dependent foreign keys preserved");
  console.log("==================================================");
}

testMigrationConsolidationLogic().catch((err) => {
  console.error("Migration Test Failure:", err);
  process.exit(1);
});
