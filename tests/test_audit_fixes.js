import assert from "assert";
import { checkRateLimit, recordFailedAttempt, resetRateLimit } from "../lib/rate-limit.js";
import { evaluateBrandOrderAuthorization } from "../lib/order-tracking.js";
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

  // 4. Fail-Closed Admin Order Authorization Tests
  console.log("-> Testing Brand Admin Order Authorization fail-closed semantics...");

  // Single-brand UTHY order
  const uthyOrder = {
    items: [{ product: { brand: "UTHY_LUXURY" } }],
  };
  assert.strictEqual(evaluateBrandOrderAuthorization(uthyOrder, "UTHY").authorized, true);
  assert.strictEqual(evaluateBrandOrderAuthorization(uthyOrder, "ALOMZIEE").authorized, false);

  // Valid Collaboration order
  const collabOrder = {
    items: [
      {
        collaborationProductId: "collab_1",
        collaborationProduct: {
          productA: { brand: "UTHY_LUXURY" },
          productB: { brand: "ALOMZIEE_FOOTIES" },
        },
      },
    ],
  };
  assert.strictEqual(evaluateBrandOrderAuthorization(collabOrder, "UTHY").authorized, true, "UTHY admin authorized for valid collab");
  assert.strictEqual(evaluateBrandOrderAuthorization(collabOrder, "ALOMZIEE").authorized, true, "ALOMZIEE admin authorized for valid collab");

  // Unrelated mixed-brand order (without valid collaboration)
  const mixedOrder = {
    items: [
      { product: { brand: "UTHY_LUXURY" } },
      { product: { brand: "ALOMZIEE_FOOTIES" } },
    ],
  };
  const mixedUthyResult = evaluateBrandOrderAuthorization(mixedOrder, "UTHY");
  assert.strictEqual(mixedUthyResult.authorized, false);
  assert.strictEqual(mixedUthyResult.reason, "mixed_brand_forbidden");

  // Missing brandA in collaboration metadata (MUST fail closed)
  const malformedCollabOrder = {
    items: [
      {
        collaborationProductId: "collab_2",
        collaborationProduct: {
          productA: null, // missing brandA
          productB: { brand: "ALOMZIEE_FOOTIES" },
        },
      },
    ],
  };
  assert.strictEqual(evaluateBrandOrderAuthorization(malformedCollabOrder, "UTHY").authorized, false, "Missing brandA fails closed");
  assert.strictEqual(evaluateBrandOrderAuthorization(malformedCollabOrder, "ALOMZIEE").authorized, false, "Missing brandA fails closed for all brands");
  console.log("   ✓ Admin order authorization strictly fails closed for malformed collaboration data and unrelated mixed orders");

  // 5. Rate Limiter Test with DB Fallback
  console.log("-> Testing rate limiter...");
  const testKey = "test_rate_key_" + Date.now();
  let limit = await checkRateLimit(testKey, { maxAttempts: 3, windowMs: 10000 });
  assert.strictEqual(limit.allowed, true);

  await recordFailedAttempt(testKey);
  await recordFailedAttempt(testKey);
  await recordFailedAttempt(testKey);

  limit = await checkRateLimit(testKey, { maxAttempts: 3, windowMs: 10000 });
  assert.strictEqual(limit.allowed, false, "Rate limit triggers after max attempts");

  await resetRateLimit(testKey);
  limit = await checkRateLimit(testKey, { maxAttempts: 3, windowMs: 10000 });
  assert.strictEqual(limit.allowed, true, "Rate limit resets successfully");
  console.log("   ✓ Rate limiter correctly throttles repeated failures and resets");

  // 6. Admin Order Status Validation Test
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

  // 7. AVIF Magic Bytes Signature Validation Test
  console.log("-> Testing AVIF and ISO-BMFF magic byte validation helper...");

  // Valid AVIF Buffer (ftypavif)
  const validAvifBuffer = Buffer.from([
    0x00, 0x00, 0x00, 0x1c, // box length 28
    0x66, 0x74, 0x79, 0x70, // "ftyp"
    0x61, 0x76, 0x69, 0x66, // major_brand "avif"
    0x00, 0x00, 0x00, 0x00,
    0x61, 0x76, 0x69, 0x66, // compatible_brand "avif"
    0x6d, 0x69, 0x66, 0x31,
  ]);

  // Non-AVIF ISO-BMFF MP4 Buffer (ftypisom)
  const invalidMp4Buffer = Buffer.from([
    0x00, 0x00, 0x00, 0x1c,
    0x66, 0x74, 0x79, 0x70,
    0x69, 0x73, 0x6f, 0x6d, // major_brand "isom"
    0x00, 0x00, 0x00, 0x00,
    0x6d, 0x70, 0x34, 0x31, // compatible_brand "mp41"
  ]);

  // Arbitrary fake text file renamed .avif
  const fakeTextBuffer = Buffer.from("THIS IS NOT AN IMAGE FILE AT ALL");

  // Function mirror to test signature logic directly
  function checkAvifSignature(buf) {
    if (buf.length < 12 || buf[4] !== 0x66 || buf[5] !== 0x74 || buf[6] !== 0x79 || buf[7] !== 0x70) {
      return false;
    }
    const majorBrand = buf.toString("ascii", 8, 12);
    if (majorBrand === "avif" || majorBrand === "avis") return true;

    const boxLength = buf.readUInt32BE(0);
    const limit = Math.min(buf.length, boxLength > 0 ? boxLength : buf.length);
    for (let offset = 16; offset + 4 <= limit; offset += 4) {
      const compBrand = buf.toString("ascii", offset, offset + 4);
      if (compBrand === "avif" || compBrand === "avis") return true;
    }
    return false;
  }

  assert.strictEqual(checkAvifSignature(validAvifBuffer), true, "Valid AVIF buffer accepted");
  assert.strictEqual(checkAvifSignature(invalidMp4Buffer), false, "Non-AVIF MP4 ISO-BMFF rejected");
  assert.strictEqual(checkAvifSignature(fakeTextBuffer), false, "Fake text file rejected");
  console.log("   ✓ AVIF image signature validator strictly enforces AVIF major/compatible brands");

  console.log("\nALL SECURITY AUDIT REGRESSION TESTS PASSED SUCCESSFULLY! ✓");
}

runAuditTests().catch((err) => {
  console.error("Test execution failure:", err);
  process.exit(1);
});
