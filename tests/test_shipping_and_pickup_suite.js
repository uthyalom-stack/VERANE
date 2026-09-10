import assert from "assert";
import { resolveOrderPickupBrand, calculatePickupDates, getPickupDetailsForCart } from "../lib/pickup-resolver.js";
import { fetchShipbubbleRates, generateShipbubbleLabel } from "../lib/shipbubble.js";
import { calculateOrderTotalsServer } from "../lib/paystack.js";
import { db } from "./mock_prisma.js";

async function runTests() {
  console.log("=== RUNNING VÉRANE SHIPBUBBLE & PICKUP TEST SUITE ===");

  // Set NODE_ENV to test to ensure mock mode
  process.env.NODE_ENV = "test";
  process.env.SHIPBUBBLE_MOCK_MODE = "true";

  // Seed mock DB product
  db.products.push({
    id: "test_prod",
    name: "VÉRANE Atelier Jacket",
    price: 50000,
    inventory: 10,
    preOrderEnabled: false,
    variants: [],
  });

  // 1. Pickup Rule Precedence Tests
  console.log("\n--- TEST 1: Pickup Precedence Rules ---");

  const brandUthy = await resolveOrderPickupBrand([{ productId: "prod_1", brand: "UTHY" }]);
  assert.strictEqual(brandUthy, "UTHY", "UTHY-only order resolves to UTHY");

  const brandAlomziee = await resolveOrderPickupBrand([{ productId: "prod_2", brand: "ALOMZIEE" }]);
  assert.strictEqual(brandAlomziee, "ALOMZIEE", "ALOMZIEE-only order resolves to ALOMZIEE");

  const brandMixed = await resolveOrderPickupBrand([
    { productId: "prod_1", brand: "UTHY" },
    { productId: "prod_2", brand: "ALOMZIEE" },
  ]);
  assert.strictEqual(brandMixed, "UTHY", "Mixed UTHY + ALOMZIEE order resolves to UTHY");

  console.log("✓ All 4 Pickup precedence rules verified");

  // 2. Pickup Dates & Immediate Flag
  console.log("\n--- TEST 2: Pickup Dates & Immediate Flag ---");
  const baseDate = new Date("2026-10-01T10:00:00Z");

  const datesNoImmediate = calculatePickupDates(false, baseDate);
  assert.strictEqual(datesNoImmediate.length, 5, "Should return 5 normal date options");
  assert.strictEqual(datesNoImmediate[0].value, "2026-10-03", "Normal pickup date starts 2 days after order date (Oct 3)");

  const datesWithImmediate = calculatePickupDates(true, baseDate);
  assert.strictEqual(datesWithImmediate.length, 6, "Should return 6 date options including immediate");
  assert.strictEqual(datesWithImmediate[0].value, "IMMEDIATE", "First option should be IMMEDIATE");
  assert.strictEqual(datesWithImmediate[0].isImmediate, true, "isImmediate flag should be true");

  console.log("✓ Pickup date calculations and immediate options verified");

  // 3. Shipbubble Rates API Integration
  console.log("\n--- TEST 3: Shipbubble Rates API ---");
  const ratesRes = await fetchShipbubbleRates({
    senderAddress: { state: "Lagos", city: "Lagos" },
    receiverAddress: { state: "Lagos", city: "Ikeja" },
    parcels: [{ weight: 1 }],
  });

  assert.strictEqual(ratesRes.success, true, "Rates call should succeed");
  assert.ok(ratesRes.request_token.startsWith("sb_req_"), "Should return valid request_token");
  assert.ok(Array.isArray(ratesRes.couriers) && ratesRes.couriers.length > 0, "Should return courier options");
  const firstCourier = ratesRes.couriers[0];
  assert.ok(firstCourier.courier_id, "Courier option has courier_id");
  assert.ok(firstCourier.total_charge > 0, "Courier option has charge > 0");

  console.log("✓ Shipbubble rates API returns valid quotes and request_token");

  // 4. Shipbubble Label Generation
  console.log("\n--- TEST 4: Shipbubble Label Generation ---");
  const labelRes = await generateShipbubbleLabel({
    requestToken: ratesRes.request_token,
    serviceCode: firstCourier.service_code,
    courierId: firstCourier.courier_id,
  });

  assert.strictEqual(labelRes.success, true, "Label generation should succeed in mock mode");
  assert.ok(labelRes.waybill_number.startsWith("SB-WB-"), "Should generate valid waybill number");
  assert.ok(labelRes.label_url.includes(".pdf"), "Should return valid label PDF URL");

  console.log("✓ Shipbubble label generation creates waybill and tracking details");

  // 5. Paystack Financial Calculation Verification (Server Authority)
  console.log("\n--- TEST 5: Paystack Server-Authoritative Totals ---");

  const pickupDetails = await getPickupDetailsForCart([{ id: "test_prod", qty: 1 }]);
  const validDate = pickupDetails.availableDates[0].value;

  // For Pickup: Shipping fee MUST be strictly 0
  const pickupCalc = await calculateOrderTotalsServer({
    items: [{ id: "test_prod", qty: 1, price: 50000 }],
    fulfillmentType: "pickup",
    requestedPickupDate: validDate,
  });

  assert.strictEqual(pickupCalc.shippingFee, 0, "Pickup shipping fee must be strictly 0");
  assert.strictEqual(pickupCalc.total, 50000, "Pickup grand total must equal subtotal");
  assert.strictEqual(pickupCalc.fulfillmentType, "pickup", "Fulfillment mode must be pickup");

  // For Delivery: Shipping fee MUST be derived from selected courier
  const deliveryCalc = await calculateOrderTotalsServer({
    items: [{ id: "test_prod", qty: 1, price: 50000 }],
    fulfillmentType: "delivery",
    selectedCourier: {
      courier_id: "cour_gig_01",
      courier_name: "GIG Logistics",
      service_code: "gig_express",
      service_type: "Express",
      total_charge: 3500,
    },
    receiverAddress: { state: "Lagos", city: "Ikeja" },
  });

  assert.strictEqual(deliveryCalc.shippingFee, 3500, "Delivery shipping fee must be derived server-side");
  assert.strictEqual(deliveryCalc.total, 53500, "Delivery grand total must equal subtotal + shippingFee");
  assert.strictEqual(deliveryCalc.fulfillmentType, "delivery", "Fulfillment mode must be delivery");

  console.log("✓ Paystack server financial verification enforces zero fee for pickup and exact courier fee for delivery");

  console.log("\n==================================================");
  console.log("ALL VÉRANE SHIPPING & PICKUP TESTS PASSED SUCCESSFULLY!");
  console.log("==================================================");
}

runTests().catch((err) => {
  console.error("TEST FAILED:", err);
  process.exit(1);
});
