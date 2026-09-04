import path from "path";
import { pathToFileURL } from "url";

const repoRoot = process.cwd();

const mockPrismaPath = pathToFileURL(path.join(repoRoot, "tests/mock_prisma.js")).href;
const deliveryRoutePath = pathToFileURL(path.join(repoRoot, "app/api/delivery/route.js")).href;

const { db, resetDb } = await import(mockPrismaPath);
const { GET: getDelivery } = await import(deliveryRoutePath);

/**
 * Runs delivery API fail-closed security test suite verifying proper error handling for database failures and missing configurations.
 * @returns {Promise<Object>} Test results with passed and failed counts.
 */
export async function runDeliveryApiSecurityTests() {
  console.log("=== RUNNING VÉRANE DELIVERY API FAIL-CLOSED SECURITY SUITE ===\n");
  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`✓ [PASS] ${message}`);
      passed++;
    } else {
      console.error(`✗ [FAIL] ${message}`);
      failed++;
    }
  }

  try {
    // TEST 1: Normal State Default Pricing
    console.log("--- Test 1: Normal State Default Pricing ---");
    resetDb();
    db.deliveryStates.push({
      id: "ds_1",
      state: "Lagos",
      enabled: true,
      pricingMode: "STATE_DEFAULT",
      defaultFee: 3500,
      cities: [],
    });

    const req1 = new Request("http://localhost/api/delivery?country=Nigeria&state=Lagos");
    const res1 = await getDelivery(req1);
    const data1 = await res1.json();
    assert(res1.status === 200 && data1.success === true && data1.fee === 3500, "Configured State Default pricing returns HTTP 200 with correct fee ₦3,500");

    // TEST 2: Normal City-Specific Pricing
    console.log("\n--- Test 2: Normal City-Specific Pricing ---");
    resetDb();
    db.deliveryStates.push({
      id: "ds_2",
      state: "Lagos",
      enabled: true,
      pricingMode: "CITY_SPECIFIC",
      defaultFee: 4000,
      cities: [
        { id: "c_1", city: "Ikeja", fee: 2500, enabled: true },
        { id: "c_2", city: "Lekki", fee: 5000, enabled: true },
      ],
    });

    const req2 = new Request("http://localhost/api/delivery?country=Nigeria&state=Lagos&city=Ikeja");
    const res2 = await getDelivery(req2);
    const data2 = await res2.json();
    assert(res2.status === 200 && data2.success === true && data2.fee === 2500, "Configured City Specific pricing returns HTTP 200 with correct city fee ₦2,500");

    // TEST 3: Database Lookup Exception (Fail-Closed to HTTP 500)
    console.log("\n--- Test 3: Database Lookup Exception (Fail-Closed) ---");
    resetDb();
    db.shouldThrow = true; // Simulate DB connection drop

    const req3 = new Request("http://localhost/api/delivery?country=Nigeria&state=Lagos&city=Ikeja");
    const res3 = await getDelivery(req3);
    const data3 = await res3.json();
    assert(res3.status === 500 && data3.success === false && data3.error.includes("database error"), "Database failure returns HTTP 500 (success: false) instead of silent ₦0 price");

    // TEST 4: Missing State Configuration (Fail-Closed to HTTP 503)
    console.log("\n--- Test 4: Unconfigured/Disabled State (Fail-Closed) ---");
    resetDb(); // Empty DB, state not configured

    const req4 = new Request("http://localhost/api/delivery?country=Nigeria&state=Lagos");
    const res4 = await getDelivery(req4);
    const data4 = await res4.json();
    assert(res4.status === 503 && data4.success === false && data4.error.includes("unconfigured"), "Unconfigured state returns HTTP 503 (success: false) instead of ₦0 price");

    // TEST 5: City-Specific Pricing Without Fallback Default Fee (Fail-Closed to HTTP 422)
    console.log("\n--- Test 5: Missing LGA Fee Without Valid Default Fee ---");
    resetDb();
    db.deliveryStates.push({
      id: "ds_3",
      state: "Lagos",
      enabled: true,
      pricingMode: "CITY_SPECIFIC",
      defaultFee: null, // Invalid default fee
      cities: [],
    });

    const req5 = new Request("http://localhost/api/delivery?country=Nigeria&state=Lagos&city=UnknownLGA");
    const res5 = await getDelivery(req5);
    const data5 = await res5.json();
    assert(res5.status === 422 && data5.success === false, "Missing LGA fee without valid state default fee returns HTTP 422 (success: false)");

    // TEST 6: Malformed Pricing Data (NaN / String / Negative)
    console.log("\n--- Test 6: Malformed Fee Data (Fail-Closed) ---");
    resetDb();
    db.deliveryStates.push({
      id: "ds_4",
      state: "Lagos",
      enabled: true,
      pricingMode: "STATE_DEFAULT",
      defaultFee: "invalid-string", // Malformed fee
      cities: [],
    });

    const req6 = new Request("http://localhost/api/delivery?country=Nigeria&state=Lagos");
    const res6 = await getDelivery(req6);
    const data6 = await res6.json();
    assert(res6.status === 422 && data6.success === false, "Malformed non-numeric fee returns HTTP 422 (success: false)");

    // TEST 7: Invalid State Parameter (Fail-Closed to HTTP 400)
    console.log("\n--- Test 7: Invalid State Selection ---");
    resetDb();

    const req7 = new Request("http://localhost/api/delivery?country=Nigeria&state=NonexistentState");
    const res7 = await getDelivery(req7);
    const data7 = await res7.json();
    assert(res7.status === 400 && data7.success === false, "Unrecognized Nigerian state parameter returns HTTP 400 (success: false)");

  } catch (error) {
    console.error("Test execution error:", error);
    failed++;
  } finally {
    resetDb();
  }

  console.log(`\n==================================================`);
  console.log(`DELIVERY API TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log(`==================================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

if (process.argv[1] && process.argv[1].endsWith("test_delivery_api.js")) {
  runDeliveryApiSecurityTests();
}
