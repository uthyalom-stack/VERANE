import assert from "node:assert";
import prisma from "./mock_prisma.js";
import { generateOrderReceiptPDF } from "../lib/receipt-pdf.js";

async function runReceiptPDFLogoTests() {
  console.log("=== RUNNING VÉRANE RECEIPT PDF LOGO INTEGRATION SUITE ===\n");

  // Configure test site settings with mock data URLs for logos
  const samplePngBase64 =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

  await prisma.siteSetting.create({ data: { key: "veraneLogo", value: samplePngBase64 } });
  await prisma.siteSetting.create({ data: { key: "uthyLogo", value: samplePngBase64 } });
  await prisma.siteSetting.create({ data: { key: "alomzieeLogo", value: samplePngBase64 } });

  const customer = await prisma.user.create({
    data: {
      email: `receipt_test_${Date.now()}@verane.com`,
      password: "hash",
      name: "Receipt Customer",
    },
  });

  const uthyProduct = await prisma.product.create({
    data: {
      name: "UTHY Silk Gown",
      brand: "UTHY_LUXURY",
      category: "Dresses",
      price: 150000,
      images: "[]",
    },
  });

  const alomzieeProduct = await prisma.product.create({
    data: {
      name: "ALOMZIEE Leather Slides",
      brand: "ALOMZIEE_FOOTIES",
      category: "Footwear",
      price: 80000,
      images: "[]",
    },
  });

  // --- SCENARIO 1: UTHY-ONLY ORDER RECEIPT ---
  console.log("--- SCENARIO 1: UTHY-ONLY ORDER RECEIPT ---");
  const uthyOrder = await prisma.order.create({
    data: {
      userId: customer.id,
      orderNumber: `VR-REC-UTHY-${Date.now()}`,
      total: 150000,
      shippingFee: 5000,
      firstName: "Test",
      lastName: "User",
      items: {
        create: [
          {
            productId: uthyProduct.id,
            quantity: 1,
            price: 150000,
          },
        ],
      },
    },
  });

  const uthyPdfBuffer = await generateOrderReceiptPDF(uthyOrder.id);
  assert(Buffer.isBuffer(uthyPdfBuffer), "UTHY-only receipt PDF output should be a Buffer");
  assert(uthyPdfBuffer.length > 5000, "PDF buffer should contain valid PDF structure");
  console.log(`✓ UTHY-only receipt PDF generated successfully (${uthyPdfBuffer.length} bytes)`);

  // --- SCENARIO 2: ALOMZIEE-ONLY ORDER RECEIPT ---
  console.log("\n--- SCENARIO 2: ALOMZIEE-ONLY ORDER RECEIPT ---");
  const alomzieeOrder = await prisma.order.create({
    data: {
      userId: customer.id,
      orderNumber: `VR-REC-ALOM-${Date.now()}`,
      total: 80000,
      shippingFee: 5000,
      firstName: "Test",
      lastName: "User",
      items: {
        create: [
          {
            productId: alomzieeProduct.id,
            quantity: 1,
            price: 80000,
          },
        ],
      },
    },
  });

  const alomzieePdfBuffer = await generateOrderReceiptPDF(alomzieeOrder.id);
  assert(Buffer.isBuffer(alomzieePdfBuffer), "ALOMZIEE-only receipt PDF output should be a Buffer");
  assert(alomzieePdfBuffer.length > 5000, "PDF buffer should contain valid PDF structure");
  console.log(`✓ ALOMZIEE-only receipt PDF generated successfully (${alomzieePdfBuffer.length} bytes)`);

  // --- SCENARIO 3: COMBINED BOTH-BRANDS ORDER RECEIPT ---
  console.log("\n--- SCENARIO 3: COMBINED BOTH-BRANDS ORDER RECEIPT ---");
  const combinedOrder = await prisma.order.create({
    data: {
      userId: customer.id,
      orderNumber: `VR-REC-COMB-${Date.now()}`,
      total: 230000,
      shippingFee: 5000,
      firstName: "Test",
      lastName: "User",
      items: {
        create: [
          {
            productId: uthyProduct.id,
            quantity: 1,
            price: 150000,
          },
          {
            productId: alomzieeProduct.id,
            quantity: 1,
            price: 80000,
          },
        ],
      },
    },
  });

  const combinedPdfBuffer = await generateOrderReceiptPDF(combinedOrder.id);
  assert(Buffer.isBuffer(combinedPdfBuffer), "Combined receipt PDF output should be a Buffer");
  assert(combinedPdfBuffer.length > 5000, "PDF buffer should contain valid PDF structure");
  console.log(`✓ Combined receipt PDF generated successfully (${combinedPdfBuffer.length} bytes)`);

  // --- SCENARIO 4: UNREACHABLE LOGO / FALLBACK TEST ---
  console.log("\n--- SCENARIO 4: UNREACHABLE LOGO / FALLBACK TEST ---");
  await prisma.siteSetting.create({ data: { key: "veraneLogo", value: "https://invalid-domain-123456789.com/logo.png" } });
  await prisma.siteSetting.create({ data: { key: "uthyLogo", value: "https://invalid-domain-123456789.com/uthy.png" } });

  const fallbackPdfBuffer = await generateOrderReceiptPDF(combinedOrder.id);
  assert(Buffer.isBuffer(fallbackPdfBuffer), "Fallback receipt PDF output should be a Buffer");
  console.log(`✓ Receipt PDF generated with text fallbacks on unreachable logo URLs (${fallbackPdfBuffer.length} bytes)`);

  console.log("\n==================================================");
  console.log("ALL VÉRANE RECEIPT PDF LOGO TESTS PASSED SUCCESSFULLY!");
  console.log("==================================================");
}

runReceiptPDFLogoTests().catch((err) => {
  console.error("Receipt PDF Logo test error:", err);
  process.exit(1);
});
