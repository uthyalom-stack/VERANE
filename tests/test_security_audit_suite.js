import assert from "assert";
import { POST as subscribePost } from "../app/api/subscribe/route.js";
import { POST as orderPost } from "../app/api/orders/route.js";
import { GET as productsGet } from "../app/api/products/route.js";
import { GET as collaborationsGet } from "../app/api/collaborations/route.js";
import { db } from "./mock_prisma.js";

async function testDisabledOrderCreation() {
  console.log("\n--- TEST 1: Disabled Direct Order Creation (POST /api/orders) ---");
  const res = await orderPost();
  assert.strictEqual(res.status, 403, "Direct order creation must return 403 Forbidden");
  const data = await res.json();
  assert.strictEqual(data.success, false);
  assert.ok(data.error.includes("Direct order creation is disabled"));
  console.log("✓ POST /api/orders returns 403 Forbidden and prevents direct order creation");
}

async function testSubscriberValidation() {
  console.log("\n--- TEST 2: Subscriber Email Length & Format Validation ---");

  // Test 2a: Oversized Email (> 254 chars)
  const longEmail = "a".repeat(250) + "@domain.com";
  const formDataLong = new FormData();
  formDataLong.append("email", longEmail);
  const reqLong = new Request("http://localhost:3000/api/subscribe", {
    method: "POST",
    body: formDataLong,
  });
  const resLong = await subscribePost(reqLong);
  assert.strictEqual(resLong.status, 307);
  assert.ok(resLong.headers.get("location").includes("subscribed=error"));
  console.log("✓ Oversized email (>254 chars) rejected with subscribed=error redirect");

  // Test 2b: Invalid Email Format
  const formDataInvalid = new FormData();
  formDataInvalid.append("email", "invalid-email-string");
  const reqInvalid = new Request("http://localhost:3000/api/subscribe", {
    method: "POST",
    body: formDataInvalid,
  });
  const resInvalid = await subscribePost(reqInvalid);
  assert.strictEqual(resInvalid.status, 307);
  assert.ok(resInvalid.headers.get("location").includes("subscribed=error"));
  console.log("✓ Malformed email string rejected with subscribed=error redirect");
}

async function testPublicProductsDto() {
  console.log("\n--- TEST 3: Public Products DTO (GET /api/products) ---");
  db.products = [
    {
      id: "prod_123",
      name: "Luxury Silk Dress",
      price: 150000,
      brand: "UTHY_LUXURY",
      category: "dresses",
      description: "Silk dress",
      images: "[\"https://verane.com/dress.jpg\"]",
      inventory: 10,
      initialInventory: 50,
      preOrderEnabled: false,
      customSizingEnabled: false,
      productColors: [{ id: "c1", name: "Gold", hex: "#D4AF37" }],
      variants: [
        {
          id: "v1",
          productId: "prod_123",
          stock: 5,
          initialStock: 25,
          size: "M",
          colorId: "c1",
          color: { id: "c1", name: "Gold", hex: "#D4AF37" },
        },
      ],
    },
  ];

  const res = await productsGet();
  assert.strictEqual(res.status, 200, "GET /api/products must return 200 OK");
  const products = await res.json();
  assert.ok(Array.isArray(products), "Products response must be an array");
  assert.strictEqual(products.length, 1);

  const p = products[0];
  assert.strictEqual(p.initialInventory, undefined, "initialInventory must NOT be exposed");
  assert.strictEqual(p.variants[0].initialStock, undefined, "initialStock must NOT be exposed");
  assert.strictEqual(p.variants[0].stock, 5);
  console.log("✓ GET /api/products returns public DTOs without exposing initialInventory or initialStock");
}

async function testPublicCollaborationsDto() {
  console.log("\n--- TEST 4: Public Collaborations DTO (GET /api/collaborations) ---");
  db.collaborations = [
    {
      id: "collab_1",
      name: "Capsule Drop",
      description: "Co-created piece",
      brandA: "UTHY",
      brandB: "ALOMZIEE",
      status: "active",
      products: [
        {
          id: "cp_1",
          collaborationId: "collab_1",
          productAId: "pA",
          productBId: "pB",
          name: "Collaborative Coat",
          description: "Coat",
          price: 250000,
          images: "[]",
          status: "published",
          initialInventory: 100,
          productA: {
            id: "pA",
            name: "Coat Base",
            brand: "UTHY",
            price: 150000,
            initialInventory: 50,
            productColors: [],
            variants: [{ id: "va1", productId: "pA", stock: 10, initialStock: 30 }],
          },
          productB: null,
          variants: [
            {
              id: "cv_1",
              collaborationProductId: "cp_1",
              stock: 3,
              initialStock: 15,
              productASize: "L",
            },
          ],
        },
      ],
    },
  ];

  const res = await collaborationsGet();
  assert.strictEqual(res.status, 200, "GET /api/collaborations must return 200 OK");
  const data = await res.json();
  assert.strictEqual(data.success, true);
  assert.ok(Array.isArray(data.collaborations));

  const cp = data.collaborations[0].products[0];
  assert.strictEqual(cp.initialInventory, undefined);
  assert.strictEqual(cp.productA.initialInventory, undefined);
  assert.strictEqual(cp.variants[0].initialStock, undefined);
  assert.strictEqual(cp.variants[0].stock, undefined);
  assert.strictEqual(cp.variants[0].isAvailable, true);
  console.log("✓ GET /api/collaborations returns public DTOs without exposing internal baseline inventory metadata");
}

async function runAllSecurityAuditTests() {
  console.log("=== RUNNING VÉRANE SECURITY AUDIT REGRESSION SUITE ===");
  try {
    await testDisabledOrderCreation();
    await testSubscriberValidation();
    await testPublicProductsDto();
    await testPublicCollaborationsDto();
    console.log("\n==================================================");
    console.log("ALL VÉRANE SECURITY AUDIT TESTS PASSED SUCCESSFULLY!");
    console.log("==================================================");
  } catch (err) {
    console.error("\nTEST SUITE FAILURE:", err);
    process.exit(1);
  }
}

runAllSecurityAuditTests();
