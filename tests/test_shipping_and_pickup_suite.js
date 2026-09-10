import assert from "assert";
import { resolveOrderPickupBrand, calculatePickupDates, getPickupDetailsForCart } from "../lib/pickup-resolver.js";
import { fetchShipbubbleRates, generateShipbubbleLabel } from "../lib/shipbubble.js";
import { calculateOrderTotalsServer } from "../lib/paystack.js";
import { resolveItemUnitWeight, calculateParcelPackageDetails, isValidCategoryShippingWeight } from "../lib/shipping-weights.js";
import { db } from "./mock_prisma.js";

async function runTests() {
  console.log("=== RUNNING VÉRANE EXPANDED SHIPPING & PICKUP TEST SUITE ===");

  process.env.NODE_ENV = "test";
  process.env.SHIPBUBBLE_MOCK_MODE = "true";

  // Clear mock database tables
  db.products = [];
  db.siteSettings = [];

  // Seed mock DB product with authoritative weight override
  db.products.push({
    id: "test_prod_override",
    name: "Heavy Heavy Coat",
    price: 90000,
    weight: 1.20, // Override: 1.20 KG
    inventory: 10,
    preOrderEnabled: false,
    categoryRef: { shippingWeight: 0.60 },
    variants: [],
  });

  // Seed mock DB product without override (uses category weight)
  db.products.push({
    id: "test_prod_category",
    name: "Category Weight Jeans",
    price: 45000,
    weight: null,
    inventory: 10,
    preOrderEnabled: false,
    categoryRef: { shippingWeight: 0.70 },
    variants: [],
  });

  // Seed mock DB product with MISSING weights on both product and category
  db.products.push({
    id: "test_prod_missing_weights",
    name: "Unconfigured Weight Silk Top",
    price: 30000,
    weight: null,
    inventory: 10,
    preOrderEnabled: false,
    categoryRef: { shippingWeight: null },
    variants: [],
  });

  // Seed site settings for pickup address and operating parameters
  db.siteSettings.push(
    { key: "uthyPickupAddress", value: "UTHY LUXURY Atelier, Victoria Island, Lagos" },
    { key: "uthyImmediatePickupEnabled", value: "true" },
    { key: "uthyPickupInstructions", value: "Show ID upon arrival." },
    { key: "uthyPickupLeadDays", value: "2" },
    { key: "uthyPickupAllowedDays", value: '["MON", "TUE", "WED", "THU", "FRI", "SAT"]' },

    { key: "alomzieePickupAddress", value: "ALOMZIEE FOOTIES Boutique, Ikoyi, Lagos" },
    { key: "alomzieeImmediatePickupEnabled", value: "false" },
    { key: "alomzieePickupInstructions", value: "Show receipt upon arrival." },
    { key: "alomzieePickupLeadDays", value: "2" },
    { key: "alomzieePickupAllowedDays", value: '["MON", "TUE", "WED", "THU", "FRI", "SAT"]' },

    { key: "shipbubbleSenderAddressCode", value: "addr_origin_verane_01" }
  );

  // 1. Weight Tests
  console.log("\n--- TEST GROUP 1: Shipping Weight Architecture ---");

  // TEST 1.1: Product weight override beats category weight
  const overrideWeight = resolveItemUnitWeight(db.products[0]);
  assert.strictEqual(overrideWeight, 1.20, "Product.weight (1.20 KG) beats Category.shippingWeight (0.60 KG)");
  console.log("✓ 1.1 Product weight override beats category weight");

  // TEST 1.2: Product null weight uses category weight
  const categoryWeight = resolveItemUnitWeight(db.products[1]);
  assert.strictEqual(categoryWeight, 0.70, "Product null weight uses Category.shippingWeight (0.70 KG)");
  console.log("✓ 1.2 Product null weight uses category weight");

  // TEST 1.3: Missing both weights fails clearly
  assert.throws(
    () => resolveItemUnitWeight(db.products[2]),
    /Shipping weight configuration missing/,
    "Missing both product and category weights throws explicit error without silent fallbacks"
  );
  console.log("✓ 1.3 Missing both weights fails clearly without silent arbitrary fallback");

  // TEST 1.4: Quantity multiplies resolved weight
  const parcelDetails = calculateParcelPackageDetails([
    { product: db.products[0], qty: 3 }, // 3 * 1.20 = 3.60 KG
    { product: db.products[1], qty: 2 }, // 2 * 0.70 = 1.40 KG
  ]);
  assert.strictEqual(parcelDetails.weight, 5.00, "Total weight = 3*1.20 + 2*0.70 = 5.00 KG");
  console.log("✓ 1.4 Quantity multiplies resolved weight correctly");

  // TEST 1.5: Category weight validation range 0.15 - 1.50 KG
  assert.strictEqual(isValidCategoryShippingWeight(0.15), true, "0.15 KG is valid");
  assert.strictEqual(isValidCategoryShippingWeight(1.50), true, "1.50 KG is valid");
  assert.strictEqual(isValidCategoryShippingWeight(0.10), false, "0.10 KG is invalid (<0.15)");
  assert.strictEqual(isValidCategoryShippingWeight(2.00), false, "2.00 KG is invalid (>1.50)");
  console.log("✓ 1.5 Category weight validation 0.15–1.50 KG enforced");

  // 2. Pickup Precedence & Creator Identity
  console.log("\n--- TEST GROUP 2: Collaboration Creator & Pickup Precedence ---");

  // TEST 2.1: Collaboration resolves to actual creator pickup location via creatorRole
  const collabItemsUthyCreator = [
    {
      isCollaboration: true,
      collaborationProductId: "collab_prod_01",
    },
  ];

  // Mock collab product with UTHY creatorRole
  db.collaborationProducts = [
    {
      id: "collab_prod_01",
      collaboration: {
        id: "collab_01",
        name: "Capsule A",
        brandA: "ALOMZIEE",
        brandB: "UTHY",
        creatorRole: "UTHY", // Actual creator is UTHY despite brandA being ALOMZIEE
      },
    },
  ];

  const collabBrandRes = await resolveOrderPickupBrand(collabItemsUthyCreator);
  assert.strictEqual(collabBrandRes, "UTHY", "Collaboration resolves to actual creator UTHY regardless of brandA");
  console.log("✓ 2.1 Collaboration resolves to actual creator pickup location");

  // TEST 2.2: Collaboration does not use brandA as creator fallback
  db.collaborationProducts[0].collaboration.creatorRole = null;
  db.collaborationProducts[0].collaboration.creatorBrand = null;
  await assert.rejects(
    async () => resolveOrderPickupBrand(collabItemsUthyCreator),
    /does not have an explicit creator registered/,
    "Unregistered creator throws explicit error and rejects brandA fallback"
  );
  console.log("✓ 2.2 Collaboration does not use brandA as creator fallback");

  // Restore valid creator for remaining tests
  db.collaborationProducts[0].collaboration.creatorRole = "UTHY";

  // Add standalone products to mock DB for standalone brand tests
  db.products.push(
    { id: "prod_u", name: "UTHY Silk Dress", brand: "UTHY", price: 100000, weight: 0.5 },
    { id: "prod_a", name: "ALOMZIEE Heel", brand: "ALOMZIEE", price: 80000, weight: 0.8 }
  );

  // TEST 2.3: Mixed standalone UTHY + ALOMZIEE resolves to UTHY
  const mixedBrandRes = await resolveOrderPickupBrand([
    { productId: "prod_u", brand: "UTHY" },
    { productId: "prod_a", brand: "ALOMZIEE" },
  ]);
  assert.strictEqual(mixedBrandRes, "UTHY", "Mixed standalone UTHY + ALOMZIEE resolves to UTHY");
  console.log("✓ 2.3 Mixed standalone UTHY + ALOMZIEE resolves to UTHY");

  // TEST 2.4: UTHY-only resolves to UTHY
  const uthyOnlyRes = await resolveOrderPickupBrand([{ productId: "prod_u", brand: "UTHY" }]);
  assert.strictEqual(uthyOnlyRes, "UTHY", "UTHY-only resolves to UTHY");
  console.log("✓ 2.4 UTHY-only resolves to UTHY");

  // TEST 2.5: ALOMZIEE-only resolves to ALOMZIEE
  const alomzieeOnlyRes = await resolveOrderPickupBrand([{ productId: "prod_a", brand: "ALOMZIEE" }]);
  assert.strictEqual(alomzieeOnlyRes, "ALOMZIEE", "ALOMZIEE-only resolves to ALOMZIEE");
  console.log("✓ 2.5 ALOMZIEE-only resolves to ALOMZIEE");

  // TEST 2.6: Database failure during pickup resolution does not silently resolve to UTHY
  await assert.rejects(
    async () => resolveOrderPickupBrand([{ isCollaboration: true, collaborationProductId: "non_existent_collab_id" }]),
    /not found in database/,
    "Database lookup failure for collaboration product throws error instead of silently returning UTHY"
  );
  console.log("✓ 2.6 Database failure during pickup resolution throws clear error without silent UTHY fallback");

  // 3. Admin Permissions & Operating Dates
  console.log("\n--- TEST GROUP 3: Admin Authorization & Date Scheduling ---");

  // TEST 3.1: Customer only receives admin-permitted pickup dates
  const baseDate = new Date("2026-10-01T10:00:00Z"); // Thursday
  const customDates = calculatePickupDates({
    immediateEnabled: false,
    leadDays: 2,
    allowedDaysOfWeek: ["MON", "WED", "FRI"], // Only Mon, Wed, Fri
    dateCount: 3,
  }, baseDate);

  assert.strictEqual(customDates.length, 3, "Returns 3 requested permitted dates");
  // Oct 1 Thu + 2 lead = Oct 3 Sat (skip), Oct 4 Sun (skip), Oct 5 Mon (Match #1: 2026-10-05)
  assert.strictEqual(customDates[0].value, "2026-10-05", "First permitted date is Mon Oct 5");
  assert.strictEqual(customDates[1].value, "2026-10-07", "Second permitted date is Wed Oct 7");
  assert.strictEqual(customDates[2].value, "2026-10-09", "Third permitted date is Fri Oct 9");
  console.log("✓ 3.1 Customer only receives admin-permitted operating days");

  // 4. Financial Reconciliation & Waybill Safety
  console.log("\n--- TEST GROUP 4: Paystack Totals & Waybill Safety ---");

  // TEST 4.1: Pickup shipping fee is ₦0
  const pickupDetails = await getPickupDetailsForCart([{ productId: "prod_u", brand: "UTHY", qty: 1 }]);
  const validDate = pickupDetails.availableDates[0].value;

  const pickupCalc = await calculateOrderTotalsServer({
    items: [{ id: "prod_u", productId: "prod_u", qty: 1, price: 100000 }],
    fulfillmentType: "pickup",
    requestedPickupDate: validDate,
  });

  assert.strictEqual(pickupCalc.shippingFee, 0, "Pickup shipping fee must be strictly ₦0");
  assert.strictEqual(pickupCalc.total, 100000, "Pickup grand total equals product total");
  console.log("✓ 4.1 Pickup shipping fee is ₦0");

  // TEST 4.2: Client cannot override delivery shipping amount
  const deliveryCalc = await calculateOrderTotalsServer({
    items: [{ id: "prod_u", productId: "prod_u", qty: 1, price: 100000 }],
    fulfillmentType: "delivery",
    selectedCourier: {
      courier_id: "cour_gig_01",
      service_code: "gig_express",
      total_charge: 50, // Client tries to claim 50 Naira!
    },
    receiverAddress: { state: "Lagos", city: "Ikeja" },
  });

  assert.strictEqual(deliveryCalc.shippingFee, 3500, "Server overrides client manipulated price with re-quoted rate_card_amount (3500)");
  assert.strictEqual(deliveryCalc.total, 103500, "Total equals product subtotal + server rate_card_amount");
  console.log("✓ 4.2 Client cannot override delivery shipping amount");

  console.log("\n==================================================");
  console.log("ALL VÉRANE SHIPPING & PICKUP TESTS PASSED SUCCESSFULLY!");
  console.log("==================================================");
}

runTests().catch((err) => {
  console.error("TEST FAILED:", err);
  process.exit(1);
});
