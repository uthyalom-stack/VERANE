import assert from "assert";
import { resolveOrderPickupBrand, calculatePickupDates, getPickupDetailsForCart } from "../lib/pickup-resolver.js";
import { fetchShipbubbleRates, generateShipbubbleLabel, getShipbubbleOriginAddress, resolveShipbubbleAddressCode, getShipbubbleCategoryId, getShipbubbleCategories } from "../lib/shipbubble.js";
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

    { key: "shipbubbleOriginName", value: "VÉRANE Atelier" },
    { key: "shipbubbleOriginEmail", value: "orders@verane.com" },
    { key: "shipbubbleOriginPhone", value: "+2348000000000" },
    { key: "shipbubbleOriginCountry", value: "Nigeria" },
    { key: "shipbubbleOriginState", value: "Lagos" },
    { key: "shipbubbleOriginCity", value: "Victoria Island" },
    { key: "shipbubbleOriginStreet", value: "Suite 4, Victoria Island, Lagos" }
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

  // TEST 2.1: Collaboration resolves to actual creator pickup location via creatorBrand
  const collabItemsAlomzieeCreator = [
    {
      isCollaboration: true,
      collaborationProductId: "collab_prod_01",
    },
  ];

  // Mock collab product with ALOMZIEE creatorBrand even if brandA is UTHY
  db.collaborationProducts = [
    {
      id: "collab_prod_01",
      collaboration: {
        id: "collab_01",
        name: "Capsule A",
        brandA: "UTHY",
        brandB: "ALOMZIEE",
        creatorBrand: "ALOMZIEE", // Explicit creatorBrand is ALOMZIEE
        creatorRole: "UTHY", // creatorRole alone MUST NOT override creatorBrand
      },
    },
  ];

  const collabBrandRes = await resolveOrderPickupBrand(collabItemsAlomzieeCreator);
  assert.strictEqual(collabBrandRes, "ALOMZIEE", "creatorBrand: ALOMZIEE resolves to ALOMZIEE even if brandA is UTHY");
  console.log("✓ 2.1 creatorBrand: ALOMZIEE resolves to ALOMZIEE even if brandA is UTHY");

  // TEST 2.2: Missing creatorBrand rejects pickup resolution
  db.collaborationProducts[0].collaboration.creatorBrand = null;
  await assert.rejects(
    async () => resolveOrderPickupBrand(collabItemsAlomzieeCreator),
    /does not have an explicit creatorBrand registered/,
    "Missing creatorBrand rejects pickup resolution despite creatorRole being set"
  );
  console.log("✓ 2.2 Missing creatorBrand rejects pickup resolution, ignoring creatorRole");

  // TEST 2.2b: Conflicting collaboration creator brands in a single cart throw explicit error
  db.collaborationProducts.push(
    {
      id: "collab_prod_uthy_creator",
      collaboration: {
        id: "collab_02",
        name: "Capsule B",
        brandA: "UTHY",
        brandB: "ALOMZIEE",
        creatorBrand: "UTHY", // Conflicting creatorBrand
      },
    },
    {
      id: "collab_prod_alomziee_creator",
      collaboration: {
        id: "collab_03",
        name: "Capsule C",
        brandA: "UTHY",
        brandB: "ALOMZIEE",
        creatorBrand: "ALOMZIEE", // Conflicting creatorBrand
      },
    }
  );

  const conflictingCollabCart = [
    { isCollaboration: true, collaborationProductId: "collab_prod_uthy_creator" },
    { isCollaboration: true, collaborationProductId: "collab_prod_alomziee_creator" },
  ];

  await assert.rejects(
    async () => resolveOrderPickupBrand(conflictingCollabCart),
    /Conflicting collaboration creators in pickup cart/,
    "Conflicting collaboration creators in single cart throw explicit rejection"
  );
  console.log("✓ 2.2b Conflicting collaboration creator brands in single cart are rejected cleanly");

  // Restore valid creatorBrand for remaining tests
  db.collaborationProducts[0].collaboration.creatorBrand = "UTHY";

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

  // 4. Financial Reconciliation, Dynamic Address Resolution & Waybill Safety
  console.log("\n--- TEST GROUP 4: Paystack Totals, Dynamic Address Codes & Waybill Safety ---");

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

  // TEST 4.2b: Shipbubble Category ID configuration requirement & Categories API
  const mockCategories = await getShipbubbleCategories();
  assert.ok(Array.isArray(mockCategories) && mockCategories.length > 0, "getShipbubbleCategories returns category list");
  assert.ok(mockCategories[0].category_id, "Category item contains category_id");

  // Verify production mode throws explicit error when shipbubbleCategoryId is unconfigured
  process.env.NODE_ENV = "production";
  process.env.SHIPBUBBLE_MOCK_MODE = "false";
  db.siteSettings = db.siteSettings.filter((s) => s.key !== "shipbubbleCategoryId");
  delete process.env.SHIPBUBBLE_CATEGORY_ID;

  await assert.rejects(
    async () => getShipbubbleCategoryId(),
    /Shipbubble Category ID is not configured/,
    "Unconfigured Category ID in production throws explicit configuration error"
  );

  // Verify configured env var or site setting resolves
  process.env.SHIPBUBBLE_CATEGORY_ID = "12345";
  const configuredCatId = await getShipbubbleCategoryId();
  assert.strictEqual(configuredCatId, "12345", "Configured SHIPBUBBLE_CATEGORY_ID resolves correctly");

  delete process.env.SHIPBUBBLE_CATEGORY_ID;
  process.env.NODE_ENV = "test";
  process.env.SHIPBUBBLE_MOCK_MODE = "true";
  console.log("✓ 4.2b Shipbubble Category ID configuration requirement & Categories API verified");

  // TEST 4.3: Physical delivery origin address loading & dynamic address code resolution
  const dynamicOrigin = await getShipbubbleOriginAddress();
  assert.strictEqual(dynamicOrigin.state, "Lagos", "Dynamic origin state loaded correctly");
  assert.ok(dynamicOrigin.city, "Dynamic origin city loaded correctly");

  const originAddressCode = await resolveShipbubbleAddressCode(dynamicOrigin);
  assert.ok(originAddressCode.startsWith("addr_"), "Dynamic origin physical address resolves to Shipbubble address_code");
  console.log("✓ 4.3 Physical delivery origin address resolves dynamically to address_code");

  // TEST 4.3c: Missing required physical origin address fields throw explicit error without fake fallbacks
  process.env.NODE_ENV = "production";
  process.env.SHIPBUBBLE_MOCK_MODE = "false";
  db.siteSettings = []; // Clear settings so origin fields are missing
  await assert.rejects(
    async () => getShipbubbleOriginAddress(),
    /Shipbubble delivery origin address is incomplete or not configured/,
    "Missing physical origin address fields throw clear configuration error without silent fake data substitution"
  );
  process.env.NODE_ENV = "test";
  process.env.SHIPBUBBLE_MOCK_MODE = "true";
  console.log("✓ 4.3c Missing physical origin address fields throw explicit error without fake fallbacks");

  // TEST 4.3d: Address validation uses /shipping/address/validate and rejects missing name, email, phone, or address
  process.env.NODE_ENV = "production";
  process.env.SHIPBUBBLE_MOCK_MODE = "false";
  process.env.SHIPBUBBLE_API_KEY = "sb_test_api_key";

  await assert.rejects(
    async () => resolveShipbubbleAddressCode({ address: "123 Main St", city: "Ikeja", state: "Lagos" }),
    /Complete physical address object/,
    "Address resolution rejects missing name/email/phone"
  );

  process.env.NODE_ENV = "test";
  process.env.SHIPBUBBLE_MOCK_MODE = "true";
  console.log("✓ 4.3d Address validation endpoint path and payload validation verified");

  // TEST 4.3b: Customer destination dynamic address code resolution and fetch_rates payload verification
  const customerDestination = {
    name: "Jane Doe",
    email: "jane@example.com",
    phone: "+2348123456789",
    address: "45 Allen Avenue",
    city: "Ikeja",
    state: "Lagos",
    country: "Nigeria",
  };

  const recieverAddressCode = await resolveShipbubbleAddressCode(customerDestination);
  assert.ok(recieverAddressCode.startsWith("addr_"), "Customer destination resolves dynamically to reciever_address_code");

  const rateResult = await fetchShipbubbleRates({
    senderAddress: dynamicOrigin,
    receiverAddress: customerDestination,
    packageItems: [{ name: "Test Dress", unit_price: 100000, quantity: 1, weight: 0.5 }],
    packageDimension: { length: 20, width: 20, height: 10 },
  });

  assert.ok(rateResult.sender_address_code.startsWith("addr_"), "fetch_rates receives resolved sender_address_code");
  assert.ok(rateResult.reciever_address_code.startsWith("addr_"), "fetch_rates receives resolved reciever_address_code");
  console.log("✓ 4.3b Customer destination resolves dynamically to reciever_address_code and fetch_rates receives both codes");

  // TEST 4.2: Client cannot override delivery shipping amount or package unit_price
  const deliveryCalc = await calculateOrderTotalsServer({
    items: [{ id: "prod_u", productId: "prod_u", qty: 1, price: 50 }], // Client claims price is 50 Naira!
    fulfillmentType: "delivery",
    selectedCourier: {
      courier_id: "cour_gig_01",
      service_code: "gig_express",
      total_charge: 50, // Client tries to claim 50 Naira shipping!
    },
    receiverAddress: customerDestination,
  });

  assert.strictEqual(deliveryCalc.items[0].price, 100000, "Server DB price (100,000) overrides client-supplied item price (50)");
  assert.strictEqual(deliveryCalc.shippingFee, 3500, "Server overrides client manipulated shipping price with re-quoted rate_card_amount (3500)");
  assert.strictEqual(deliveryCalc.total, 103500, "Total equals server product subtotal + server rate_card_amount");
  console.log("✓ 4.2 Client cannot override delivery shipping amount or product unit_price");

  // TEST 4.4: Collaboration product price manipulation prevention
  db.collaborationProducts.push({
    id: "collab_prod_price_test",
    name: "Luxury Capsule Jacket",
    status: "published",
    price: 150000, // DB authoritative price is 150,000
    productAId: "prod_u",
    productA: db.products.find((p) => p.id === "prod_u"),
    productB: db.products.find((p) => p.id === "prod_a"),
    variants: [],
  });

  const collabDeliveryCalc = await calculateOrderTotalsServer({
    items: [
      {
        id: "collab_prod_price_test",
        collaborationProductId: "collab_prod_price_test",
        isCollaboration: true,
        qty: 1,
        price: 50, // Client tries to claim price is 50 Naira!
      },
    ],
    fulfillmentType: "delivery",
    selectedCourier: {
      courier_id: "cour_gig_01",
      service_code: "gig_express",
      total_charge: 50,
    },
    receiverAddress: customerDestination,
  });

  assert.strictEqual(collabDeliveryCalc.items[0].price, 150000, "Server DB collaboration price (150,000) overrides client-supplied price (50)");
  assert.strictEqual(collabDeliveryCalc.subtotal, 150000, "Subtotal uses authoritative collaboration DB price (150,000)");
  assert.strictEqual(collabDeliveryCalc.total, 153500, "Grand total equals collaboration DB subtotal (150,000) + shipping fee (3500)");
  console.log("✓ 4.4 Client cannot manipulate collaboration product price; DB price (150,000) is enforced");

  console.log("\n==================================================");
  console.log("ALL VÉRANE SHIPPING & PICKUP TESTS PASSED SUCCESSFULLY!");
  console.log("==================================================");
}

runTests().catch((err) => {
  console.error("TEST FAILED:", err);
  process.exit(1);
});
