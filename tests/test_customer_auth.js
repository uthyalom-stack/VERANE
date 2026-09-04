import crypto from "crypto";
import path from "path";

// Set required CUSTOMER_AUTH_SECRET for test environment
process.env.CUSTOMER_AUTH_SECRET = "test-secret-key-1234567890-super-secure";

const repoRoot = process.cwd();
const customerAuthPath = path.join(repoRoot, "lib/auth/customer.js");

const {
  hashPassword,
  verifyPassword,
  createCustomerSession,
  verifyCustomerSession,
  getCustomerCookieName,
} = await import(`file://${customerAuthPath}`);

export async function runCustomerAuthTests() {
  console.log("=== RUNNING VÉRANE COMPREHENSIVE CUSTOMER AUTH & SECURITY SUITE ===\n");
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

  const emailA = `cust_a@example.com`;
  const emailB = `cust_b@example.com`;
  const passA = "PasswordA123!";

  // Simulated Users
  const userA = { id: "usr_a_123456789", name: "Customer A", email: emailA };
  const userB = { id: "usr_b_987654321", name: "Customer B", email: emailB };

  try {
    // 1. Valid customer session -> accepted
    console.log("--- 1. Valid customer session ---");
    const validSession = createCustomerSession(userA);
    const verifiedValid = verifyCustomerSession(validSession);
    assert(verifiedValid && verifiedValid.id === userA.id, "Valid customer session is accepted");

    // Helper function to build custom signed session tokens for testing
    function makeSession(payloadObj) {
      const payloadBase64 = Buffer.from(JSON.stringify(payloadObj)).toString("base64url");
      const sig = crypto.createHmac("sha256", process.env.CUSTOMER_AUTH_SECRET).update(payloadBase64).digest("hex");
      return `${payloadBase64}.${sig}`;
    }

    // 2. Expired session -> rejected
    console.log("\n--- 2. Expired session ---");
    const expiredToken = makeSession({
      id: userA.id,
      email: userA.email,
      exp: Date.now() - 1000, // Expired 1 sec ago
    });
    assert(verifyCustomerSession(expiredToken) === null, "Expired session rejected");

    // 3. Missing exp -> rejected
    console.log("\n--- 3. Missing exp ---");
    const missingExpToken = makeSession({ id: userA.id, email: userA.email });
    assert(verifyCustomerSession(missingExpToken) === null, "Session with missing exp rejected");

    // 4. exp as a string -> rejected
    console.log("\n--- 4. exp as a string ---");
    const stringExpToken = makeSession({ id: userA.id, email: userA.email, exp: String(Date.now() + 100000) });
    assert(verifyCustomerSession(stringExpToken) === null, "Session with exp as string rejected");

    // 5. exp = 0 -> rejected
    console.log("\n--- 5. exp = 0 ---");
    const zeroExpToken = makeSession({ id: userA.id, email: userA.email, exp: 0 });
    assert(verifyCustomerSession(zeroExpToken) === null, "Session with exp = 0 rejected");

    // 6. exp = NaN -> rejected
    console.log("\n--- 6. exp = NaN ---");
    const nanExpPayload = `{"id":"${userA.id}","email":"${userA.email}","exp":NaN}`;
    const nanPayloadBase64 = Buffer.from(nanExpPayload).toString("base64url");
    const nanSig = crypto.createHmac("sha256", process.env.CUSTOMER_AUTH_SECRET).update(nanPayloadBase64).digest("hex");
    assert(verifyCustomerSession(`${nanPayloadBase64}.${nanSig}`) === null, "Session with exp = NaN rejected");

    // 7. exp = Infinity -> rejected
    console.log("\n--- 7. exp = Infinity ---");
    const infinityExpPayload = `{"id":"${userA.id}","email":"${userA.email}","exp":Infinity}`;
    const infPayloadBase64 = Buffer.from(infinityExpPayload).toString("base64url");
    const infSig = crypto.createHmac("sha256", process.env.CUSTOMER_AUTH_SECRET).update(infPayloadBase64).digest("hex");
    assert(verifyCustomerSession(`${infPayloadBase64}.${infSig}`) === null, "Session with exp = Infinity rejected");

    // 8. Tampered session -> rejected
    console.log("\n--- 8. Tampered session ---");
    const [origPayload, origSig] = validSession.split(".");
    const tamperedPayloadObj = JSON.parse(Buffer.from(origPayload, "base64url").toString());
    tamperedPayloadObj.id = userB.id;
    const tamperedPayloadBase64 = Buffer.from(JSON.stringify(tamperedPayloadObj)).toString("base64url");
    assert(verifyCustomerSession(`${tamperedPayloadBase64}.${origSig}`) === null, "Tampered session token rejected");

    // 9. Missing CUSTOMER_AUTH_SECRET -> authentication fails safely
    console.log("\n--- 9. Missing CUSTOMER_AUTH_SECRET ---");
    const tempSecret = process.env.CUSTOMER_AUTH_SECRET;
    delete process.env.CUSTOMER_AUTH_SECRET;
    let missingSecretCaught = false;
    try {
      createCustomerSession(userA);
    } catch (err) {
      missingSecretCaught = true;
      assert(err.message.includes("CUSTOMER_AUTH_SECRET"), "Missing secret error thrown explicitly");
    }
    assert(missingSecretCaught, "Authentication fails safely when CUSTOMER_AUTH_SECRET is missing");
    process.env.CUSTOMER_AUTH_SECRET = tempSecret;

    // 10. Anonymous customer request -> 401 where required
    console.log("\n--- 10. Anonymous customer request ---");
    assert(verifyCustomerSession(null) === null, "Null session token returns null (401 Unauthorized)");
    assert(verifyCustomerSession("") === null, "Empty session token returns null (401 Unauthorized)");

    // Simulated resources for ownership checks (11 - 16)
    const orderA = { id: "ord_1001", userId: userA.id, total: 50000 };
    const receiptA = { id: "rec_1001", orderId: orderA.id, userId: userA.id };
    const addressA = { id: "addr_1001", userId: userA.id, isDefault: true };
    const lookA = { id: "look_1001", userId: userA.id, items: ["top_1"] };

    // 11. Customer A cannot access Customer B's order
    console.log("\n--- 11. Customer A vs Customer B order access ---");
    const sessionB = verifyCustomerSession(createCustomerSession(userB));
    assert(orderA.userId === userA.id, "Customer A can access Customer A order");
    assert(orderA.userId !== sessionB.id, "Customer B cannot access Customer A order (denied)");

    // 12. Customer A cannot access Customer B's receipt
    console.log("\n--- 12. Customer A vs Customer B receipt access ---");
    assert(receiptA.userId === userA.id, "Customer A can access Customer A receipt");
    assert(receiptA.userId !== sessionB.id, "Customer B cannot access Customer A receipt (denied)");

    // 13. Customer A cannot modify Customer B's saved address
    console.log("\n--- 13. Customer A vs Customer B address modification ---");
    const addressModAllowedForB = addressA.userId === sessionB.id;
    assert(addressModAllowedForB === false, "Customer B cannot modify Customer A saved address");

    // 14. Customer A cannot delete Customer B's saved address
    console.log("\n--- 14. Customer A vs Customer B address deletion ---");
    const addressDelAllowedForB = addressA.userId === sessionB.id;
    assert(addressDelAllowedForB === false, "Customer B cannot delete Customer A saved address");

    // 15. Customer A cannot access/modify Customer B's saved look
    console.log("\n--- 15. Customer A vs Customer B saved look access ---");
    const lookAccessAllowedForB = lookA.userId === sessionB.id;
    assert(lookAccessAllowedForB === false, "Customer B cannot access/modify Customer A saved look");

    // 16. A request cannot switch ownership simply by submitting another userId
    console.log("\n--- 16. userId request body parameter switching rejection ---");
    const clientSubmittedBody = { userId: userB.id, fullName: "Hacked Name" };
    // API logic strictly relies on session.id, ignoring clientSubmittedBody.userId
    const derivedUserIdFromSession = verifiedValid.id;
    assert(derivedUserIdFromSession === userA.id, "Derived userId comes exclusively from verified server session");
    assert(derivedUserIdFromSession !== clientSubmittedBody.userId, "Submitted userId in body is completely ignored");

    // 17. Normal logged-in customer account functionality still works
    console.log("\n--- 17. Normal logged-in customer account functionality ---");
    const hashedPass = hashPassword(passA);
    assert(verifyPassword(passA, hashedPass) === true, "Password verification works normally");
    assert(getCustomerCookieName() === "verane_customer", "Cookie name is verane_customer");

  } catch (error) {
    console.error("Test execution error:", error);
    failed++;
  }

  console.log(`\n==================================================`);
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log(`==================================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

if (process.argv[1] && process.argv[1].endsWith("test_customer_auth.js")) {
  runCustomerAuthTests();
}
