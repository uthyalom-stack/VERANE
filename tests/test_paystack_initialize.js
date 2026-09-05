import assert from "assert";
import { resetDb, db } from "./mock_prisma.js";
import { setTestCookie, clearTestCookies } from "./mock_next_headers.js";
import { createCustomerSession, getCustomerCookieName } from "../lib/auth/customer.js";

// Set environment variables required for test execution
process.env.CUSTOMER_AUTH_SECRET = "test-customer-auth-secret-key-32chars!!";
process.env.PAYSTACK_SECRET_KEY = "sk_test_fake_paystack_secret_key";

async function runTests() {
  console.log("=== RUNNING PAYSTACK INITIALIZE GUEST CHECKOUT OWNERSHIP SUITE ===");

  resetDb();

  // Create an existing registered customer
  const existingUser = {
    id: "usr_registered_101",
    email: "registered_customer@example.com",
    name: "Jane Doe",
    password: "hashed_password",
    createdAt: new Date(),
  };
  db.users.push(existingUser);

  // Add dummy product for server-side pricing calculation in mock
  db.products.push({
    id: "prod_test_01",
    name: "Luxury Silk Gown",
    price: 150000,
    inventory: 10,
    brand: "UTHY",
  });

  db.deliveryStates.push({
    id: "ds_lagos",
    state: "Lagos",
    enabled: true,
    pricingMode: "STATE_DEFAULT",
    defaultFee: 5000,
    cities: [],
  });

  // Import route handler dynamically using loader
  const { POST: initializeHandler } = await import("../app/api/paystack/initialize/route.js");

  // Global fetch mock for Paystack API endpoint
  global.fetch = async (url, opts) => {
    if (typeof url === "string" && url.includes("paystack.co/transaction/initialize")) {
      const payload = JSON.parse(opts.body);
      return {
        ok: true,
        json: async () => ({
          status: true,
          data: {
            authorization_url: `https://checkout.paystack.com/auth_${payload.reference}`,
            access_code: `code_${payload.reference}`,
            reference: payload.reference,
          },
        }),
      };
    }
    return { ok: false, json: async () => ({ status: false }) };
  };

  // TEST 1: Guest checkout using an email that belongs to an existing registered customer
  console.log("-> Test 1: Guest checkout with email matching existing user...");
  clearTestCookies();

  const reqGuestExistingEmail = new Request("http://localhost:3000/api/paystack/initialize", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      items: [{ productId: "prod_test_01", qty: 1 }],
      firstName: "Guest",
      lastName: "Shopper",
      email: "registered_customer@example.com", // Belongs to existingUser
      phone: "+2348000000000",
      country: "Nigeria",
      state: "Lagos",
      city: "Ikeja",
      address: "45 Allen Avenue",
    }),
  });
  reqGuestExistingEmail.nextUrl = new URL("http://localhost:3000/api/paystack/initialize");

  const res1 = await initializeHandler(reqGuestExistingEmail);
  const data1 = await res1.json();

  assert.strictEqual(res1.status, 200, "Paystack initialize returns HTTP 200 OK for guest checkout");
  assert.strictEqual(data1.success, true, "Paystack initialize success flag is true");

  const createdGuestOrder = db.orders.find((o) => o.paymentReference === data1.reference);
  assert.ok(createdGuestOrder, "Order was created in database");
  assert.strictEqual(
    createdGuestOrder.userId,
    null,
    "Guest order MUST have userId = null, even when email matches existing User"
  );
  assert.notStrictEqual(
    createdGuestOrder.userId,
    existingUser.id,
    "Guest order MUST NOT claim or attach to existing User account"
  );
  assert.strictEqual(
    createdGuestOrder.email,
    "registered_customer@example.com",
    "Guest email is preserved on the order record"
  );

  const pendingData1 = JSON.parse(createdGuestOrder.pendingCheckoutData);
  assert.strictEqual(
    pendingData1.email,
    "registered_customer@example.com",
    "Guest email is preserved in pendingCheckoutData"
  );
  console.log("✓ [PASS] Guest order with existing customer email receives userId = null and preserves email");

  // TEST 2: Guest checkout with a brand-new email address
  console.log("-> Test 2: Guest checkout with non-existent customer email...");
  clearTestCookies();

  const reqGuestNewEmail = new Request("http://localhost:3000/api/paystack/initialize", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      items: [{ productId: "prod_test_01", qty: 1 }],
      firstName: "Brand",
      lastName: "NewGuest",
      email: "new_guest_999@example.com",
      phone: "+2348099999999",
      country: "Nigeria",
      state: "Lagos",
      city: "Victoria Island",
      address: "10 Ahmadu Bello Way",
    }),
  });
  reqGuestNewEmail.nextUrl = new URL("http://localhost:3000/api/paystack/initialize");

  const res2 = await initializeHandler(reqGuestNewEmail);
  const data2 = await res2.json();

  assert.strictEqual(res2.status, 200, "Paystack initialize returns HTTP 200 OK for new guest checkout");
  assert.strictEqual(data2.success, true, "Paystack initialize success flag is true");

  const createdNewGuestOrder = db.orders.find((o) => o.paymentReference === data2.reference);
  assert.ok(createdNewGuestOrder, "New guest order created in database");
  assert.strictEqual(createdNewGuestOrder.userId, null, "New guest order has userId = null");
  assert.strictEqual(createdNewGuestOrder.email, "new_guest_999@example.com", "Guest email preserved on order");

  // Verify that NO new User record was created automatically in the database
  const createdUser = db.users.find((u) => u.email === "new_guest_999@example.com");
  assert.strictEqual(createdUser, undefined, "No User account was auto-created for guest checkout");
  console.log("✓ [PASS] New guest checkout receives userId = null without auto-creating User account");

  // TEST 3: Authenticated customer checkout
  console.log("-> Test 3: Authenticated customer checkout...");
  const authSessionToken = createCustomerSession({ id: existingUser.id, email: existingUser.email });
  setTestCookie(getCustomerCookieName(), authSessionToken);

  const reqAuthUser = new Request("http://localhost:3000/api/paystack/initialize", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      items: [{ productId: "prod_test_01", qty: 1 }],
      firstName: "Jane",
      lastName: "Doe",
      email: "Jane.Doe.DifferentEmail@example.com", // Customer can submit alternate contact email
      phone: "+2348011111111",
      country: "Nigeria",
      state: "Lagos",
      city: "Ikeja",
      address: "123 Allen Avenue",
    }),
  });
  reqAuthUser.nextUrl = new URL("http://localhost:3000/api/paystack/initialize");

  const res3 = await initializeHandler(reqAuthUser);
  const data3 = await res3.json();

  assert.strictEqual(res3.status, 200, "Authenticated checkout returns HTTP 200 OK");
  assert.strictEqual(data3.success, true, "Paystack initialize success is true");

  const createdAuthOrder = db.orders.find((o) => o.paymentReference === data3.reference);
  assert.ok(createdAuthOrder, "Authenticated order created in database");
  assert.strictEqual(
    createdAuthOrder.userId,
    existingUser.id,
    "Authenticated checkout attaches order to session.user.id"
  );
  assert.strictEqual(
    createdAuthOrder.email,
    "Jane.Doe.DifferentEmail@example.com",
    "Submitted email stored for contact/receipts"
  );
  console.log("✓ [PASS] Authenticated customer checkout attaches order to session.user.id regardless of submitted email");

  console.log("\n==================================================");
  console.log("PAYSTACK GUEST CHECKOUT SUITE: ALL TESTS PASSED");
  console.log("==================================================");
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
