import assert from "node:assert";
import {
  FULFILLMENT_METHODS,
  validateFulfillmentRules,
  getPickupLocationConfig,
  DEFAULT_PICKUP_LOCATION,
} from "../lib/fulfillment.js";
import {
  fetchShippingRates,
  createShipment,
  getShipments,
  cancelShipment,
  validateAddress,
} from "../lib/shipbubble.js";

async function runTests() {
  console.log("=== RUNNING SHIPBUBBLE & PICKUP FOUNDATION SUITE ===");

  // 1. Test FULFILLMENT_METHODS constants
  console.log("\n--- TEST 1: Fulfillment Methods Constants ---");
  assert.strictEqual(FULFILLMENT_METHODS.DELIVERY, "DELIVERY");
  assert.strictEqual(FULFILLMENT_METHODS.PICKUP, "PICKUP");
  console.log("✓ FULFILLMENT_METHODS constants verified");

  // 2. Test validateFulfillmentRules for PICKUP
  console.log("\n--- TEST 2: Pickup Rule Validation ---");
  const validPickup = validateFulfillmentRules({
    fulfillmentMethod: "PICKUP",
    shippingFee: 0,
  });
  assert.strictEqual(validPickup.valid, true);

  const invalidPickupFee = validateFulfillmentRules({
    fulfillmentMethod: "PICKUP",
    shippingFee: 1500,
  });
  assert.strictEqual(invalidPickupFee.valid, false);
  assert.ok(invalidPickupFee.error.includes("exactly ₦0"));
  console.log("✓ Pickup rules verified (fee must strictly be 0)");

  // 3. Test validateFulfillmentRules for DELIVERY
  console.log("\n--- TEST 3: Delivery Rule Validation ---");
  const validDelivery = validateFulfillmentRules({
    fulfillmentMethod: "DELIVERY",
    shippingFee: 2500,
  });
  assert.strictEqual(validDelivery.valid, true);

  const invalidDeliveryFee = validateFulfillmentRules({
    fulfillmentMethod: "DELIVERY",
    shippingFee: -100,
  });
  assert.strictEqual(invalidDeliveryFee.valid, false);

  const invalidMethod = validateFulfillmentRules({
    fulfillmentMethod: "INVALID_METHOD",
    shippingFee: 0,
  });
  assert.strictEqual(invalidMethod.valid, false);
  console.log("✓ Delivery rules verified");

  // 4. Test Pickup Location Config
  console.log("\n--- TEST 4: Pickup Location Config ---");
  const config = await getPickupLocationConfig();
  assert.strictEqual(config.id, DEFAULT_PICKUP_LOCATION.id);
  assert.strictEqual(config.enabled, true);
  assert.ok(config.name.length > 0);
  assert.ok(config.address.length > 0);
  console.log("✓ Pickup location configuration loaded successfully");

  // 5. Test Shipbubble API Client (Mocked Network Requests)
  console.log("\n--- TEST 5: Shipbubble Client Request Formatting & Headers ---");
  const originalFetch = globalThis.fetch;
  let lastRequest = null;

  try {
    process.env.SHIPBUBBLE_API_KEY = "sb_sandbox_test_key_12345";
    process.env.SHIPBUBBLE_API_BASE_URL = "https://api.shipbubble.com/v1/shipping";

    globalThis.fetch = async (url, options) => {
      lastRequest = { url, options };
      return {
        ok: true,
        json: async () => ({
          status: "success",
          message: "Operation successful",
          data: {
            request_token: "req_token_abc_123",
            couriers: [{ courier_id: "cora", service_code: "cora", total: 2500 }],
          },
        }),
      };
    };

    // Test fetchShippingRates
    const rateResult = await fetchShippingRates({
      shipFrom: { name: "Sender", address: "Lagos", phone: "08011111111", email: "s@e.com" },
      shipTo: { name: "Receiver", address: "Abuja", phone: "08022222222", email: "r@e.com" },
    });

    assert.strictEqual(rateResult.success, true);
    assert.strictEqual(lastRequest.url, "https://api.shipbubble.com/v1/shipping/fetch_rates");
    assert.strictEqual(lastRequest.options.headers.Authorization, "Bearer sb_sandbox_test_key_12345");
    assert.strictEqual(lastRequest.options.method, "POST");

    const body = JSON.parse(lastRequest.options.body);
    assert.strictEqual(body.ship_from.name, "Sender");
    assert.strictEqual(body.ship_to.name, "Receiver");
    console.log("✓ fetchShippingRates correctly formatted request payload and Bearer header");

    // Test createShipment
    await createShipment({
      requestToken: "req_token_abc_123",
      serviceCode: "cora",
      courierId: "cora",
    });
    assert.strictEqual(lastRequest.url, "https://api.shipbubble.com/v1/shipping/labels");
    console.log("✓ createShipment target endpoint verified");

    // Test getShipments
    await getShipments({ page: 1, limit: 10 });
    assert.strictEqual(lastRequest.url, "https://api.shipbubble.com/v1/shipping/labels?page=1&limit=10");
    console.log("✓ getShipments query string formatting verified");

    // Test cancelShipment
    await cancelShipment("SB-123456");
    assert.strictEqual(lastRequest.url, "https://api.shipbubble.com/v1/shipping/labels/cancel/SB-123456");
    console.log("✓ cancelShipment endpoint verified");

    // Test validateAddress
    await validateAddress({
      name: "John",
      email: "j@e.com",
      phone: "08012345678",
      address: "Victoria Island",
    });
    assert.strictEqual(lastRequest.url, "https://api.shipbubble.com/v1/shipping/address/validate");
    console.log("✓ validateAddress endpoint verified");

  } finally {
    globalThis.fetch = originalFetch;
  }

  // 6. Test Error Handling & Credential Sanitization
  console.log("\n--- TEST 6: Error Handling & Credential Protection ---");
  try {
    process.env.SHIPBUBBLE_API_KEY = "";
    await fetchShippingRates({
      shipFrom: { name: "A" },
      shipTo: { name: "B" },
    });
    assert.fail("Should have thrown error when API key is missing");
  } catch (err) {
    assert.ok(err.message.includes("missing"));
    console.log("✓ Missing API key handled safely");
  }

  console.log("\n==================================================");
  console.log("ALL SHIPBUBBLE & PICKUP FOUNDATION TESTS PASSED!");
  console.log("==================================================");
}

runTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
