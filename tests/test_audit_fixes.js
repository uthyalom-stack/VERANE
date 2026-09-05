import assert from "assert";
import { checkRateLimit, recordFailedAttempt, resetRateLimit } from "../lib/rate-limit.js";
import { GET as getPublicSettingsHandler } from "../app/api/settings/route.js";
import { POST as postOrderHandler } from "../app/api/orders/route.js";
import { GET as getPublicProductsHandler } from "../app/api/products/route.js";
import { PUT as updateAdminOrderHandler } from "../app/api/admin/orders/[id]/route.js";
import { POST as uploadHandler } from "../app/api/admin/upload/route.js";

function createRequest(url, method = "GET", body = null, headers = {}) {
  const options = {
    method,
    headers: new Headers(headers),
  };
  if (body) {
    options.body = JSON.stringify(body);
    options.headers.set("Content-Type", "application/json");
  }
  return new Request(url, options);
}

async function runAuditTests() {
  console.log("=== RUNNING SECURITY AUDIT REGRESSION TESTS ===");

  // 1. Direct POST /api/orders order creation test
  console.log("-> Testing POST /api/orders direct creation refusal...");
  const orderReq = createRequest("http://localhost/api/orders", "POST", {
    items: [{ id: "prod_1", qty: 1, price: 100 }],
    total: 100,
  });
  const orderRes = await postOrderHandler(orderReq);
  const orderData = await orderRes.json();
  assert.strictEqual(orderRes.status, 403, "Direct POST /api/orders should return 403 Forbidden");
  assert.strictEqual(orderData.success, false);
  console.log("   ✓ Direct order creation via POST is correctly blocked (403)");

  // 2. Public /api/settings allowlist filtering test
  console.log("-> Testing public /api/settings allowlist protection...");
  const settingsReq = createRequest("http://localhost/api/settings");
  const settingsRes = await getPublicSettingsHandler(settingsReq);
  const settingsData = await settingsRes.json();
  assert.strictEqual(settingsRes.status, 200);
  assert("siteName" in settingsData, "Allowed setting 'siteName' present");
  assert("announcementText" in settingsData, "Allowed setting 'announcementText' present");
  assert(!("veraneAddress" in settingsData), "Internal key 'veraneAddress' excluded");
  assert(!("secretAdminKey" in settingsData), "Unapproved DB key excluded");
  console.log("   ✓ Public /api/settings explicitly filters settings to public allowlist");

  // 3. Public /api/products DTO shape test
  console.log("-> Testing public /api/products DTO shape...");
  const productsReq = createRequest("http://localhost/api/products");
  const productsRes = await getPublicProductsHandler(productsReq);
  const productsData = await productsRes.json();
  assert.strictEqual(productsRes.status, 200);
  assert(Array.isArray(productsData), "Products returned as array");
  if (productsData.length > 0) {
    const prod = productsData[0];
    assert(!("initialInventory" in prod), "Internal field initialInventory excluded");
    if (prod.variants && prod.variants.length > 0) {
      assert(!("initialStock" in prod.variants[0]), "Internal field initialStock excluded from variant DTO");
    }
  }
  console.log("   ✓ Public /api/products returns sanitized public DTOs");

  // 4. Rate Limiter Test
  console.log("-> Testing in-memory sliding-window rate limiter...");
  const testKey = "test_rate_key_" + Date.now();
  let limit = checkRateLimit(testKey, { maxAttempts: 3, windowMs: 10000 });
  assert.strictEqual(limit.allowed, true);

  recordFailedAttempt(testKey);
  recordFailedAttempt(testKey);
  recordFailedAttempt(testKey);

  limit = checkRateLimit(testKey, { maxAttempts: 3, windowMs: 10000 });
  assert.strictEqual(limit.allowed, false, "Rate limit triggers after max attempts");
  assert(limit.resetMs > 0, "resetMs is positive");

  resetRateLimit(testKey);
  limit = checkRateLimit(testKey, { maxAttempts: 3, windowMs: 10000 });
  assert.strictEqual(limit.allowed, true, "Rate limit resets successfully");
  console.log("   ✓ Rate limiter correctly throttles repeated failures and resets");

  // 5. Admin Order Status Validation Test
  console.log("-> Testing admin order status validation...");
  const invalidStatusReq = createRequest(
    "http://localhost/api/admin/orders/ord_123",
    "PUT",
    { status: "INVALID_STATUS_STRING" },
    { cookie: "adminAuth=valid" }
  );
  const invalidStatusRes = await updateAdminOrderHandler(invalidStatusReq, {
    params: Promise.resolve({ id: "ord_123" }),
  });
  const invalidStatusData = await invalidStatusRes.json();
  assert.strictEqual(invalidStatusRes.status, 400, "Invalid status string returns 400 Bad Request");
  assert.strictEqual(invalidStatusData.success, false);
  console.log("   ✓ PUT /api/admin/orders/[id] rejects unsupported status strings with 400");

  console.log("\nALL SECURITY AUDIT REGRESSION TESTS PASSED SUCCESSFULLY! ✓");
}

runAuditTests().catch((err) => {
  console.error("Test execution failure:", err);
  process.exit(1);
});
