import crypto from "crypto";
import path from "path";

// Set required CUSTOMER_AUTH_SECRET for test environment
process.env.CUSTOMER_AUTH_SECRET = "test-secret-key-1234567890-super-secure";

const repoRoot = process.cwd();

// Dynamic imports of modules
const customerAuthPath = path.join(repoRoot, "lib/auth/customer.js");
const mockHeadersPath = path.join(repoRoot, "tests/mock_next_headers.js");
const mockPrismaPath = path.join(repoRoot, "tests/mock_prisma.js");

const ordersRoutePath = path.join(repoRoot, "app/api/orders/route.js");
const receiptRoutePath = path.join(repoRoot, "app/api/orders/[id]/receipt/route.js");
const addressesRoutePath = path.join(repoRoot, "app/api/account/addresses/route.js");
const wishlistRoutePath = path.join(repoRoot, "app/api/wishlist/route.js");
const sessionRoutePath = path.join(repoRoot, "app/api/auth/session/route.js");

const {
  hashPassword,
  verifyPassword,
  createCustomerSession,
  verifyCustomerSession,
  getCustomerCookieName,
} = await import(`file://${customerAuthPath}`);

const { setTestCookie, clearTestCookies } = await import(`file://${mockHeadersPath}`);
const { db, resetDb } = await import(`file://${mockPrismaPath}`);

const { GET: getOrders } = await import(`file://${ordersRoutePath}`);
const { GET: getReceipt } = await import(`file://${receiptRoutePath}`);
const {
  GET: getAddresses,
  POST: postAddresses,
  PUT: putAddresses,
  DELETE: deleteAddresses,
} = await import(`file://${addressesRoutePath}`);
const { GET: getWishlist, POST: postWishlist } = await import(`file://${wishlistRoutePath}`);
const { GET: getSession } = await import(`file://${sessionRoutePath}`);

function makeRequest(url, options = {}) {
  const req = new Request(url, options);
  const cookieName = getCustomerCookieName();
  req.cookies = {
    get: (name) => {
      if (name === cookieName) {
        return options.token ? { value: options.token } : undefined;
      }
      return undefined;
    },
  };
  return req;
}

