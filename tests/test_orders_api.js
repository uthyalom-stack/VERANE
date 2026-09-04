import crypto from "crypto";
import path from "path";
import { pathToFileURL } from "url";

// Set required CUSTOMER_AUTH_SECRET for test environment
const originalSecretEnv = process.env.CUSTOMER_AUTH_SECRET;
process.env.CUSTOMER_AUTH_SECRET = "test-secret-key-1234567890-super-secure";

const repoRoot = process.cwd();

// Dynamic imports using pathToFileURL
const customerAuthPath = pathToFileURL(path.join(repoRoot, "lib/auth/customer.js")).href;
const mockHeadersPath = pathToFileURL(path.join(repoRoot, "tests/mock_next_headers.js")).href;
const mockPrismaPath = pathToFileURL(path.join(repoRoot, "tests/mock_prisma.js")).href;
const ordersRoutePath = pathToFileURL(path.join(repoRoot, "app/api/orders/route.js")).href;

const {
  hashPassword,
  createCustomerSession,
  getCustomerCookieName,
} = await import(customerAuthPath);

const { setTestCookie, clearTestCookies, getTestCookie } = await import(mockHeadersPath);
const { db, resetDb } = await import(mockPrismaPath);
const { POST: postOrder } = await import(ordersRoutePath);

/**
 * Creates a request with mocked cookie and json body access for testing.
 * @param {string} url - The request URL.
 * @param {RequestInit} [options] - Request initialization options.
 * @return {Request} The configured request.
 */
function makeRequest(url, options = {}) {
  const req = new Request(url, options);
  req.cookies = {
    get: (name) => getTestCookie(name),
  };
  return req;
}

