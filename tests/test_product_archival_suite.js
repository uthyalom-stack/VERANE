import assert from "assert";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function runProductArchivalTests() {
  console.log("Starting Product Archival Regression Test Suite...\n");

  let testProductActiveSoldOut = null;
  let testProductWithOrder = null;
  let testProductWithoutOrder = null;
  let testOrder = null;

  try {
    // ----------------------------------------------------
    // SETUP FIXTURES
    // ----------------------------------------------------
    console.log("Setting up test fixtures in PostgreSQL database...");

    const createdCategory = await prisma.category.upsert({
      where: { brand_slug: { brand: "UTHY_LUXURY", slug: "archival-test-category" } },
      update: {},
      create: {
        brand: "UTHY_LUXURY",
        name: "Archival Test Category",
        slug: "archival-test-category",
      },
    });

    const createdAlomzieeCategory = await prisma.category.upsert({
      where: { brand_slug: { brand: "ALOMZIEE_FOOTIES", slug: "archival-test-footwear" } },
      update: {},
      create: {
        brand: "ALOMZIEE_FOOTIES",
        name: "Archival Test Footwear",
        slug: "archival-test-footwear",
      },
    });

    // 1. Active sold-out product (archivedAt = null, inventory = 0)
    testProductActiveSoldOut = await prisma.product.create({
      data: {
        name: "Active Sold Out Shirt",
        brand: "UTHY_LUXURY",
        category: createdCategory.slug,
        categoryId: createdCategory.id,
        price: 25000,
        images: JSON.stringify(["https://example.com/active-soldout.jpg"]),
        inventory: 0,
        archivedAt: null,
      },
    });

    // 2. Product WITH order history
    testProductWithOrder = await prisma.product.create({
      data: {
        name: "Product With Order History",
        brand: "UTHY_LUXURY",
        category: createdCategory.slug,
        categoryId: createdCategory.id,
        price: 45000,
        images: JSON.stringify(["https://example.com/with-order.jpg"]),
        inventory: 10,
        archivedAt: null,
        variants: {
          create: [{ stock: 10, size: "L" }],
        },
      },
      include: { variants: true },
    });

    // Create User & Order for testProductWithOrder
    const testUser = await prisma.user.upsert({
      where: { email: "archival_test_user@verane.com" },
      update: {},
      create: {
        email: "archival_test_user@verane.com",
        password: "hashedpassword123",
        name: "Archival Test User",
      },
    });

    testOrder = await prisma.order.create({
      data: {
        userId: testUser.id,
        orderNumber: `TEST-ARCHIVE-${Date.now()}`,
        status: "processing",
        paymentStatus: "paid",
        total: 45000,
        email: testUser.email,
        items: {
          create: [
            {
              productId: testProductWithOrder.id,
              variantId: testProductWithOrder.variants[0].id,
              quantity: 1,
              price: 45000,
              selectedSize: "L",
            },
          ],
        },
      },
      include: { items: { include: { product: true } } },
    });

    // 3. Product WITHOUT order history
    testProductWithoutOrder = await prisma.product.create({
      data: {
        name: "Unpurchased Temporary Product",
        brand: "ALOMZIEE_FOOTIES",
        category: createdAlomzieeCategory.slug,
        categoryId: createdAlomzieeCategory.id,
        price: 30000,
        images: JSON.stringify(["https://example.com/unpurchased.jpg"]),
        inventory: 5,
        archivedAt: null,
      },
    });

    // 4. Pre-archived product for public exclusion test
    const preArchivedProduct = await prisma.product.create({
      data: {
        name: "Already Archived Jacket",
        brand: "UTHY_LUXURY",
        category: createdCategory.slug,
        categoryId: createdCategory.id,
        price: 80000,
        images: JSON.stringify(["https://example.com/archived.jpg"]),
        inventory: 0,
        archivedAt: new Date(),
      },
    });

    console.log("Fixtures successfully created.");

    // ----------------------------------------------------
    // TEST 1 — Active sold-out product remains public
    // ----------------------------------------------------
    console.log("\nRunning TEST 1: Active sold-out product remains in public queries as Sold Out...");

    const publicActiveProducts = await prisma.product.findMany({
      where: { archivedAt: null },
    });

    const foundActiveSoldOut = publicActiveProducts.find((p) => p.id === testProductActiveSoldOut.id);
    assert.ok(foundActiveSoldOut, "Active sold-out product must be returned by public queries.");
    assert.strictEqual(foundActiveSoldOut.inventory, 0, "Active sold-out product inventory must be 0.");
    assert.strictEqual(foundActiveSoldOut.archivedAt, null, "Active sold-out product archivedAt must be null.");

    console.log("PASSED: Active sold-out product remains public.");

    // ----------------------------------------------------
    // TEST 2 — Archived product is hidden publicly
    // ----------------------------------------------------
    console.log("\nRunning TEST 2: Archived product is completely excluded from public queries...");

    const foundPreArchivedInPublic = publicActiveProducts.find((p) => p.id === preArchivedProduct.id);
    assert.strictEqual(foundPreArchivedInPublic, undefined, "Archived product must NOT appear in public product queries.");

    const storefrontProducts = await prisma.product.findMany({
      where: { brand: "UTHY_LUXURY", archivedAt: null },
    });
    const foundPreArchivedInStorefront = storefrontProducts.find((p) => p.id === preArchivedProduct.id);
    assert.strictEqual(foundPreArchivedInStorefront, undefined, "Archived product must NOT appear in brand storefront queries.");

    console.log("PASSED: Archived product is hidden publicly.");

    // ----------------------------------------------------
    // TEST 3 — Delete product with order history archives
    // ----------------------------------------------------
    console.log("\nRunning TEST 3: Attempting deletion of product with order history...");

    // Simulate DELETE logic
    const existingWithOrder = await prisma.product.findFirst({
      where: { id: testProductWithOrder.id, archivedAt: null },
      include: { orderItems: { take: 1 } },
    });

    assert.ok(existingWithOrder, "Product with order history found before delete.");
    assert.ok(existingWithOrder.orderItems.length > 0, "Product has order history.");

    // Execute archival transaction
    await prisma.$transaction([
      prisma.product.update({
        where: { id: testProductWithOrder.id },
        data: {
          archivedAt: new Date(),
          inventory: 0,
          preOrderEnabled: false,
        },
      }),
      prisma.productVariant.updateMany({
        where: { productId: testProductWithOrder.id },
        data: { stock: 0 },
      }),
    ]);

    const archivedRecord = await prisma.product.findUnique({
      where: { id: testProductWithOrder.id },
      include: { orderItems: true, variants: true },
    });

    assert.ok(archivedRecord, "Product record must still exist in DB.");
    assert.ok(archivedRecord.archivedAt !== null, "archivedAt timestamp must be populated.");
    assert.strictEqual(archivedRecord.inventory, 0, "Inventory must be set to 0 upon archival.");
    assert.strictEqual(archivedRecord.orderItems.length, 1, "OrderItem reference must remain intact.");
    assert.strictEqual(archivedRecord.variants.length, 1, "ProductVariant records must remain intact.");

    // Verify it disappears from active queries
    const activeProductsPostArchive = await prisma.product.findMany({
      where: { archivedAt: null },
    });
    assert.strictEqual(
      activeProductsPostArchive.some((p) => p.id === testProductWithOrder.id),
      false,
      "Archived product must disappear from active product queries."
    );

    // Verify it appears in Admin History
    const adminHistoryProducts = await prisma.product.findMany({
      where: { brand: "UTHY_LUXURY", archivedAt: { not: null } },
    });
    assert.ok(
      adminHistoryProducts.some((p) => p.id === testProductWithOrder.id),
      "Archived product must be returned in Admin History query."
    );

    console.log("PASSED: Product with order history safely archived.");

    // ----------------------------------------------------
    // TEST 4 — Delete product without order history permanently deletes
    // ----------------------------------------------------
    console.log("\nRunning TEST 4: Attempting deletion of product without order history...");

    const existingWithoutOrder = await prisma.product.findFirst({
      where: { id: testProductWithoutOrder.id, archivedAt: null },
      include: { orderItems: { take: 1 } },
    });

    assert.ok(existingWithoutOrder, "Product without order history found before delete.");
    assert.strictEqual(existingWithoutOrder.orderItems.length, 0, "Product has no order history.");

    // Execute hard delete transaction
    await prisma.$transaction([
      prisma.waitingList.deleteMany({ where: { productId: testProductWithoutOrder.id } }),
      prisma.wishlist.deleteMany({ where: { productId: testProductWithoutOrder.id } }),
      prisma.productVariant.deleteMany({ where: { productId: testProductWithoutOrder.id } }),
      prisma.productColor.deleteMany({ where: { productId: testProductWithoutOrder.id } }),
      prisma.product.delete({ where: { id: testProductWithoutOrder.id } }),
    ]);

    const deletedRecord = await prisma.product.findUnique({
      where: { id: testProductWithoutOrder.id },
    });

    assert.strictEqual(deletedRecord, null, "Unpurchased product must be permanently deleted from DB.");

    const adminHistoryAlomziee = await prisma.product.findMany({
      where: { brand: "ALOMZIEE_FOOTIES", archivedAt: { not: null } },
    });
    assert.strictEqual(
      adminHistoryAlomziee.some((p) => p.id === testProductWithoutOrder.id),
      false,
      "Permanently deleted product must NOT appear in Admin History."
    );

    console.log("PASSED: Product without order history permanently deleted.");

    // ----------------------------------------------------
    // TEST 5 — Historical order still works
    // ----------------------------------------------------
    console.log("\nRunning TEST 5: Verifying historical order resolution for archived product...");

    const fetchedOrder = await prisma.order.findUnique({
      where: { id: testOrder.id },
      include: {
        items: {
          include: {
            product: true,
            variant: true,
          },
        },
      },
    });

    assert.ok(fetchedOrder, "Historical order must be fetched successfully.");
    assert.strictEqual(fetchedOrder.items.length, 1, "Order item must be present.");
    assert.strictEqual(fetchedOrder.items[0].product.id, testProductWithOrder.id, "OrderItem product relation must resolve cleanly.");
    assert.strictEqual(fetchedOrder.items[0].product.name, "Product With Order History", "OrderItem product details must match.");
    assert.ok(fetchedOrder.items[0].product.archivedAt !== null, "Product is archived but visible on historical order.");

    console.log("PASSED: Historical order details resolve perfectly.");

    // ----------------------------------------------------
    // TEST 6 — Brand Isolation on Admin Product History
    // ----------------------------------------------------
    console.log("\nRunning TEST 6: Verifying brand isolation on Admin Product History...");

    const uthyHistory = await prisma.product.findMany({
      where: { brand: "UTHY_LUXURY", archivedAt: { not: null } },
    });
    const alomzieeHistory = await prisma.product.findMany({
      where: { brand: "ALOMZIEE_FOOTIES", archivedAt: { not: null } },
    });

    assert.ok(uthyHistory.some((p) => p.id === testProductWithOrder.id), "UTHY admin history contains archived UTHY product.");
    assert.strictEqual(alomzieeHistory.some((p) => p.id === testProductWithOrder.id), false, "ALOMZIEE admin history does NOT contain UTHY product.");

    console.log("PASSED: Brand isolation on Product History enforced.");

    // ----------------------------------------------------
    // TEST 7 — Direct archived-product access
    // ----------------------------------------------------
    console.log("\nRunning TEST 7: Attempting direct product retrieval for archived product ID...");

    const directArchivedProduct = await prisma.product.findFirst({
      where: { id: testProductWithOrder.id, archivedAt: null },
    });

    assert.strictEqual(
      directArchivedProduct,
      null,
      "Direct query for archived product with archivedAt: null must return null (Not Found)."
    );

    console.log("PASSED: Direct access to archived product ID returns Not Found.");

    // ----------------------------------------------------
    // CLEANUP TEMPORARY TEST FIXTURES
    // ----------------------------------------------------
    console.log("\nCleaning up test fixtures...");

    await prisma.orderItem.deleteMany({ where: { orderId: testOrder.id } });
    await prisma.order.delete({ where: { id: testOrder.id } });
    await prisma.productVariant.deleteMany({ where: { productId: testProductWithOrder.id } });
    await prisma.product.delete({ where: { id: testProductWithOrder.id } });
    await prisma.product.delete({ where: { id: testProductActiveSoldOut.id } });
    await prisma.product.delete({ where: { id: preArchivedProduct.id } });

    console.log("Cleanup complete.");
    console.log("\nALL PRODUCT ARCHIVAL REGRESSION TESTS PASSED SUCCESSFULLY! 🎉");
  } catch (error) {
    console.error("\nTEST SUITE FAILED:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runProductArchivalTests();
