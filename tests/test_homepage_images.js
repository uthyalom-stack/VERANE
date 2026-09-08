const assert = require("assert");

// Import or require sanitizeImageUrl / getProductImage indirectly if possible, or test helper string matching against app/page.js
const fs = require("fs");
const path = require("path");

const pageJsContent = fs.readFileSync(path.join(__dirname, "../app/page.js"), "utf8");

// Extract sanitizeImageUrl function body directly from app/page.js to guarantee zero divergence
const sanitizeImageUrlMatch = pageJsContent.match(/function sanitizeImageUrl\(url\) \{([\s\S]*?)\n\}/);
if (!sanitizeImageUrlMatch) {
  throw new Error("Could not find function sanitizeImageUrl in app/page.js");
}
const sanitizeImageUrl = new Function("url", sanitizeImageUrlMatch[1]);

// Extract getProductImage function body directly from app/page.js
const getProductImageMatch = pageJsContent.match(/function getProductImage\(images\) \{([\s\S]*?)\n\}/);
if (!getProductImageMatch) {
  throw new Error("Could not find function getProductImage in app/page.js");
}
// Note: getProductImage uses sanitizeImageUrl internally
const getProductImage = new Function("images", "sanitizeImageUrl", getProductImageMatch[1] + "\nreturn getProductImage(images);").bind(null);

function runGetProductImage(images) {
  // Execute extracted code passing the real sanitizeImageUrl extracted from app/page.js
  const fn = new Function("images", "sanitizeImageUrl", `
    ${getProductImageMatch[0]}
    return getProductImage(images);
  `);
  return fn(images, sanitizeImageUrl);
}

// Helper simulating ProductCard image extraction and rendering output check
function renderProductCardImage(product) {
  const image = runGetProductImage(product.images);
  if (image) {
    return `<img src="${image}" alt="${product.name || "Product"}" />`;
  }
  return `<div className="placeholder">V</div>`;
}

function runTests() {
  console.log("Running Homepage Image Regression Tests directly against app/page.js logic...\n");

  // Verify app/page.js source code does NOT contain the data: rejection filter
  assert.ok(!pageJsContent.includes('trimmed.startsWith("data:") return ""'), "app/page.js sanitizeImageUrl must NOT reject data: URLs");

  const testWebpDataUrl = "data:image/webp;base64,UklGRiQAAABXRUJQVlA4IBgAAAAwAQCdASoBAAEAAQAcJaACdLoBAAAAAElFTkSuQmCC";
  const testHttpsUrl = "https://example.com/products/jacket.jpg";
  const testRootRelativeUrl = "/images/products/boot.png";

  // Test 1: Direct base64 data URL string in product.images
  {
    const product = { id: "p1", name: "Base64 Shirt", images: testWebpDataUrl };
    const resolvedImage = runGetProductImage(product.images);
    assert.strictEqual(resolvedImage, testWebpDataUrl, "Direct base64 data URL should be resolved directly");
    const cardHtml = renderProductCardImage(product);
    assert.ok(cardHtml.includes(`<img src="${testWebpDataUrl}"`), "ProductCard should render <img src> with base64 data URL");
    assert.ok(!cardHtml.includes("placeholder"), "ProductCard must NOT render 'V' placeholder for base64 image");
    console.log("✓ Pass: Direct base64 data URL string");
  }

  // Test 2: JSON array containing base64 data URL
  {
    const product = { id: "p2", name: "JSON Array Shirt", images: JSON.stringify([testWebpDataUrl, testHttpsUrl]) };
    const resolvedImage = runGetProductImage(product.images);
    assert.strictEqual(resolvedImage, testWebpDataUrl, "JSON array containing base64 data URL should resolve first element");
    const cardHtml = renderProductCardImage(product);
    assert.ok(cardHtml.includes(`<img src="${testWebpDataUrl}"`), "ProductCard should render <img src> with first base64 image");
    console.log("✓ Pass: JSON array containing base64 data URL");
  }

  // Test 3: Array of strings directly passed
  {
    const product = { id: "p3", name: "JS Array Shirt", images: [testWebpDataUrl] };
    const resolvedImage = runGetProductImage(product.images);
    assert.strictEqual(resolvedImage, testWebpDataUrl, "JavaScript Array containing base64 data URL should resolve first element");
    const cardHtml = renderProductCardImage(product);
    assert.ok(cardHtml.includes(`<img src="${testWebpDataUrl}"`), "ProductCard should render <img src>");
    console.log("✓ Pass: JavaScript Array containing base64 data URL");
  }

  // Test 4: JSON string containing a base64 data URL string
  {
    const product = { id: "p4", name: "JSON String Shirt", images: JSON.stringify(testWebpDataUrl) };
    const resolvedImage = runGetProductImage(product.images);
    assert.strictEqual(resolvedImage, testWebpDataUrl, "JSON scalar string containing base64 data URL should unwrap");
    const cardHtml = renderProductCardImage(product);
    assert.ok(cardHtml.includes(`<img src="${testWebpDataUrl}"`), "ProductCard should render <img src>");
    console.log("✓ Pass: JSON string scalar containing base64 data URL");
  }

  // Test 5: Comma-separated format fallback (where data URL or normal URL is present)
  {
    const product = { id: "p5", name: "Comma Sep Shirt", images: `${testHttpsUrl}, ${testRootRelativeUrl}` };
    const resolvedImage = runGetProductImage(product.images);
    assert.strictEqual(resolvedImage, testHttpsUrl, "Comma-separated string should extract first URL");
    console.log("✓ Pass: Comma-separated string format fallback");
  }

  // Test 6: Normal HTTPS URL
  {
    const product = { id: "p6", name: "HTTPS Shirt", images: testHttpsUrl };
    const resolvedImage = runGetProductImage(product.images);
    assert.strictEqual(resolvedImage, testHttpsUrl, "Standard HTTPS URL should resolve successfully");
    const cardHtml = renderProductCardImage(product);
    assert.ok(cardHtml.includes(`<img src="${testHttpsUrl}"`), "ProductCard should render <img src> with HTTPS URL");
    console.log("✓ Pass: Standard HTTPS URL");
  }

  // Test 7: Root-relative URL
  {
    const product = { id: "p7", name: "Root Relative Footwear", images: testRootRelativeUrl };
    const resolvedImage = runGetProductImage(product.images);
    assert.strictEqual(resolvedImage, testRootRelativeUrl, "Root-relative URL should resolve successfully");
    const cardHtml = renderProductCardImage(product);
    assert.ok(cardHtml.includes(`<img src="${testRootRelativeUrl}"`), "ProductCard should render <img src> with root-relative URL");
    console.log("✓ Pass: Root-relative URL");
  }

  // Test 8: Empty or null image fields
  {
    const product1 = { id: "p8a", name: "No Image Product", images: "" };
    const product2 = { id: "p8b", name: "Null Image Product", images: null };
    assert.strictEqual(runGetProductImage(product1.images), null, "Empty string should return null");
    assert.strictEqual(runGetProductImage(product2.images), null, "Null should return null");
    assert.ok(renderProductCardImage(product1).includes("placeholder"), "Empty images should fall back to 'V' placeholder");
    console.log("✓ Pass: Empty and null image handling");
  }

  console.log("\nAll Homepage Image Regression Tests PASSED successfully against app/page.js source!");
}

runTests();
