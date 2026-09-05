import crypto from "crypto";
import path from "path";
import { pathToFileURL } from "url";

// Set required secrets for test environment
const originalSecretEnv = process.env.CUSTOMER_AUTH_SECRET;
const originalPaystackSecretEnv = process.env.PAYSTACK_SECRET_KEY;
process.env.CUSTOMER_AUTH_SECRET = "test-secret-key-1234567890-super-secure";
process.env.PAYSTACK_SECRET_KEY = "sk_test_mock_secret_key_12345";

const repoRoot = process.cwd();

// Dynamic imports using pathToFileURL
const customerAuthPath = pathToFileURL(path.join(repoRoot, "lib/auth/customer.js")).href;
const mockHeadersPath = pathToFileURL(path.join(repoRoot, "tests/mock_next_headers.js")).href;
const mockPrismaPath = pathToFileURL(path.join(repoRoot, "tests/mock_prisma.js")).href;
const ordersRoutePath = pathToFileURL(path.join(repoRoot, "app/api/orders/route.js")).href;
const initializeRoutePath = pathToFileURL(path.join(repoRoot, "app/api/paystack/initialize/route.js")).href;

const {
  hashPassword,
  createCustomerSession,
  getCustomerCookieName,
} = await import(customerAuthPath);

const { setTestCookie, clearTestCookies, getTestCookie } = await import(mockHeadersPath);
const { db, resetDb } = await import(mockPrismaPath);
const { POST: postOrder } = await import(ordersRoutePath);
const { POST: postInitialize } = await import(initializeRoutePath);

