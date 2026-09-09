import assert from "node:assert";
import {
  FULFILLMENT_METHODS,
  FULFILLMENT_STATUSES,
  validateFulfillmentRules,
  getBrandPickupConfig,
} from "../lib/fulfillment.js";
import {
  fetchShippingRates,
  createShipment,
  getShipments,
  cancelShipment,
  validateAddress,
} from "../lib/shipbubble.js";

async function runTests() {
  console.log("=== RUNNING VÉRANE SHIPBUBBLE & FULFILLMENT SUITE V2 ===");

  // 1. Test FULFILLMENT_METHODS and FULFILLMENT_STATUSES constants
  console.log("\n--- TEST 1: Fulfillment Constants ---");
  assert.strictEqual(FULFILLMENT_METHODS.DELIVERY, "DELIVERY");
  assert.strictEqual(FULFILLMENT_METHODS.PICKUP, "PICKUP");
  assert.strictEqual(FULFILLMENT_STATUSES.UNFULFILLED, "UNFULFILLED");
  assert.strictEqual(FULFILLMENT_STATUSES.DISPATCHED, "DISPATCHED");
  console.log("✓ Fulfillment constants verified");

  // 2. Test validateFulfillmentRules
  console.log("\n--- TEST 2: Fulfillment Validation Rules ---");
  assert.strictEqual(validateFulfillmentRules({ fulfillmentMethod: "PICKUP", shippingFee: 0 }).valid, true);
  assert.strictEqual(validateFulfillmentRules({ fulfillmentMethod: "PICKUP", shippingFee: 1500 }).valid, false);
  assert.strictEqual(validateFulfillmentRules({ fulfillmentMethod: "DELIVERY", shippingFee: 2500 }).valid, true);
  assert.strictEqual(validateFulfillmentRules({ fulfillmentMethod: "DELIVERY", shippingFee: -100 }).valid, false);
  console.log("✓ Fulfillment validation rules verified");

  // 3. Test Brand Pickup Configuration
  console.log("\n--- TEST 3: Brand Pickup Configuration ---");
  const uthyPickup = await getBrandPickupConfig("UTHY_LUXURY");
  assert.strictEqual(uthyPickup.id, "uthy_flagship");
  assert.strictEqual(uthyPickup.brand, "UTHY_LUXURY");

  const alomzieePickup = await getBrandPickupConfig("ALOMZIEE_FOOTIES");
  assert.strictEqual(alomzieePickup.id, "alomziee_flagship");
  assert.strictEqual(alomzieePickup.brand, "ALOMZIEE_FOOTIES");
  console.log("✓ Brand pickup configurations loaded safely");

  // 4. Test Shipbubble Client Request & Bearer Formatting
  console.log("\n--- TEST 4: Shipbubble API Contract & Mock Fetch ---");
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
            request_token: "req_tok_987654321",
            couriers: [
              {
                courier_id: "cora",
                courier_name: "CORA Express",
                service_code: "cora_std",
                rate_card_amount: 2500,
                total: 2500,
                delivery_eta: "2-3 days",
              },
            ],
          },
        }),
      };
    };

    const rateResult = await fetchShippingRates({
      shipFrom: { name: "Sender", address: "Lagos", phone: "08011111111", email: "s@verane.com" },
      shipTo: { name: "Receiver", address: "Abuja", phone: "08022222222", email: "r@verane.com" },
      packageItems: [{ name: "Gown", quantity: 1, amount: 50000 }],
    });

    assert.strictEqual(rateResult.success, true);
    assert.strictEqual(lastRequest.url, "https://api.shipbubble.com/v1/shipping/fetch_rates");
    assert.strictEqual(lastRequest.options.headers.Authorization, "Bearer sb_sandbox_test_key_12345");
    assert.strictEqual(lastRequest.options.method, "POST");

    const body = JSON.parse(lastRequest.options.body);
    assert.strictEqual(body.ship_from.name, "Sender");
    assert.strictEqual(body.ship_to.name, "Receiver");
    assert.strictEqual(body.package_items.length, 1);
    console.log("✓ fetchShippingRates payload and Bearer header verified");

    // Test createShipment
    await createShipment({
      requestToken: "req_tok_987654321",
      serviceCode: "cora_std",
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
      email: "j@verane.com",
      phone: "08012345678",
      address: "Victoria Island, Lagos",
    });
    assert.strictEqual(lastRequest.url, "https://api.shipbubble.com/v1/shipping/address/validate");
    console.log("✓ validateAddress endpoint verified");

  } finally {
    globalThis.fetch = originalFetch;
  }

  // 5. Test Missing API Key Protection
  console.log("\n--- TEST 5: Credential Security Guard ---");
  try {
    process.env.SHIPBUBBLE_API_KEY = "";
    await fetchShippingRates({
      shipFrom: { name: "Sender" },
      shipTo: { name: "Receiver" },
    });
    assert.fail("Should have thrown error when API key is missing");
  } catch (err) {
    assert.ok(err.message.includes("missing"));
    console.log("✓ Missing API key handled safely");
  }

  console.log("\n==================================================");
  console.log("ALL VÉRANE SHIPBUBBLE & FULFILLMENT TESTS PASSED!");
  console.log("==================================================");
}

runTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
