import assert from "node:assert/strict";
import { getProductImage, sanitizeImageUrl } from "@/lib/homepage-image-helpers";

console.log("=== RUNNING HOMEPAGE IMAGE RESOLVER UNIT TESTS ===");

// Test 1: Standard JSON Array string
{
  const input = '["https://pub-r2.yemmzz.name.ng/uploads/123.jpg"]';
  const resolved = getProductImage(input);
  assert.equal(resolved, "https://pub-r2.yemmzz.name.ng/uploads/123.jpg");
  console.log("✓ Test 1 Passed: JSON array string resolved correctly");
}

// Test 2: JS Array object
{
  const input = ["https://pub-r2.yemmzz.name.ng/uploads/456.jpg"];
  const resolved = getProductImage(input);
  assert.equal(resolved, "https://pub-r2.yemmzz.name.ng/uploads/456.jpg");
  console.log("✓ Test 2 Passed: JS Array resolved correctly");
}

// Test 3: Standard single JSON string
{
  const input = '"https://pub-r2.yemmzz.name.ng/uploads/789.jpg"';
  const resolved = getProductImage(input);
  assert.equal(resolved, "https://pub-r2.yemmzz.name.ng/uploads/789.jpg");
  console.log("✓ Test 3 Passed: JSON string resolved correctly");
}

// Test 4: Plain string URL
{
  const input = "https://pub-r2.yemmzz.name.ng/uploads/plain.jpg";
  const resolved = getProductImage(input);
  assert.equal(resolved, "https://pub-r2.yemmzz.name.ng/uploads/plain.jpg");
  console.log("✓ Test 4 Passed: Plain string URL resolved correctly");
}

// Test 5: Root-relative URL
{
  const input = "/uploads/relative.jpg";
  const resolved = getProductImage(input);
  assert.equal(resolved, "/uploads/relative.jpg");
  console.log("✓ Test 5 Passed: Root-relative URL resolved correctly");
}

// Test 6: Comma-separated URLs
{
  const input = "https://example.com/1.jpg, https://example.com/2.jpg";
  const resolved = getProductImage(input);
  assert.equal(resolved, "https://example.com/1.jpg");
  console.log("✓ Test 6 Passed: Comma-separated URLs resolved correctly");
}

// Test 7: Data URL filter (embedded base64 data URI should return null to protect ISR payload)
{
  const input = '["data:image/webp;base64,UklGRiQAAABXRUJQVlA4IBgAAAAwAQCdASoBAAEAAQAcJaACdLoB"]';
  const resolved = getProductImage(input);
  assert.equal(resolved, null);
  console.log("✓ Test 7 Passed: Heavy base64 data URI properly filtered");
}

// Test 8: Empty / null / undefined / malformed inputs
{
  assert.equal(getProductImage(""), null);
  assert.equal(getProductImage(null), null);
  assert.equal(getProductImage(undefined), null);
  assert.equal(getProductImage("[]"), null);
  assert.equal(getProductImage('[""]'), null);
  assert.equal(getProductImage("[invalid json"), null);
  console.log("✓ Test 8 Passed: Empty, null, and malformed inputs handled safely");
}

console.log("==================================================");
console.log("ALL HOMEPAGE IMAGE RESOLVER TESTS PASSED!");
console.log("==================================================");
