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

  const { default: prisma } = await import("../lib/prisma.js");
  const { checkRateLimit, recordFailedAttempt, resetRateLimit } = await import("../lib/rate-limit.js");

  // 1. PRODUCTS & CATEGORIES & COLLECTIONS CRUD & CASE-INSENSITIVE SEARCH
  console.log("--- 1. Testing Products, Categories, Collections & Search Parity ---");
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
      name: "COUTURE SILK SHIRT",
      brand: "UTHY_LUXURY",
      category: "Formal Shirts",
      price: 85000.0,
      description: "Handcrafted Italian Silk Luxury Shirt",
      images: JSON.stringify(["https://verane.app/img1.jpg"]),
      style: "High Fashion",
      occasion: "Gala Night",
      inventory: 20,
      initialInventory: 20,
      categoryId: category.id,
      collectionId: collection.id,
    },
  });
  assert.ok(product.id);

  // Search assertions (lowercase, uppercase, mixed-case, description, style, occasion, relations)
  const lowerResults = await prisma.product.findMany({
    where: { archivedAt: null, AND: [{ name: { contains: "couture" } }] },
  });
  assert.strictEqual(lowerResults.length, 1, "Lowercase search against uppercase name failed");

  const upperResults = await prisma.product.findMany({
    where: { archivedAt: null, AND: [{ description: { contains: "ITALIAN" } }] },
  });
  assert.strictEqual(upperResults.length, 1, "Uppercase search against mixed-case description failed");

  const relationResults = await prisma.product.findMany({
    where: {
      archivedAt: null,
      OR: [
        { categoryRef: { name: { contains: "formal" } } },
        { collection: { name: { contains: "autumn atelier" } } },
      ],
    },
  });
  assert.strictEqual(relationResults.length, 1, "Relation search failed");

  // 2. DISCOUNT CRUD
  console.log("--- 2. Testing Discount CRUD ---");
  const discount = await prisma.discount.create({
    data: {
      code: "ATELIER10",
      name: "Atelier Inaugural 10%",
      type: "percentage",
      value: 10.0,
      brand: "UTHY",
      enabled: true,
    },
  });
  assert.ok(discount.id);
  assert.strictEqual(discount.code, "ATELIER10");

  const fetchedDiscount = await prisma.discount.findUnique({
    where: { code: "ATELIER10" },
  });
  assert.ok(fetchedDiscount);

  // 3. VARIANTS, COLORS & PRODUCT VARIANT UNIQUENESS CONSTRAINT
  console.log("--- 3. Testing Variants, Colors & ProductVariant Uniqueness Constraint ---");
  const color = await prisma.productColor.create({
    data: { productId: product.id, name: "Emerald Green", hex: "#008000" },
  });

  const variant1 = await prisma.productVariant.create({
    data: {
      productId: product.id,
      colorId: color.id,
      size: "L",
      stock: 10,
      initialStock: 10,
    },
  });
  assert.ok(variant1.id);

  // Assert duplicate ProductVariant (same productId + normalized size + normalized colorId) fails
  try {
    await prisma.$executeRaw`
      INSERT INTO "ProductVariant" ("id", "productId", "size", "colorId", "stock", "initialStock", "createdAt")
      VALUES ('dup_v_1', ${product.id}, 'L', ${color.id}, 5, 5, CURRENT_TIMESTAMP);
    `;
    assert.fail("Should have thrown UNIQUE constraint violation for duplicate ProductVariant");
  } catch (err) {
    assert.ok(
      err.message.includes("UNIQUE constraint failed") || err.message.includes("ProductVariant_productId_size_colorId_key"),
      `Expected UNIQUE constraint error, got: ${err.message}`
    );
    console.log("  ✓ ProductVariant uniqueness constraint correctly enforced in SQLite");
  }

  // 4. WAITING LIST & PRODUCT ARCHIVAL
  console.log("--- 4. Testing WaitingList and Product Archival ---");
  const waitingList = await prisma.waitingList.create({
    data: {
      productId: product.id,
      variantId: variant1.id,
      email: "waiting@example.com",
      selectedColor: "Emerald Green",
      selectedSize: "L",
    },
  });
  assert.ok(waitingList.id);

  // Product Archival test
  const archivedProduct = await prisma.product.update({
    where: { id: product.id },
    data: { archivedAt: new Date(), inventory: 0 },
  });
  assert.ok(archivedProduct.archivedAt);

  const activePublicProducts = await prisma.product.findMany({
    where: { archivedAt: null },
  });
  assert.strictEqual(activePublicProducts.length, 0, "Archived product should not appear in active queries");

  // Restore for subsequent test relations
  await prisma.product.update({
    where: { id: product.id },
    data: { archivedAt: null, inventory: 20 },
  });

  // 5. CUSTOMER DATA (User, Address, Wishlist, Saved Looks)
  console.log("--- 5. Testing Customer User Data, Addresses, Wishlist, Saved Looks ---");
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

  const savedLook = await prisma.savedLook.create({
    data: { userId: user.id, products: JSON.stringify([product.id]) },
  });
  assert.ok(savedLook.id);

  // 6. ORDERS, ORDER ITEMS, BRAND TRACKING & ATTRIBUTION
  console.log("--- 6. Testing Orders, Order Items, Brand Tracking & Order Attribution ---");
  const order = await prisma.order.create({
    data: {
      userId: user.id,
      orderNumber: "VERANE-TURSO-2001",
      total: 90000.0,
      shippingFee: 5000.0,
      paymentReference: "pay_ref_turso_2001",
      paymentStatus: "paid",
      status: "processing",
      items: {
        create: [
          {
            productId: product.id,
            variantId: variant1.id,
            quantity: 1,
            price: 90000.0,
            selectedColor: "Emerald Green",
            selectedSize: "L",
          },
        ],
      },
      brandTrackings: {
        create: [{ brand: "UTHY", status: "Processing" }],
      },
    },
    include: { items: true, brandTrackings: true },
  });
  assert.strictEqual(order.items.length, 1);
  assert.strictEqual(order.brandTrackings.length, 1);

  // 7. CAMPAIGNS, CAMPAIGN VISITS & ORDER ATTRIBUTION
  console.log("--- 7. Testing Campaigns, Campaign Visits & Order Attribution ---");
  const campaign = await prisma.campaign.create({
    data: {
      brand: "UTHY",
      name: "Autumn Launch 2026",
      slug: "uthy-autumn-launch",
      destination: "/catalog",
    },
  });
  assert.ok(campaign.id);

  const campaignVisit = await prisma.campaignVisit.create({
    data: {
      campaignId: campaign.id,
      brand: "UTHY",
      visitorId: "v_visit_12345",
      destination: "/catalog",
    },
  });
  assert.ok(campaignVisit.id);

  const orderAttr = await prisma.orderAttribution.create({
    data: {
      orderId: order.id,
      campaignId: campaign.id,
      brand: "UTHY",
      visitorId: "v_visit_12345",
    },
  });
  assert.ok(orderAttr.id);

  // 8. COLLABORATIONS & ADMIN NOTIFICATIONS
  console.log("--- 8. Testing Collaborations, Collaboration Products/Variants & Notifications ---");
  const collabRequest = await prisma.collaborationRequest.create({
    data: {
      fromBrand: "UTHY",
      toBrand: "ALOMZIEE",
      title: "Co-created Footwear & Garment",
      status: "pending",
    },
  });
  assert.ok(collabRequest.id);

  const adminNotif = await prisma.adminNotification.create({
    data: {
      recipientBrand: "ALOMZIEE",
      type: "COLLABORATION_REQUEST",
      title: "New Collaboration Request",
      message: "UTHY LUXURY wants to collaborate",
      requestId: collabRequest.id,
    },
  });
  assert.ok(adminNotif.id);

  // 9. CMS & SITE SETTINGS
  console.log("--- 9. Testing CMS Sections and Site Settings ---");
  const siteSetting = await prisma.siteSetting.create({
    data: { key: "pageContent", value: JSON.stringify([{ key: "about", content: "Atelier Story" }]) },
  });
  assert.ok(siteSetting.id);

  const homepageSection = await prisma.homepageSection.create({
    data: { key: "custom-banner", title: "AUTUMN CAPSULE", enabled: true },
  });
  assert.ok(homepageSection.id);

  // 10. RATE LIMITING & ATOMIC UPSERT
  console.log("--- 10. Testing Rate Limiter Atomic Executions ---");
  const rateLimitKey = "test_ip_turso_adapter_1";
  const recorded = await recordFailedAttempt(rateLimitKey);
  assert.strictEqual(recorded.attempts, 1);

  const check = await checkRateLimit(rateLimitKey, { maxAttempts: 5 });
  assert.strictEqual(check.allowed, true);
  assert.strictEqual(check.remaining, 4);

  await resetRateLimit(rateLimitKey);

  // 11. CLEANUP FIXTURES
  console.log("--- 11. Clean up test records ---");
  await prisma.orderAttribution.delete({ where: { id: orderAttr.id } });
  await prisma.campaignVisit.delete({ where: { id: campaignVisit.id } });
  await prisma.campaign.delete({ where: { id: campaign.id } });
  await prisma.orderBrandTracking.deleteMany({ where: { orderId: order.id } });
  await prisma.orderItem.deleteMany({ where: { orderId: order.id } });
  await prisma.order.delete({ where: { id: order.id } });
  await prisma.wishlist.delete({ where: { id: wishlist.id } });
  await prisma.savedLook.delete({ where: { id: savedLook.id } });
  await prisma.savedAddress.delete({ where: { id: savedAddress.id } });
  await prisma.user.delete({ where: { id: user.id } });
  await prisma.waitingList.delete({ where: { id: waitingList.id } });
  await prisma.productVariant.delete({ where: { id: variant1.id } });
  await prisma.productColor.delete({ where: { id: color.id } });
  await prisma.product.delete({ where: { id: product.id } });
  await prisma.collection.delete({ where: { id: collection.id } });
  await prisma.category.delete({ where: { id: category.id } });
  await prisma.discount.delete({ where: { id: discount.id } });
  await prisma.siteSetting.delete({ where: { id: siteSetting.id } });
  await prisma.homepageSection.delete({ where: { id: homepageSection.id } });
  await prisma.adminNotification.delete({ where: { id: adminNotif.id } });
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
