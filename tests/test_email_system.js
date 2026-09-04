import assert from "assert";
import { sendWelcomeEmail, sendOrderReceiptEmail } from "../lib/email.js";

/**
 * Runs comprehensive email system tests covering welcome and receipt email functionality.
 * Tests include missing API key scenarios, missing customer email validation, and proper error handling.
 * @returns {Promise<void>}
 */
async function runTests() {
  console.log("=== RUNNING EMAIL SYSTEM TESTS ===");

  // Test 1: sendWelcomeEmail without RESEND_API_KEY
  console.log("Test 1: sendWelcomeEmail with missing RESEND_API_KEY");
  const origKey = process.env.RESEND_API_KEY;
  delete process.env.RESEND_API_KEY;

  const welcomeResultNoKey = await sendWelcomeEmail({
    email: "testcustomer@example.com",
    name: "Test Customer",
  });

  assert.strictEqual(welcomeResultNoKey.success, false);
  assert.strictEqual(
    welcomeResultNoKey.error,
    "RESEND_API_KEY is not configured in environment variables."
  );
  console.log("✓ Welcome email suppressed properly when API key is missing.");

  // Test 2: sendOrderReceiptEmail without RESEND_API_KEY
  console.log("\nTest 2: sendOrderReceiptEmail with missing RESEND_API_KEY");
  const dummyOrder = {
    id: "test-order-id-123",
    orderNumber: "VERANE-9999",
    firstName: "Jane",
    lastName: "Doe",
    email: "janedoe@example.com",
    total: 45000,
    shippingFee: 5000,
  };
  const dummyPdfBuffer = Buffer.from("PDF_DUMMY_DATA");

  const receiptResultNoKey = await sendOrderReceiptEmail({
    order: dummyOrder,
    pdfBuffer: dummyPdfBuffer,
  });

  assert.strictEqual(receiptResultNoKey.success, false);
  assert.strictEqual(
    receiptResultNoKey.error,
    "RESEND_API_KEY is not configured in environment variables."
  );
  console.log("✓ Order receipt email suppressed properly when API key is missing.");

  // Test 3: sendOrderReceiptEmail with missing customer email
  console.log("\nTest 3: sendOrderReceiptEmail with missing email address");
  const dummyOrderNoEmail = {
    id: "test-order-id-456",
    orderNumber: "VERANE-8888",
    total: 20000,
  };

  const receiptResultNoEmail = await sendOrderReceiptEmail({
    order: dummyOrderNoEmail,
    pdfBuffer: dummyPdfBuffer,
  });

  assert.strictEqual(receiptResultNoEmail.success, false);
  assert.strictEqual(receiptResultNoEmail.error, "No recipient email address on order.");
  console.log("✓ Order receipt email validation caught missing customer email.");

  // Restore env key if previously set
  if (origKey) {
    process.env.RESEND_API_KEY = origKey;
  }

  console.log("\n=== ALL EMAIL SYSTEM TESTS PASSED SUCCESSFULLY ===");
}

runTests().catch((err) => {
  console.error("Email test runner failed:", err);
  process.exit(1);
});
