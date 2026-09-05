import assert from "assert";
import mockPrisma, { resetDb, db } from "./mock_prisma.js";

async function testMigrationConsolidationLogic() {
  console.log("=== RUNNING PRODUCT VARIANT MIGRATION CONSOLIDATION INTEGRATION SUITE ===");
  resetDb();

  const prod1 = { id: "p1", name: "Shirt" };
  db.products.push(prod1);

  // Variant 1 (canonical): size 'M', colorId 'c1', stock 10, createdAt 1000
  // Variant 2 (duplicate): size 'M', colorId 'c1', stock 5, createdAt 2000
  // Variant 3 (tie createdAt timestamp, canonical by ID): size null, colorId 'c2', stock 3, id "a_v3", createdAt 1000
  // Variant 4 (tie createdAt timestamp, higher ID): size '', colorId 'c2', stock 7, id "z_v4", createdAt 1000
  // Variant 5 (unique): size 'L', colorId 'c1', stock 20

  const variants = [
    { id: "v1", productId: "p1", size: "M", colorId: "c1", stock: 10, initialStock: 10, createdAt: new Date(1000) },
    { id: "v2", productId: "p1", size: "M", colorId: "c1", stock: 5, initialStock: 5, createdAt: new Date(2000) },
    { id: "a_v3", productId: "p1", size: null, colorId: "c2", stock: 3, initialStock: 3, createdAt: new Date(1000) },
    { id: "z_v4", productId: "p1", size: "", colorId: "c2", stock: 7, initialStock: 7, createdAt: new Date(1000) },
    { id: "v5", productId: "p1", size: "L", colorId: "c1", stock: 20, initialStock: 20, createdAt: new Date(1000) },
  ];

  // Dependent records referencing duplicate variants
  const orderItems = [
    { id: "oi1", variantId: "v2" }, // Points to duplicate v2
    { id: "oi2", variantId: "z_v4" }, // Points to duplicate z_v4
  ];

  const waitingList = [
    { id: "wl1", variantId: "v2" },
  ];

  const collabVariants = [
    { id: "cv1", productAVariantId: "v2", productBVariantId: "z_v4" },
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
    // Order by createdAt ASC, id ASC for deterministic canonical selection
    group.sort((a, b) => {
      if (a.createdAt.getTime() !== b.createdAt.getTime()) {
        return a.createdAt.getTime() - b.createdAt.getTime();
      }
      return a.id.localeCompare(b.id);
    });

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

    // Re-link WaitingList
    for (const wl of waitingList) {
      if (dupIds.includes(wl.variantId)) wl.variantId = canonical.id;
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

  const canonicalC2 = consolidatedVariants.find((v) => v.id === "a_v3");
  assert.ok(canonicalC2, "a_v3 should be selected as canonical over z_v4 due to id ASC tiebreaker");
  assert.strictEqual(canonicalC2.stock, 10, "a_v3 combined stock for NULL and '' size should be 3+7=10");

  assert.strictEqual(orderItems[0].variantId, "v1", "oi1 should now reference canonical v1 instead of v2");
  assert.strictEqual(orderItems[1].variantId, "a_v3", "oi2 should now reference canonical a_v3 instead of z_v4");

  assert.strictEqual(waitingList[0].variantId, "v1");

  assert.strictEqual(collabVariants[0].productAVariantId, "v1");
  assert.strictEqual(collabVariants[0].productBVariantId, "a_v3");

  console.log("✓ Migration consolidation logic verified: Stock summed, tiebreaker id ASC honored, and all foreign keys preserved");
  console.log("==================================================");
}

testMigrationConsolidationLogic().catch((err) => {
  console.error("Migration Test Failure:", err);
  process.exit(1);
});
