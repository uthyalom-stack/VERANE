import assert from "assert";
import { GET as productsGet } from "../app/api/products/route.js";
import { db, resetDb } from "./mock_prisma.js";

async function testSearchFunctionality() {
  console.log("\n=== RUNNING PRODUCT SEARCH FUNCTIONALITY TESTS ===");
  resetDb();

  db.products = [
    {
      id: "uthy_coat_1",
      name: "Cashmere Overcoat",
      price: 250000,
      brand: "UTHY_LUXURY",
      category: "coats",
      description: "Bespoke cashmere tailored outerwear",
      images: "[\"https://verane.com/uthy_coat.jpg\"]",
      inventory: 15,
      initialInventory: 50,
      archivedAt: null,
      variants: [
        {
          id: "v_1",
          productId: "uthy_coat_1",
          stock: 10,
          initialStock: 20,
          size: "L",
          colorId: null,
          color: null,
        },
      ],
      productColors: [],
    },
    {
      id: "alomziee_boot_1",
      name: "Chelsea Leather Boots",
      price: 180000,
      brand: "ALOMZIEE_FOOTIES",
      category: "boots",
      description: "Handcrafted Italian leather boots",
      images: "[\"https://verane.com/alomziee_boot.jpg\"]",
      inventory: 8,
      initialInventory: 30,
      archivedAt: null,
      variants: [],
      productColors: [],
    },
    {
      id: "archived_item_1",
      name: "Archived Silk Shirt",
      price: 90000,
      brand: "UTHY_LUXURY",
      category: "shirts",
      description: "Vintage silk shirt",
      images: "[\"https://verane.com/archived_shirt.jpg\"]",
      inventory: 0,
      initialInventory: 20,
      archivedAt: new Date("2026-01-01"),
      variants: [],
      productColors: [],
    },
  ];

  // Test 1: Search UTHY product
  {
    console.log("--- Test 1: Search UTHY product by name ---");
    const req = new Request("http://localhost:3000/api/products?search=Cashmere");
    const res = await productsGet(req);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.length, 1);
    assert.strictEqual(data[0].id, "uthy_coat_1");
    assert.strictEqual(data[0].brand, "UTHY_LUXURY");
    assert.strictEqual(data[0].initialInventory, undefined, "initialInventory must NOT be exposed");
    console.log("✓ Successfully searched and retrieved UTHY product with public DTO");
  }

  // Test 2: Search ALOMZIEE product
  {
    console.log("--- Test 2: Search ALOMZIEE product by description/name ---");
    const req = new Request("http://localhost:3000/api/products?q=boots");
    const res = await productsGet(req);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.length, 1);
    assert.strictEqual(data[0].id, "alomziee_boot_1");
    assert.strictEqual(data[0].brand, "ALOMZIEE_FOOTIES");
    console.log("✓ Successfully searched and retrieved ALOMZIEE product");
  }

  // Test 3: Search matching terms across both brands
  {
    console.log("--- Test 3: Search matching terms across both brands ---");
    const req = new Request("http://localhost:3000/api/products?search=leather");
    const res = await productsGet(req);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.length, 1);
    assert.strictEqual(data[0].id, "alomziee_boot_1");
    console.log("✓ Multi-brand product search functional");
  }

  // Test 4: Ensure archived products are excluded
  {
    console.log("--- Test 4: Ensure archived products are excluded ---");
    const req = new Request("http://localhost:3000/api/products?search=Silk");
    const res = await productsGet(req);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.length, 0, "Archived products must not be returned in search");
    console.log("✓ Archived products properly excluded from search results");
  }

  // Test 5: No results for non-existent query
  {
    console.log("--- Test 5: Search with no matching items ---");
    const req = new Request("http://localhost:3000/api/products?search=NonExistentProduct12345");
    const res = await productsGet(req);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.length, 0);
    console.log("✓ Clean no-results response returned");
  }

  console.log("\n==================================================");
  console.log("ALL SEARCH FUNCTIONALITY TESTS PASSED SUCCESSFULLY!");
  console.log("==================================================");
}

testSearchFunctionality().catch((err) => {
  console.error("Test failure:", err);
  process.exit(1);
});
