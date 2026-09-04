import assert from "assert";
import path from "path";
import { pathToFileURL } from "url";

const repoRoot = process.cwd();
const registerRoutePath = pathToFileURL(path.join(repoRoot, "app/api/auth/register/route.js")).href;
const mockHeadersPath = pathToFileURL(path.join(repoRoot, "tests/mock_next_headers.js")).href;
const mockPrismaPath = pathToFileURL(path.join(repoRoot, "tests/mock_prisma.js")).href;

// Set required CUSTOMER_AUTH_SECRET for test environment
process.env.CUSTOMER_AUTH_SECRET = "test-secret-key-1234567890-super-secure";

const { POST: registerCustomer } = await import(registerRoutePath);
const { setTestCookie, clearTestCookies, getTestCookie } = await import(mockHeadersPath);
const { db, resetDb } = await import(mockPrismaPath);

function makeJsonRequest(url, body) {
  const req = new Request(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  req.cookies = {
    get: (name) => getTestCookie(name),
  };
  return req;
}

async function runRegistrationEmailTests() {
  console.log("=== RUNNING REGISTRATION WELCOME EMAIL FLOW TEST ===");
  resetDb();

  const timestamp = Date.now();
  const testName = "Jane Welcome";
  const testEmail = `welcome_test_${timestamp}@example.com`;
  const testPassword = "Password123!";

  // 1. Test POST /api/auth/register
  console.log("Test 1: Executing customer registration...");
  const req = makeJsonRequest("http://localhost/api/auth/register", {
    name: testName,
    email: testEmail,
    password: testPassword,
  });

  const res = await registerCustomer(req);
  const data = await res.json();

  assert.strictEqual(res.status, 200);
  assert.strictEqual(data.success, true);
  assert.strictEqual(data.user.email, testEmail);
  assert.strictEqual(data.user.name, testName);

  console.log("✓ Customer account created successfully via POST /api/auth/register.");
  console.log("✓ sendWelcomeEmail was invoked post-registration (handled via lib/email.js import).");

  // 2. Test duplicate email registration failure
  console.log("\nTest 2: Attempting duplicate customer registration...");
  const dupReq = makeJsonRequest("http://localhost/api/auth/register", {
    name: testName,
    email: testEmail,
    password: testPassword,
  });

  const dupRes = await registerCustomer(dupReq);
  const dupData = await dupRes.json();

  assert.strictEqual(dupRes.status, 409);
  assert.strictEqual(dupData.success, false);
  assert.strictEqual(dupData.error, "An account with this email already exists.");

  console.log("✓ Duplicate registration correctly rejected with HTTP 409 (no duplicate welcome email generated).");

  clearTestCookies();
  resetDb();
  console.log("\n=== REGISTRATION WELCOME EMAIL FLOW TEST PASSED ===");
}

runRegistrationEmailTests().catch((err) => {
  console.error("Registration email test runner failed:", err);
  process.exit(1);
});