export async function runCustomerAuthTests() {
  console.log("=== RUNNING VÉRANE CUSTOMER AUTH & REAL ROUTE-HANDLER AUTHORIZATION SUITE ===\n");
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

  resetDb();

  const timestamp = Date.now();
  const emailA = `cust_a_${timestamp}@example.com`;
  const emailB = `cust_b_${timestamp}@example.com`;
  const passA = "PasswordA123!";
  const passB = "PasswordB123!";

  // Seed Customer A & Customer B
  const userA = { id: `usr_a_${timestamp}`, name: "Customer A", email: emailA, password: hashPassword(passA) };
  const userB = { id: `usr_b_${timestamp}`, name: "Customer B", email: emailB, password: hashPassword(passB) };
  db.users.push(userA, userB);

  // Seed Customer A resources
  const orderA = { id: `ord_a_${timestamp}`, userId: userA.id, orderNumber: `VR-${timestamp}-1001`, total: 75000, status: "processing", createdAt: new Date(), items: [] };
  db.orders.push(orderA);

  const addressA = { id: `addr_a_${timestamp}`, userId: userA.id, fullName: "Customer A", phone: "+2348011111111", country: "Nigeria", state: "Lagos", city: "Ikeja", streetAddress: "123 Allen Ave", isDefault: true };
  db.savedAddresses.push(addressA);

  const wishlistA = { id: `wish_a_${timestamp}`, userId: userA.id, productId: "prod_1001" };
  db.wishlists.push(wishlistA);

  let sessionA = null;
  let sessionB = null;

  try {
    // ----------------------------------------------------
    // SECTION 1: STRICT SESSION SECURITY & EXPIRATION TESTS
    // ----------------------------------------------------
    console.log("--- SECTION 1: STRICT SESSION SECURITY & EXPIRATION TESTS ---");

    // 1. Valid customer session
    sessionA = createCustomerSession(userA);
    sessionB = createCustomerSession(userB);
    const verifiedValid = verifyCustomerSession(sessionA);
    assert(verifiedValid && verifiedValid.id === userA.id, "Valid customer session is accepted");

    // Helper function to build custom signed session tokens
    function makeSession(payloadObj) {
      const payloadBase64 = Buffer.from(JSON.stringify(payloadObj)).toString("base64url");
      const sig = crypto.createHmac("sha256", process.env.CUSTOMER_AUTH_SECRET).update(payloadBase64).digest("hex");
      return `${payloadBase64}.${sig}`;
    }

    // 2. Expired session -> rejected
    const expiredToken = makeSession({
      id: userA.id,
      email: userA.email,
      exp: Date.now() - 1000,
    });
    assert(verifyCustomerSession(expiredToken) === null, "Expired session rejected");

    // 3. Missing exp -> rejected
    const missingExpToken = makeSession({ id: userA.id, email: userA.email });
    assert(verifyCustomerSession(missingExpToken) === null, "Session with missing exp rejected");

    // 4. exp as a string -> rejected
    const stringExpToken = makeSession({ id: userA.id, email: userA.email, exp: String(Date.now() + 100000) });
    assert(verifyCustomerSession(stringExpToken) === null, "Session with exp as string rejected");

    // 5. exp = 0 -> rejected
    const zeroExpToken = makeSession({ id: userA.id, email: userA.email, exp: 0 });
    assert(verifyCustomerSession(zeroExpToken) === null, "Session with exp = 0 rejected");

    // 6. exp = NaN -> rejected
    const nanExpPayload = `{"id":"${userA.id}","email":"${userA.email}","exp":NaN}`;
    const nanPayloadBase64 = Buffer.from(nanExpPayload).toString("base64url");
    const nanSig = crypto.createHmac("sha256", process.env.CUSTOMER_AUTH_SECRET).update(nanPayloadBase64).digest("hex");
    assert(verifyCustomerSession(`${nanPayloadBase64}.${nanSig}`) === null, "Session with exp = NaN rejected");

    // 7. exp = Infinity -> rejected
    const infinityExpPayload = `{"id":"${userA.id}","email":"${userA.email}","exp":Infinity}`;
    const infPayloadBase64 = Buffer.from(infinityExpPayload).toString("base64url");
    const infSig = crypto.createHmac("sha256", process.env.CUSTOMER_AUTH_SECRET).update(infPayloadBase64).digest("hex");
    assert(verifyCustomerSession(`${infPayloadBase64}.${infSig}`) === null, "Session with exp = Infinity rejected");

    // 8. Tampered session -> rejected
    const [origPayload, origSig] = sessionA.split(".");
    const tamperedPayloadObj = JSON.parse(Buffer.from(origPayload, "base64url").toString());
    tamperedPayloadObj.id = "hacked-id";
    const tamperedPayloadBase64 = Buffer.from(JSON.stringify(tamperedPayloadObj)).toString("base64url");
    assert(verifyCustomerSession(`${tamperedPayloadBase64}.${origSig}`) === null, "Tampered session token rejected");

    // 9. Missing CUSTOMER_AUTH_SECRET -> authentication fails safely
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

    // 10. Anonymous customer request -> 401
    assert(verifyCustomerSession(null) === null, "Null session token returns null (401 Unauthorized)");
    assert(verifyCustomerSession("") === null, "Empty session token returns null (401 Unauthorized)");

    // ----------------------------------------------------
    // SECTION 2: EXERCISING REAL NEXT.JS ROUTE HANDLERS
    // ----------------------------------------------------
    console.log("\n--- SECTION 2: EXERCISING REAL NEXT.JS ROUTE HANDLERS ---");

    const cookieName = getCustomerCookieName();

    // 11. Real Route Handler Test: GET /api/auth/session
    console.log("-> Testing GET /api/auth/session handler...");
    setTestCookie(cookieName, sessionA);
    const sessionResA = await getSession(makeRequest("http://localhost/api/auth/session", { token: sessionA }));
    const sessionDataA = await sessionResA.json();
    assert(sessionResA.status === 200 && sessionDataA.authenticated === true && sessionDataA.user.id === userA.id, "GET /api/auth/session handler returns Customer A profile");

    setTestCookie(cookieName, null);
    const sessionResAnon = await getSession(makeRequest("http://localhost/api/auth/session"));
    const sessionDataAnon = await sessionResAnon.json();
    assert(sessionDataAnon.authenticated === false, "GET /api/auth/session handler returns authenticated: false for anonymous request");

    // 12. Real Route Handler Test: GET /api/orders (Customer A vs Customer B)
    console.log("-> Testing GET /api/orders handler...");
    setTestCookie(cookieName, sessionA);
    const ordersResA = await getOrders(makeRequest("http://localhost/api/orders", { token: sessionA }));
    const ordersDataA = await ordersResA.json();
    assert(ordersResA.status === 200 && ordersDataA.orders.some((o) => o.id === orderA.id), "Customer A retrieves Customer A's orders via GET /api/orders");

    setTestCookie(cookieName, sessionB);
    const ordersResB = await getOrders(makeRequest("http://localhost/api/orders", { token: sessionB }));
    const ordersDataB = await ordersResB.json();
    assert(ordersResB.status === 200 && !ordersDataB.orders.some((o) => o.id === orderA.id), "Customer B CANNOT retrieve Customer A's orders via GET /api/orders (strict isolation)");

    setTestCookie(cookieName, null);
    const ordersResAnon = await getOrders(makeRequest("http://localhost/api/orders"));
    assert(ordersResAnon.status === 401, "GET /api/orders handler rejects anonymous request with HTTP 401 Unauthorized");

    // 13. Real Route Handler Test: GET /api/orders/[id]/receipt
    console.log("-> Testing GET /api/orders/[id]/receipt handler...");

    setTestCookie(cookieName, sessionA);
    const receiptResA = await getReceipt(
      makeRequest(`http://localhost/api/orders/${orderA.id}/receipt`, { token: sessionA }),
      { params: Promise.resolve({ id: orderA.id }) }
    );
    assert(receiptResA.status === 200, "Customer A can access Customer A's receipt (HTTP 200 OK)");

    setTestCookie(cookieName, sessionB);
    const receiptResB = await getReceipt(
      makeRequest(`http://localhost/api/orders/${orderA.id}/receipt`, { token: sessionB }),
      { params: Promise.resolve({ id: orderA.id }) }
    );
    assert(receiptResB.status === 403, "Customer B is forbidden (HTTP 403 Forbidden) from accessing Customer A's receipt");

    setTestCookie(cookieName, null);
    const receiptResAnon = await getReceipt(
      makeRequest(`http://localhost/api/orders/${orderA.id}/receipt`),
      { params: Promise.resolve({ id: orderA.id }) }
    );
    assert(receiptResAnon.status === 401, "GET /api/orders/[id]/receipt handler rejects anonymous request with HTTP 401 Unauthorized");

    // 14. Real Route Handler Test: GET / POST / PUT / DELETE /api/account/addresses
    console.log("-> Testing /api/account/addresses handlers...");

    // Test GET /api/account/addresses
    setTestCookie(cookieName, sessionA);
    const getAddrResA = await getAddresses(makeRequest("http://localhost/api/account/addresses", { token: sessionA }));
    const getAddrDataA = await getAddrResA.json();
    assert(getAddrResA.status === 200 && getAddrDataA.addresses.some((a) => a.id === addressA.id), "Customer A retrieves Customer A's saved address");

    setTestCookie(cookieName, sessionB);
    const getAddrResB = await getAddresses(makeRequest("http://localhost/api/account/addresses", { token: sessionB }));
    const getAddrDataB = await getAddrResB.json();
    assert(getAddrResB.status === 200 && !getAddrDataB.addresses.some((a) => a.id === addressA.id), "Customer B CANNOT view Customer A's saved address (strict isolation)");

    setTestCookie(cookieName, null);
    const getAddrResAnon = await getAddresses(makeRequest("http://localhost/api/account/addresses"));
    assert(getAddrResAnon.status === 401, "GET /api/account/addresses handler returns HTTP 401 Unauthorized for anonymous request");

    // Test PUT /api/account/addresses (Customer B trying to update / default Customer A's address)
    setTestCookie(cookieName, sessionB);
    const putAddrReqB = makeRequest("http://localhost/api/account/addresses", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: addressA.id, fullName: "Attacker Update" }),
      token: sessionB,
    });
    const putAddrResB = await putAddresses(putAddrReqB);
    assert(putAddrResB.status === 404, "PUT /api/account/addresses handler denies updating another customer's address (HTTP 404 Access Denied)");

    // Test DELETE /api/account/addresses (Customer B trying to delete Customer A's address)
    const delAddrReqB = makeRequest(`http://localhost/api/account/addresses?id=${addressA.id}`, {
      method: "DELETE",
      token: sessionB,
    });
    const delAddrResB = await deleteAddresses(delAddrReqB);
    assert(delAddrResB.status === 404, "DELETE /api/account/addresses handler denies deleting another customer's address (HTTP 404 Access Denied)");

    // Test POST /api/account/addresses with client-supplied body parameter switching attempt (submitting userId: userA.id)
    const postAddrReqBody = makeRequest("http://localhost/api/account/addresses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: userA.id, // Parameter switching attempt
        fullName: "Customer B Addr",
        phone: "+2348022222222",
        country: "Nigeria",
        state: "Lagos",
        city: "Ikeja",
        streetAddress: "456 Victoria Island",
      }),
      token: sessionB,
    });
    const postAddrResB = await postAddresses(postAddrReqBody);
    const postAddrDataB = await postAddrResB.json();
    assert(postAddrResB.status === 201 && postAddrDataB.address.userId === userB.id, "POST /api/account/addresses derives userId strictly from sessionB, ignoring submitted body.userId");

    // 15. Real Route Handler Test: GET / POST /api/wishlist
    console.log("-> Testing GET & POST /api/wishlist handlers...");
    setTestCookie(cookieName, sessionA);
    const wishResA = await getWishlist(makeRequest("http://localhost/api/wishlist", { token: sessionA }));
    const wishDataA = await wishResA.json();
    assert(wishResA.status === 200 && wishDataA.wishlist.some((w) => w.productId === "prod_1001"), "Customer A retrieves Customer A's wishlist");

    setTestCookie(cookieName, sessionB);
    const wishResB = await getWishlist(makeRequest("http://localhost/api/wishlist", { token: sessionB }));
    const wishDataB = await wishResB.json();
    assert(wishResB.status === 200 && !wishDataB.wishlist.some((w) => w.productId === "prod_1001"), "Customer B CANNOT view Customer A's wishlist (strict isolation)");

    setTestCookie(cookieName, null);
    const wishResAnon = await getWishlist(makeRequest("http://localhost/api/wishlist"));
    assert(wishResAnon.status === 401, "GET /api/wishlist handler returns HTTP 401 Unauthorized for anonymous request");

    // 16. Password & Cookie verification
    console.log("-> Testing credential helpers...");
    const hashedPass = hashPassword(passA);
    assert(verifyPassword(passA, hashedPass) === true, "Password verification succeeds");
    assert(getCustomerCookieName() === "verane_customer", "Cookie name matches verane_customer");

  } catch (error) {
    console.error("Test execution error:", error);
    failed++;
  } finally {
    clearTestCookies();
    resetDb();
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
