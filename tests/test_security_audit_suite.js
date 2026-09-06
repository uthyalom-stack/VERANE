import assert from "assert";
import { POST as subscribePost } from "../app/api/subscribe/route.js";
import { POST as orderPost } from "../app/api/orders/route.js";

async function testDisabledOrderCreation() {
  console.log("\n--- TEST: Disabled Direct Order Creation (POST /api/orders) ---");
  const res = await orderPost();
  assert.strictEqual(res.status, 403, "Direct order creation must return 403 Forbidden");
  const data = await res.json();
  assert.strictEqual(data.success, false);
  assert.ok(data.error.includes("Direct order creation is disabled"));
  console.log("✓ POST /api/orders returns 403 Forbidden and disables direct order creation");
}

async function testSubscriberValidation() {
  console.log("\n--- TEST: Subscriber Email Length & Format Validation ---");

  // Test 1: Oversized Email (> 254 chars)
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

  // Test 2: Invalid Email Format
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

async function runAllSecurityAuditTests() {
  console.log("=== RUNNING VÉRANE SECURITY AUDIT REGRESSION SUITE ===");
  try {
    await testDisabledOrderCreation();
    await testSubscriberValidation();
    console.log("\n==================================================");
    console.log("ALL VÉRANE SECURITY AUDIT TESTS PASSED SUCCESSFULLY!");
    console.log("==================================================");
  } catch (err) {
    console.error("\nTEST SUITE FAILURE:", err);
    process.exit(1);
  }
}

runAllSecurityAuditTests();
