import assert from "node:assert";
import path from "node:path";
import fs from "node:fs";

const testDbPath = path.join(process.cwd(), "prisma/test_adapter_suite.db");
if (fs.existsSync(testDbPath)) {
  fs.unlinkSync(testDbPath);
}

process.env.TURSO_DATABASE_URL = `file:${testDbPath}`;

import { initTursoSchema } from "../scripts/init-turso-db.mjs";

async function runComprehensiveAdapterTest() {
  console.log("=== RUNNING COMPREHENSIVE TURSO SHARED CLIENT (lib/prisma.js) INTEGRATION TEST ===");

  await initTursoSchema();

  // Dynamically import lib/prisma.js AFTER setting TURSO_DATABASE_URL environment variable
  const { default: prisma } = await import("../lib/prisma.js");
  const { checkRateLimit, recordFailedAttempt, resetRateLimit } = await import("../lib/rate-limit.js");

  // 1. PRODUCTS & CATEGORIES & COLLECTIONS CRUD
  console.log("--- 1. Testing Products, Categories, Collections ---");
  const category = await prisma.category.create({
    data: { brand: "UTHY_LUXURY", name: "Formal Shirts", slug: "formal-shirts" },
  });
  assert.ok(category.id);

  const collection = await prisma.collection.create({
    data: { name: "Autumn Atelier 2026", brand: "UTHY_LUXURY" },
  });
  assert.ok(collection.id);

  const product = await prisma.product.create({
    data: {
      name: "Couture Silk Shirt",
      brand: "UTHY_LUXURY",
      category: "Formal Shirts",
      price: 85000.0,
      description: "Handcrafted Italian silk luxury shirt",
      images: JSON.stringify(["https://verane.app/img1.jpg"]),
      inventory: 20,
      initialInventory: 20,
      categoryId: category.id,
      collectionId: collection.id,
    },
  });
  assert.ok(product.id);

  // Search product
  const searchResults = await prisma.product.findMany({
    where: {
      archivedAt: null,
      AND: [{ name: { contains: "silk" } }],
    },
  });
  assert.strictEqual(searchResults.length, 1);
  assert.strictEqual(searchResults[0].id, product.id);

  // Update product
  const updatedProduct = await prisma.product.update({
    where: { id: product.id },
    data: { price: 90000.0 },
  });
  assert.strictEqual(updatedProduct.price, 90000.0);

  // 2. VARIANTS & COLORS
  console.log("--- 2. Testing Variants and Colors ---");
  const color = await prisma.productColor.create({
    data: { productId: product.id, name: "Emerald Green", hex: "#008000" },
  });

  const variant = await prisma.productVariant.create({
    data: {
      productId: product.id,
      colorId: color.id,
      size: "L",
      stock: 10,
      initialStock: 10,
    },
  });
  assert.ok(variant.id);

  // 3. CUSTOMER DATA (User, Address, Wishlist, Saved Looks, Waiting List)
  console.log("--- 3. Testing Customer User Data, Addresses, Wishlist ---");
  const user = await prisma.user.create({
    data: { email: "customer_test@verane.app", password: "hashed_password_123", name: "Atelier Client" },
  });

  const savedAddress = await prisma.savedAddress.create({
    data: {
      userId: user.id,
      fullName: "Atelier Client",
      phone: "+2348000000000",
      streetAddress: "123 Atelier Street",
      city: "Victoria Island",
      state: "Lagos",
      isDefault: true,
    },
  });
  assert.ok(savedAddress.id);

  const wishlist = await prisma.wishlist.create({
    data: { userId: user.id, productId: product.id },
  });
  assert.ok(wishlist.id);

  // 4. ORDERS & ORDER ITEMS & TRACKING
  console.log("--- 4. Testing Orders, Order Items, and Brand Tracking ---");
  const order = await prisma.order.create({
    data: {
      userId: user.id,
      orderNumber: "VERANE-TURSO-1001",
      total: 90000.0,
      shippingFee: 5000.0,
      paymentReference: "pay_ref_turso_1001",
      paymentStatus: "paid",
      status: "processing",
      items: {
        create: [
          {
            productId: product.id,
            variantId: variant.id,
            quantity: 1,
            price: 90000.0,
            selectedColor: "Emerald Green",
            selectedSize: "L",
          },
        ],
      },
      brandTrackings: {
        create: [
          { brand: "UTHY", status: "Processing" },
        ],
      },
    },
    include: { items: true, brandTrackings: true },
  });
  assert.strictEqual(order.items.length, 1);
  assert.strictEqual(order.brandTrackings.length, 1);

  // 5. CMS & SITE SETTINGS
  console.log("--- 5. Testing CMS Sections and Site Settings ---");
  const siteSetting = await prisma.siteSetting.create({
    data: { key: "pageContent", value: JSON.stringify([{ key: "about", content: "Atelier Story" }]) },
  });
  assert.ok(siteSetting.id);

  const homepageSection = await prisma.homepageSection.create({
    data: { key: "custom-banner", title: "AUTUMN CAPSULE", enabled: true },
  });
  assert.ok(homepageSection.id);

  // 6. COLLABORATIONS
  console.log("--- 6. Testing Collaborations & Requests ---");
  const collabRequest = await prisma.collaborationRequest.create({
    data: {
      fromBrand: "UTHY",
      toBrand: "ALOMZIEE",
      title: "Co-created Footwear & Garment",
      status: "pending",
    },
  });
  assert.ok(collabRequest.id);

  // 7. RATE LIMITING & ATOMIC UPSERT
  console.log("--- 7. Testing Rate Limiter Atomic Executions ---");
  const rateLimitKey = "test_ip_turso_adapter_1";
  const recorded = await recordFailedAttempt(rateLimitKey);
  assert.strictEqual(recorded.attempts, 1);

  const check = await checkRateLimit(rateLimitKey, { maxAttempts: 5 });
  assert.strictEqual(check.allowed, true);
  assert.strictEqual(check.remaining, 4);

  await resetRateLimit(rateLimitKey);

  // 8. CLEANUP FIXTURES
  console.log("--- 8. Clean up test records ---");
  await prisma.orderBrandTracking.deleteMany({ where: { orderId: order.id } });
  await prisma.orderItem.deleteMany({ where: { orderId: order.id } });
  await prisma.order.delete({ where: { id: order.id } });
  await prisma.wishlist.delete({ where: { id: wishlist.id } });
  await prisma.savedAddress.delete({ where: { id: savedAddress.id } });
  await prisma.user.delete({ where: { id: user.id } });
  await prisma.productVariant.delete({ where: { id: variant.id } });
  await prisma.productColor.delete({ where: { id: color.id } });
  await prisma.product.delete({ where: { id: product.id } });
  await prisma.collection.delete({ where: { id: collection.id } });
  await prisma.category.delete({ where: { id: category.id } });
  await prisma.siteSetting.delete({ where: { id: siteSetting.id } });
  await prisma.homepageSection.delete({ where: { id: homepageSection.id } });
  await prisma.collaborationRequest.delete({ where: { id: collabRequest.id } });

  console.log("\n==================================================");
  console.log("✓ ALL TURSO SHARED CLIENT ADAPTER TESTS PASSED!");
  console.log("==================================================\n");

  if (fs.existsSync(testDbPath)) {
    fs.unlinkSync(testDbPath);
  }
}

runComprehensiveAdapterTest().catch((err) => {
  console.error("❌ Shared client adapter test failed:", err);
  if (fs.existsSync(testDbPath)) {
    fs.unlinkSync(testDbPath);
  }
  process.exit(1);
});
