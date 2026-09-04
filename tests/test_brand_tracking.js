import assert from "node:assert";
import prisma from "./mock_prisma.js";
import { createSignedAdminToken } from "../lib/admin-auth.js";
import { GET as getCustomerOrdersHandler } from "../app/api/orders/route.js";
import { GET as getAdminOrdersHandler } from "../app/api/admin/orders/route.js";
import {
  GET as getAdminOrderDetailHandler,
  PUT as updateAdminOrderHandler,
} from "../app/api/admin/orders/[id]/route.js";
import { PUT as updateBrandTrackingHandler } from "../app/api/admin/orders/[id]/tracking/route.js";
import { createCustomerSession } from "../lib/auth/customer.js";
import { setTestCookie, clearTestCookies } from "./mock_next_headers.js";

process.env.ADMIN_AUTH_SECRET = "test_admin_auth_secret_32_bytes_long!!";
process.env.CUSTOMER_AUTH_SECRET = "test_customer_auth_secret_32_bytes_long!!";

function setAuthCookies(adminToken = null, customerToken = null) {
  clearTestCookies();
  if (adminToken) {
    setTestCookie("adminAuth", adminToken);
  }
  if (customerToken) {
    setTestCookie("verane_customer", customerToken);
  }
}

function createRequest(url, method = "GET", body = null) {
  const headers = new Headers();
  if (body) {
    headers.set("content-type", "application/json");
  }

  return new Request(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : null,
  });
}