// Mock fetch for Paystack API calls in tests
const originalFetch = globalThis.fetch;
globalThis.fetch = async (url, options) => {
  const urlString = typeof url === "string" ? url : url?.toString() || "";
  if (urlString.includes("paystack.co")) {
    return new Response(
      JSON.stringify({
        status: true,
        data: {
          authorization_url: "https://checkout.paystack.com/mock-auth-url",
          access_code: "mock_access_code",
          reference: "VR-REF-12345",
        },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }
  return originalFetch(url, options);
};

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
  req.nextUrl = new URL(url);
  return req;
}

/**
 * Runs integration tests for server-authoritative order calculations, product and variant validation, error handling, and checkout ownership.
 */
export async function runOrdersApiServerAuthoritativeTests() {
  console.log("=== RUNNING VÉRANE /api/orders SERVER-AUTHORITATIVE & GUEST OWNERSHIP TESTS ===\n");
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

  // Seed DB Products & Variants for Ownership Tests
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

  const prod2 = {
    id: "prod_luxury_jacket",
    name: "VÉRANE Leather Jacket",
    price: 300000,
    inventory: 10,
    preOrderEnabled: false,
  };
  const variant2 = {
    id: "var_jacket_black_m",
    productId: "prod_luxury_jacket",
    stock: 5,
  };

  // Seed DB Collaboration Products & Variants for Ownership Tests
  const collabProd1 = {
    id: "collab_bag_gold",
    name: "VÉRANE x Brand Bag",
    price: 250000, // ₦250,000 DB Price
    status: "published",
    productAId: "prod_luxury_shoe",
  };
  const collabVariant1 = {
    id: "collab_var_bag_gold_std",
    collaborationProductId: "collab_bag_gold",
    stock: 5,
  };

  const collabProd2 = {
    id: "collab_scarf_silk",
    name: "VÉRANE x Silk Scarf",
    price: 80000,
    status: "published",
    productAId: "prod_luxury_shoe",
  };
  const collabVariant2 = {
    id: "collab_var_scarf_red",
    collaborationProductId: "collab_scarf_silk",
    stock: 8,
  };

  db.products.push(prod1, prod2);
  db.productVariants.push(variant1, variant2);
  db.collaborationProducts.push(collabProd1, collabProd2);
  db.collaborationVariants.push(collabVariant1, collabVariant2);

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
    // TEST 4: Valid product/variant & collaboration pricing
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
    // TEST 5: PRODUCT VARIANT OWNERSHIP & VALIDATION
    // ----------------------------------------------------
    console.log("\n--- TEST 5: Product Variant Ownership Validation ---");

    // Case 5a: Nonexistent variantId -> 400 Bad Request
    const nonExistentVarBody = {
      items: [{ id: "prod_luxury_shoe", variantId: "nonexistent_var_id_123", qty: 1 }],
      state: "Lagos",
    };
    const res5a = await postOrder(
      makeRequest("http://localhost/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nonExistentVarBody),
      })
    );
    const data5a = await res5a.json();
    assert(res5a.status === 400 && data5a.error.includes("variant not found"), "5a. Nonexistent variantId rejected with HTTP 400");

    // Case 5b: Variant belonging to ANOTHER product -> 400 Bad Request
    // Submitting productId: prod_luxury_shoe with variantId: var_jacket_black_m (which belongs to prod_luxury_jacket)
    const mismatchedVarBody = {
      items: [{ id: "prod_luxury_shoe", variantId: "var_jacket_black_m", qty: 1 }],
      state: "Lagos",
    };
    const res5b = await postOrder(
      makeRequest("http://localhost/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mismatchedVarBody),
      })
    );
    const data5b = await res5b.json();
    assert(res5b.status === 400 && data5b.error.includes("does not belong to the requested product"), "5b. Variant belonging to another product rejected with HTTP 400");

    // Case 5c: Valid product + matching variant -> succeeds
    const validMatchingVarBody = {
      items: [{ id: "prod_luxury_shoe", variantId: "var_shoe_red_38", qty: 1 }],
      state: "Lagos",
    };
    const res5c = await postOrder(
      makeRequest("http://localhost/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validMatchingVarBody),
      })
    );
    const data5c = await res5c.json();
    assert(res5c.status === 200 && data5c.success === true, "5c. Valid product with matching variant succeeds (HTTP 200)");

    // ----------------------------------------------------
    // TEST 6: COLLABORATION VARIANT OWNERSHIP & VALIDATION
    // ----------------------------------------------------
    console.log("\n--- TEST 6: Collaboration Variant Ownership Validation ---");

    // Case 6a: Nonexistent collaborationVariantId -> 400 Bad Request
    const nonExistentCollabVarBody = {
      items: [{ collaborationProductId: "collab_bag_gold", collaborationVariantId: "nonexistent_collab_var_123", isCollaboration: true, qty: 1 }],
      state: "Lagos",
    };
    const res6a = await postOrder(
      makeRequest("http://localhost/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nonExistentCollabVarBody),
      })
    );
    const data6a = await res6a.json();
    assert(res6a.status === 400 && data6a.error.includes("collaboration variant not found"), "6a. Nonexistent collaborationVariantId rejected with HTTP 400");

    // Case 6b: Collaboration variant belonging to ANOTHER collaboration product -> 400 Bad Request
    // Submitting collaborationProductId: collab_bag_gold with collaborationVariantId: collab_var_scarf_red (belongs to collab_scarf_silk)
    const mismatchedCollabVarBody = {
      items: [{ collaborationProductId: "collab_bag_gold", collaborationVariantId: "collab_var_scarf_red", isCollaboration: true, qty: 1 }],
      state: "Lagos",
    };
    const res6b = await postOrder(
      makeRequest("http://localhost/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mismatchedCollabVarBody),
      })
    );
    const data6b = await res6b.json();
    assert(res6b.status === 400 && data6b.error.includes("does not belong to the requested collaboration product"), "6b. Mismatched collaboration variant rejected with HTTP 400");

    // Case 6c: Valid collaboration product + matching collaboration variant -> succeeds
    const validCollabMatchingBody = {
      items: [{ collaborationProductId: "collab_bag_gold", collaborationVariantId: "collab_var_bag_gold_std", isCollaboration: true, qty: 1 }],
      state: "Lagos",
    };
    const res6c = await postOrder(
      makeRequest("http://localhost/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validCollabMatchingBody),
      })
    );
    const data6c = await res6c.json();
    assert(res6c.status === 200 && data6c.success === true, "6c. Valid collaboration product with matching collaboration variant succeeds (HTTP 200)");

    // ----------------------------------------------------
    // TEST 7: INVALID ITEM QUANTITY & MALFORMED ITEM REJECTION
    // ----------------------------------------------------
    console.log("\n--- TEST 7: Invalid item quantity & malformed item rejection ---");

    // Case 7a: Zero quantity -> 400
    const zeroQtyBody = {
      items: [{ id: "prod_luxury_shoe", qty: 0 }],
      state: "Lagos",
    };
    const res7a = await postOrder(
      makeRequest("http://localhost/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(zeroQtyBody),
      })
    );
    const data7a = await res7a.json();
    assert(res7a.status === 400 && data7a.error.includes("Invalid quantity"), "7a. Order with zero quantity rejected with HTTP 400");

    // Case 7b: Negative quantity -> 400
    const negQtyBody = {
      items: [{ id: "prod_luxury_shoe", qty: -5 }],
      state: "Lagos",
    };
    const res7b = await postOrder(
      makeRequest("http://localhost/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(negQtyBody),
      })
    );
    const data7b = await res7b.json();
    assert(res7b.status === 400 && data7b.error.includes("Invalid quantity"), "7b. Order with negative quantity rejected with HTTP 400");

    // Case 7c: Quantity exceeding stock -> 400
    const excessQtyBody = {
      items: [{ id: "prod_luxury_shoe", variantId: "var_shoe_red_38", qty: 99 }],
      state: "Lagos",
    };
    const res7c = await postOrder(
      makeRequest("http://localhost/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(excessQtyBody),
      })
    );
    const data7c = await res7c.json();
    assert(res7c.status === 400 && data7c.error.includes("Insufficient stock"), "7c. Order exceeding available stock rejected with HTTP 400");

    // Case 7d: Malformed cart item: items: [null] -> 400 Bad Request
    const nullItemBody = {
      items: [null],
      state: "Lagos",
    };
    const res7d = await postOrder(
      makeRequest("http://localhost/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nullItemBody),
      })
    );
    const data7d = await res7d.json();
    assert(res7d.status === 400 && data7d.error.includes("Invalid cart item"), "7d. Order with null cart item rejected with HTTP 400 Bad Request");

    // Case 7e: Malformed cart item: items: ["invalid"] -> 400 Bad Request
    const stringItemBody = {
      items: ["invalid"],
      state: "Lagos",
    };
    const res7e = await postOrder(
      makeRequest("http://localhost/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(stringItemBody),
      })
    );
    const data7e = await res7e.json();
    assert(res7e.status === 400 && data7e.error.includes("Invalid cart item"), "7e. Order with non-object cart item rejected with HTTP 400 Bad Request");

    // ----------------------------------------------------
    // TEST 8: ERROR CLASSIFICATION (400 VALIDATION VS 500 DATABASE FAILURE)
    // ----------------------------------------------------
    console.log("\n--- TEST 8: Error Classification (HTTP 400 vs HTTP 500) ---");

    // Case 8a: Validation error produces HTTP 400 Bad Request with descriptive message
    const validationErrBody = {
      items: [{ id: "nonexistent_prod_abc", qty: 1 }],
      state: "Lagos",
    };
    const res8a = await postOrder(
      makeRequest("http://localhost/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validationErrBody),
      })
    );
    const data8a = await res8a.json();
    assert(res8a.status === 400 && data8a.error === "Product not found.", "8a. Validation error returns HTTP 400 Bad Request with validation message");

    // Case 8b: Simulated database/infrastructure failure produces HTTP 500 Internal Server Error without leaking internal DB details
    db.shouldThrow = true;
    const dbErrBody = {
      items: [{ id: "prod_luxury_shoe", qty: 1 }],
      state: "Lagos",
    };
    const res8b = await postOrder(
      makeRequest("http://localhost/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dbErrBody),
      })
    );
    const data8b = await res8b.json();
    assert(res8b.status === 500 && data8b.error === "Failed to create order", "8b. Simulated database/infrastructure error returns HTTP 500 with safe generic error message");
    db.shouldThrow = false;

    // ----------------------------------------------------
    // TEST 9: GUEST CHECKOUT OWNERSHIP INTEGRITY
    // ----------------------------------------------------
    console.log("\n--- TEST 9: Guest Checkout Ownership Integrity ---");

    // 9a. Logged-in customer checkout receives session.user.id
    setTestCookie(cookieName, sessionToken);
    const loggedInCheckoutBody = {
      items: [{ id: "prod_luxury_shoe", qty: 1 }],
      firstName: "Authenticated",
      lastName: "User",
      email: userA.email,
      address: "123 Main St",
      city: "Ikeja",
      state: "Lagos",
    };
    const res9a = await postInitialize(
      makeRequest("http://localhost/api/paystack/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(loggedInCheckoutBody),
      })
    );
    const data9a = await res9a.json();
    assert(res9a.status === 200 && data9a.success === true, "9a. Authenticated checkout initialization succeeds");

    const createdOrderAuth = db.orders.find((o) => o.paymentReference === data9a.reference);
    assert(createdOrderAuth && createdOrderAuth.userId === userA.id, "9a. Order created by authenticated session is correctly attached to userA.id");

    // 9b. Guest checkout submitting existing userA email always gets userId = null
    clearTestCookies(); // Unauthenticate
    const guestCheckoutExistingEmailBody = {
      items: [{ id: "prod_luxury_shoe", qty: 1 }],
      firstName: "Guest",
      lastName: "Impostor",
      email: userA.email, // Submitting userA's email as guest
      address: "456 Guest Road",
      city: "Ikeja",
      state: "Lagos",
    };
    const res9b = await postInitialize(
      makeRequest("http://localhost/api/paystack/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(guestCheckoutExistingEmailBody),
      })
    );
    const data9b = await res9b.json();
    assert(res9b.status === 200 && data9b.success === true, "9b. Guest checkout with existing customer email succeeds");

    const createdOrderGuest = db.orders.find((o) => o.paymentReference === data9b.reference);
    assert(createdOrderGuest && createdOrderGuest.userId === null, "9b. Guest checkout order ALWAYS receives userId = null (never attached to userA.id)");
    assert(createdOrderGuest && createdOrderGuest.email === userA.email, "9b. Guest email is preserved in order.email field");

  } catch (error) {
    console.error("Test execution exception:", error);
    failed++;
  } finally {
    globalThis.fetch = originalFetch;
    clearTestCookies();
    resetDb();

    if (originalSecretEnv !== undefined) {
      process.env.CUSTOMER_AUTH_SECRET = originalSecretEnv;
    } else {
      delete process.env.CUSTOMER_AUTH_SECRET;
    }

    if (originalPaystackSecretEnv !== undefined) {
      process.env.PAYSTACK_SECRET_KEY = originalPaystackSecretEnv;
    } else {
      delete process.env.PAYSTACK_SECRET_KEY;
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