export async function runOrdersApiServerAuthoritativeTests() {
  console.log("=== RUNNING VÉRANE /api/orders SERVER-AUTHORITATIVE FINANCIAL TESTS ===\n");
  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`✓ [PASS] ${message}`);
      passed++;
    } else {
      console.error(`✗ [FAIL] ${message}`);
      failed++;
    }
  }

  resetDb();

  const timestamp = Date.now();
  const userA = {
    id: `usr_${timestamp}`,
    name: "Customer Security Tester",
    email: `tester_${timestamp}@example.com`,
    password: hashPassword("Secret123!"),
  };
  db.users.push(userA);

  // Seed DB Products & Delivery State
  const prod1 = {
    id: "prod_luxury_shoe",
    name: "VÉRANE Luxury Heels",
    price: 150000, // ₦150,000 DB Price
    inventory: 20,
    preOrderEnabled: false,
  };
  const variant1 = {
    id: "var_shoe_red_38",
    productId: "prod_luxury_shoe",
    stock: 10,
  };

  const collabProd = {
    id: "collab_bag_gold",
    name: "VÉRANE x Brand Bag",
    price: 250000, // ₦250,000 DB Price
    status: "published",
    productAId: "prod_luxury_shoe",
  };
  const collabVariant = {
    id: "collab_var_bag_gold_std",
    collaborationProductId: "collab_bag_gold",
    stock: 5,
  };

  db.products.push(prod1);
  db.productVariants.push(variant1);
  db.collaborationProducts.push(collabProd);
  db.collaborationVariants.push(collabVariant);

  db.deliveryStates.push({
    id: "ds_lagos",
    state: "Lagos",
    enabled: true,
    pricingMode: "STATE_DEFAULT",
    defaultFee: 5000, // ₦5,000 Lagos delivery fee
    cities: [],
  });

  const sessionToken = createCustomerSession(userA);
  const cookieName = getCustomerCookieName();

  try {
    // ----------------------------------------------------
    // TEST 1 & 7: Client-supplied `price` overrides ignored & stored OrderItem.price is DB price
    // ----------------------------------------------------
    console.log("--- TEST 1 & 7: Client-supplied item price override prevention ---");
    setTestCookie(cookieName, sessionToken);

    const maliciousPriceBody = {
      items: [
        {
          id: "prod_luxury_shoe",
          variantId: "var_shoe_red_38",
          qty: 2,
          price: 1, // MALICIOUS TRY: ₦1 price for ₦150k product
        },
      ],
      state: "Lagos",
      city: "Ikeja",
      total: 2, // MALICIOUS TRY
      shippingFee: 0, // MALICIOUS TRY
    };

    const res1 = await postOrder(
      makeRequest("http://localhost/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(maliciousPriceBody),
      })
    );

    const data1 = await res1.json();
    assert(res1.status === 200 && data1.success === true, "Order creation succeeds with server-authoritative calculation");
    assert(data1.order.items[0].price === 150000, "1. Client-supplied price: 1 is IGNORED, stored OrderItem.price equals DB price 150000");

    // ----------------------------------------------------
    // TEST 2 & 8: Client-supplied `total` overrides ignored & stored Order.total is server derived
    // ----------------------------------------------------
    console.log("\n--- TEST 2 & 8: Client-supplied grand total override prevention ---");
    // Expected Total = (150000 * 2) + 5000 = 305000
    assert(data1.order.total === 305000, "2 & 8. Client-supplied total: 2 is IGNORED, stored Order.total equals server-calculated grand total 305000 (300k subtotal + 5k shipping)");

    // ----------------------------------------------------
    // TEST 3: Client-supplied `shippingFee` overrides ignored
    // ----------------------------------------------------
    console.log("\n--- TEST 3: Client-supplied shippingFee override prevention ---");
    assert(data1.order.shippingFee === 5000, "3. Client-supplied shippingFee: 0 is IGNORED, stored Order.shippingFee equals server delivery rate 5000");

    // ----------------------------------------------------
    // TEST 4: Valid product/variant combination produces exact server price (incl. collaboration items)
    // ----------------------------------------------------
    console.log("\n--- TEST 4: Valid product/variant & collaboration pricing ---");
    const validCollabBody = {
      items: [
        {
          collaborationProductId: "collab_bag_gold",
          collaborationVariantId: "collab_var_bag_gold_std",
          isCollaboration: true,
          qty: 1,
          price: 10, // MALICIOUS TRY
        },
      ],
      state: "Lagos",
      city: "Ikeja",
    };

    const res4 = await postOrder(
      makeRequest("http://localhost/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validCollabBody),
      })
    );

    const data4 = await res4.json();
    assert(res4.status === 200 && data4.success === true, "Collaboration order created successfully");
    assert(data4.order.items[0].price === 250000, "4. Collaboration unit price derived from DB (250000) ignoring client payload");
    assert(data4.order.total === 255000, "4. Collaboration order total calculated correctly (250000 + 5000 = 255000)");

    // ----------------------------------------------------
    // TEST 5: Invalid product / variant combinations rejected with 400 Bad Request
    // ----------------------------------------------------
    console.log("\n--- TEST 5: Invalid product/variant rejection ---");

    // Case 5a: Non-existent product ID
    const badProdBody = {
      items: [{ id: "non_existent_product_xyz", qty: 1 }],
      state: "Lagos",
    };
    const res5a = await postOrder(
      makeRequest("http://localhost/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(badProdBody),
      })
    );
    const data5a = await res5a.json();
    assert(res5a.status === 400 && data5a.error.includes("Product not found"), "5a. Order with non-existent product ID rejected with HTTP 400");

    // Case 5b: Non-existent product variant ID
    const badVarBody = {
      items: [{ id: "prod_luxury_shoe", variantId: "non_existent_variant_xyz", qty: 1 }],
      state: "Lagos",
    };
    const res5b = await postOrder(
      makeRequest("http://localhost/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(badVarBody),
      })
    );
    const data5b = await res5b.json();
    assert(res5b.status === 400 && data5b.error.includes("variant not found"), "5b. Order with non-existent variant ID rejected with HTTP 400");

    // ----------------------------------------------------
    // TEST 6: Invalid quantities rejected with 400 Bad Request
    // ----------------------------------------------------
    console.log("\n--- TEST 6: Invalid item quantity rejection ---");

    // Case 6a: Zero quantity
    const zeroQtyBody = {
      items: [{ id: "prod_luxury_shoe", qty: 0 }],
      state: "Lagos",
    };
    const res6a = await postOrder(
      makeRequest("http://localhost/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(zeroQtyBody),
      })
    );
    const data6a = await res6a.json();
    assert(res6a.status === 400 && data6a.error.includes("Invalid quantity"), "6a. Order with zero quantity rejected with HTTP 400");

    // Case 6b: Negative quantity
    const negQtyBody = {
      items: [{ id: "prod_luxury_shoe", qty: -5 }],
      state: "Lagos",
    };
    const res6b = await postOrder(
      makeRequest("http://localhost/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(negQtyBody),
      })
    );
    const data6b = await res6b.json();
    assert(res6b.status === 400 && data6b.error.includes("Invalid quantity"), "6b. Order with negative quantity rejected with HTTP 400");

    // Case 6c: Quantity exceeding variant stock (stock = 10, requesting 99)
    const excessQtyBody = {
      items: [{ id: "prod_luxury_shoe", variantId: "var_shoe_red_38", qty: 99 }],
      state: "Lagos",
    };
    const res6c = await postOrder(
      makeRequest("http://localhost/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(excessQtyBody),
      })
    );
    const data6c = await res6c.json();
    assert(res6c.status === 400 && data6c.error.includes("Insufficient stock"), "6c. Order exceeding available stock rejected with HTTP 400");

  } catch (error) {
    console.error("Test execution exception:", error);
    failed++;
  } finally {
    clearTestCookies();
    resetDb();

    if (originalSecretEnv !== undefined) {
      process.env.CUSTOMER_AUTH_SECRET = originalSecretEnv;
    } else {
      delete process.env.CUSTOMER_AUTH_SECRET;
    }
  }

  console.log(`\n==================================================`);
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log(`==================================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

if (process.argv[1] && process.argv[1].endsWith("test_orders_api.js")) {
  runOrdersApiServerAuthoritativeTests();
}