async function runBrandTrackingTests() {
  console.log("=== RUNNING VÉRANE INDEPENDENT BRAND TRACKING TEST SUITE ===\n");

  // Create admin cookies
  const uthyToken = createSignedAdminToken({
    role: "UTHY",
    brand: "UTHY_LUXURY",
    name: "UTHY Admin",
  });
  const alomzieeToken = createSignedAdminToken({
    role: "ALOMZIEE",
    brand: "ALOMZIEE_FOOTIES",
    name: "ALOMZIEE Admin",
  });
  const superadminToken = createSignedAdminToken({
    role: "SUPERADMIN",
    brand: "ALL",
    name: "Super Admin",
  });

  const uthyCookie = `adminAuth=${uthyToken}`;
  const alomzieeCookie = `adminAuth=${alomzieeToken}`;
  const superadminCookie = `adminAuth=${superadminToken}`;

  // Create mock customer and products
  const customer = await prisma.user.create({
    data: {
      email: `tracking_test_${Date.now()}@verane.com`,
      password: "hash",
      name: "Tracking Customer",
    },
  });

  const uthyProduct = await prisma.product.create({
    data: {
      name: "UTHY Silk Gown",
      brand: "UTHY_LUXURY",
      category: "Dresses",
      price: 150000,
      images: "[]",
    },
  });

  const alomzieeProduct = await prisma.product.create({
    data: {
      name: "ALOMZIEE Leather Slides",
      brand: "ALOMZIEE_FOOTIES",
      category: "Footwear",
      price: 80000,
      images: "[]",
    },
  });

  const customerToken = createCustomerSession({
    id: customer.id,
    email: customer.email,
    name: customer.name,
  });
  const customerCookie = `verane_customer=${customerToken}`;

  // --- TEST 1: UTHY-ONLY ORDER ---
  console.log("--- TEST 1: UTHY-ONLY ORDER ---");
  const uthyOrder = await prisma.order.create({
    data: {
      userId: customer.id,
      orderNumber: `VR-UTHY-${Date.now()}`,
      total: 150000,
      items: {
        create: [
          {
            productId: uthyProduct.id,
            quantity: 1,
            price: 150000,
          },
        ],
      },
    },
  });

  // UTHY admin updates tracking to "In Transit"
  setAuthCookies(uthyToken, null);
  let req = createRequest(
    `http://localhost/api/admin/orders/${uthyOrder.id}/tracking`,
    "PUT",
    { status: "In Transit" }
  );
  let res = await updateBrandTrackingHandler(req, { params: Promise.resolve({ id: uthyOrder.id }) });
  let json = await res.json();
  assert.strictEqual(res.status, 200, "UTHY admin update UTHY order status should succeed");
  assert.strictEqual(json.tracking.status, "In Transit");
  console.log("✓ UTHY admin successfully updated UTHY order status to 'In Transit'");

  // Customer checks order
  setAuthCookies(null, customerToken);
  req = createRequest("http://localhost/api/orders", "GET", null);
  res = await getCustomerOrdersHandler(req);
  json = await res.json();
  const foundUthyOrder = json.orders.find((o) => o.id === uthyOrder.id);
  assert(foundUthyOrder, "Customer should retrieve order");
  assert.strictEqual(foundUthyOrder.brandTrackingsInfo.length, 1, "Single brand order has 1 brand tracking section");
  assert.strictEqual(foundUthyOrder.brandTrackingsInfo[0].brand, "UTHY_LUXURY");
  assert.strictEqual(foundUthyOrder.brandTrackingsInfo[0].status, "In Transit");
  console.log("✓ Customer sees UTHY LUXURY -> 'In Transit'");

  // ALOMZIEE admin attempts to modify UTHY order -> FORBIDDEN
  setAuthCookies(alomzieeToken, null);
  req = createRequest(
    `http://localhost/api/admin/orders/${uthyOrder.id}/tracking`,
    "PUT",
    { status: "Delivered" }
  );
  res = await updateBrandTrackingHandler(req, { params: Promise.resolve({ id: uthyOrder.id }) });
  assert.strictEqual(res.status, 403, "ALOMZIEE admin modifying UTHY order should be 403 Forbidden");
  console.log("✓ ALOMZIEE admin blocked (403 Forbidden) from modifying UTHY order");

  // SUPERADMIN attempts to modify tracking -> FORBIDDEN
  setAuthCookies(superadminToken, null);
  req = createRequest(
    `http://localhost/api/admin/orders/${uthyOrder.id}/tracking`,
    "PUT",
    { status: "Delivered" }
  );
  res = await updateBrandTrackingHandler(req, { params: Promise.resolve({ id: uthyOrder.id }) });
  assert.strictEqual(res.status, 403, "SUPERADMIN modifying tracking should be 403 Forbidden");
  console.log("✓ SUPERADMIN blocked (403 Forbidden) from modifying tracking");


  // --- TEST 2: ALOMZIEE-ONLY ORDER ---
  console.log("\n--- TEST 2: ALOMZIEE-ONLY ORDER ---");
  const alomzieeOrder = await prisma.order.create({
    data: {
      userId: customer.id,
      orderNumber: `VR-ALOM-${Date.now()}`,
      total: 80000,
      items: {
        create: [
          {
            productId: alomzieeProduct.id,
            quantity: 1,
            price: 80000,
          },
        ],
      },
    },
  });

  // UTHY admin attempts to modify ALOMZIEE order -> FORBIDDEN
  setAuthCookies(uthyToken, null);
  req = createRequest(
    `http://localhost/api/admin/orders/${alomzieeOrder.id}/tracking`,
    "PUT",
    { status: "In Transit" }
  );
  res = await updateBrandTrackingHandler(req, { params: Promise.resolve({ id: alomzieeOrder.id }) });
  assert.strictEqual(res.status, 403, "UTHY admin modifying ALOMZIEE order should be 403 Forbidden");
  console.log("✓ UTHY admin blocked (403 Forbidden) from modifying ALOMZIEE order");

  // ALOMZIEE admin updates tracking to "Delivered"
  setAuthCookies(alomzieeToken, null);
  req = createRequest(
    `http://localhost/api/admin/orders/${alomzieeOrder.id}/tracking`,
    "PUT",
    { status: "Delivered" }
  );
  res = await updateBrandTrackingHandler(req, { params: Promise.resolve({ id: alomzieeOrder.id }) });
  json = await res.json();
  assert.strictEqual(res.status, 200, "ALOMZIEE admin update ALOMZIEE order status should succeed");
  assert.strictEqual(json.tracking.status, "Delivered");
  console.log("✓ ALOMZIEE admin successfully updated ALOMZIEE order status to 'Delivered'");


  // --- TEST 3: COMBINED ORDER (UTHY + ALOMZIEE) ---
  console.log("\n--- TEST 3: COMBINED ORDER ---");
  const combinedOrder = await prisma.order.create({
    data: {
      userId: customer.id,
      orderNumber: `VR-COMB-${Date.now()}`,
      total: 230000,
      items: {
        create: [
          {
            productId: uthyProduct.id,
            quantity: 1,
            price: 150000,
          },
          {
            productId: alomzieeProduct.id,
            quantity: 1,
            price: 80000,
          },
        ],
      },
    },
  });

  // Verify initial state for customer
  setAuthCookies(null, customerToken);
  req = createRequest("http://localhost/api/orders", "GET", null);
  res = await getCustomerOrdersHandler(req);
  json = await res.json();
  let foundCombined = json.orders.find((o) => o.id === combinedOrder.id);
  assert.strictEqual(foundCombined.brandTrackingsInfo.length, 2, "Combined order has 2 brand tracking sections");
  const initialUthy = foundCombined.brandTrackingsInfo.find((b) => b.brand === "UTHY_LUXURY");
  const initialAlom = foundCombined.brandTrackingsInfo.find((b) => b.brand === "ALOMZIEE_FOOTIES");
  assert.strictEqual(initialUthy.status, "Processing");
  assert.strictEqual(initialAlom.status, "Processing");
  console.log("✓ Initial state: UTHY -> Processing, ALOMZIEE -> Processing");

  // Step 1: UTHY admin changes UTHY -> "In Transit"
  setAuthCookies(uthyToken, null);
  req = createRequest(
    `http://localhost/api/admin/orders/${combinedOrder.id}/tracking`,
    "PUT",
    { status: "In Transit" }
  );
  res = await updateBrandTrackingHandler(req, { params: Promise.resolve({ id: combinedOrder.id }) });
  assert.strictEqual(res.status, 200);

  // Check customer view
  setAuthCookies(null, customerToken);
  req = createRequest("http://localhost/api/orders", "GET", null);
  res = await getCustomerOrdersHandler(req);
  json = await res.json();
  foundCombined = json.orders.find((o) => o.id === combinedOrder.id);
  let uthyInfo = foundCombined.brandTrackingsInfo.find((b) => b.brand === "UTHY_LUXURY");
  let alomInfo = foundCombined.brandTrackingsInfo.find((b) => b.brand === "ALOMZIEE_FOOTIES");
  assert.strictEqual(uthyInfo.status, "In Transit");
  assert.strictEqual(alomInfo.status, "Processing");
  console.log("✓ Customer sees: UTHY -> In Transit, ALOMZIEE -> Processing");

  // Step 2: ALOMZIEE admin changes ALOMZIEE -> "Delivered"
  setAuthCookies(alomzieeToken, null);
  req = createRequest(
    `http://localhost/api/admin/orders/${combinedOrder.id}/tracking`,
    "PUT",
    { status: "Delivered" }
  );
  res = await updateBrandTrackingHandler(req, { params: Promise.resolve({ id: combinedOrder.id }) });
  assert.strictEqual(res.status, 200);

  // Check customer view
  setAuthCookies(null, customerToken);
  req = createRequest("http://localhost/api/orders", "GET", null);
  res = await getCustomerOrdersHandler(req);
  json = await res.json();
  foundCombined = json.orders.find((o) => o.id === combinedOrder.id);
  uthyInfo = foundCombined.brandTrackingsInfo.find((b) => b.brand === "UTHY_LUXURY");
  alomInfo = foundCombined.brandTrackingsInfo.find((b) => b.brand === "ALOMZIEE_FOOTIES");
  assert.strictEqual(uthyInfo.status, "In Transit");
  assert.strictEqual(alomInfo.status, "Delivered");
  console.log("✓ Customer sees: UTHY -> In Transit, ALOMZIEE -> Delivered");

  // Step 3: UTHY admin changes UTHY -> "Delivered"
  setAuthCookies(uthyToken, null);
  req = createRequest(
    `http://localhost/api/admin/orders/${combinedOrder.id}/tracking`,
    "PUT",
    { status: "Delivered" }
  );
  res = await updateBrandTrackingHandler(req, { params: Promise.resolve({ id: combinedOrder.id }) });
  assert.strictEqual(res.status, 200);

  // Check customer view
  setAuthCookies(null, customerToken);
  req = createRequest("http://localhost/api/orders", "GET", null);
  res = await getCustomerOrdersHandler(req);
  json = await res.json();
  foundCombined = json.orders.find((o) => o.id === combinedOrder.id);
  uthyInfo = foundCombined.brandTrackingsInfo.find((b) => b.brand === "UTHY_LUXURY");
  alomInfo = foundCombined.brandTrackingsInfo.find((b) => b.brand === "ALOMZIEE_FOOTIES");
  assert.strictEqual(uthyInfo.status, "Delivered");
  assert.strictEqual(alomInfo.status, "Delivered");
  console.log("✓ Customer sees: UTHY -> Delivered, ALOMZIEE -> Delivered");

  console.log("\n==================================================");
  console.log("ALL INDEPENDENT BRAND TRACKING TESTS PASSED SUCCESSFULLY!");
  console.log("==================================================");
}

runBrandTrackingTests().catch((err) => {
  console.error("Test execution error:", err);
  process.exit(1);
});
