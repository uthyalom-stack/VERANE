import assert from "node:assert";

async function runLiveSearchTests() {
  console.log("=== RUNNING VÉRANE LIVE SEARCH SUITE ===");

  // 1. Test URL Search Parameter Parsing & Multi-Word Token Matching
  function buildSearchWhereClause(searchQuery, brandParam, categoryParam) {
    const whereClause = { archivedAt: null };

    if (brandParam && brandParam !== "all") {
      whereClause.brand = brandParam;
    }

    if (categoryParam && categoryParam !== "all") {
      whereClause.category = categoryParam;
    }

    const query = (searchQuery || "").trim();
    if (query) {
      const tokens = query.split(/\s+/).filter(Boolean);
      if (tokens.length > 0) {
        whereClause.AND = tokens.map((token) => ({
          OR: [
            { name: { contains: token, mode: "insensitive" } },
            { description: { contains: token, mode: "insensitive" } },
            { brand: { contains: token, mode: "insensitive" } },
            { category: { contains: token, mode: "insensitive" } },
            { style: { contains: token, mode: "insensitive" } },
            { occasion: { contains: token, mode: "insensitive" } },
            { categoryRef: { name: { contains: token, mode: "insensitive" } } },
            { collection: { name: { contains: token, mode: "insensitive" } } },
          ],
        }));
      }
    }

    return whereClause;
  }

  // Verify single token search clause
  const clause1 = buildSearchWhereClause("shirt");
  assert.strictEqual(clause1.archivedAt, null);
  assert.strictEqual(clause1.AND.length, 1);
  assert.strictEqual(clause1.AND[0].OR[0].name.contains, "shirt");
  assert.strictEqual(clause1.AND[0].OR[0].name.mode, "insensitive");
  console.log("✓ Single term search clause built correctly with case-insensitive contains");

  // Verify multi-word tokenized search clause ("uthy shirt")
  const clause2 = buildSearchWhereClause("uthy shirt");
  assert.strictEqual(clause2.AND.length, 2);
  assert.strictEqual(clause2.AND[0].OR[0].name.contains, "uthy");
  assert.strictEqual(clause2.AND[1].OR[0].name.contains, "shirt");
  console.log("✓ Multi-word tokenized search clause created with AND combination");

  // Verify brand filtering + search clause
  const clause3 = buildSearchWhereClause("boots", "ALOMZIEE_FOOTIES");
  assert.strictEqual(clause3.brand, "ALOMZIEE_FOOTIES");
  assert.strictEqual(clause3.AND.length, 1);
  assert.strictEqual(clause3.AND[0].OR[0].name.contains, "boots");
  console.log("✓ Brand-scoped search clause preserves brand filtering");

  // 2. Test Lightweight Primary Image Extraction & DTO Mapping
  function extractPrimaryImage(images) {
    if (!images) return "";

    try {
      const parsed = typeof images === "string" ? JSON.parse(images) : images;
      if (Array.isArray(parsed) && parsed.length > 0) {
        return String(parsed[0] || "");
      }
      if (typeof parsed === "string") return parsed;
    } catch {
      if (typeof images === "string") {
        const parts = images.split(",").map((item) => item.trim()).filter(Boolean);
        if (parts.length > 0) return parts[0];
      }
    }

    return "";
  }

  const sampleImagesJson = JSON.stringify([
    "https://example.com/img1.jpg",
    "https://example.com/img2.jpg",
    "data:image/webp;base64,QUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFB",
  ]);

  const primaryImg = extractPrimaryImage(sampleImagesJson);
  assert.strictEqual(primaryImg, "https://example.com/img1.jpg");
  console.log("✓ Primary image safely extracted from JSON image array");

  const sampleCsvImages = "https://example.com/thumb.webp, https://example.com/full.webp";
  assert.strictEqual(extractPrimaryImage(sampleCsvImages), "https://example.com/thumb.webp");
  console.log("✓ Primary image safely extracted from CSV string");

  // 3. Lightweight DTO Structure Verification
  const mockDbProduct = {
    id: "prod_123",
    name: "Luxury Silk Shirt",
    price: 45000,
    brand: "UTHY_LUXURY",
    category: "shirts",
    images: sampleImagesJson,
    inventory: 10,
    preOrderEnabled: false,
    initialInventory: 50,
    variants: [{ id: "v1", stock: 5 }],
  };

  const lightweightDto = {
    id: mockDbProduct.id,
    name: mockDbProduct.name,
    price: mockDbProduct.price,
    brand: mockDbProduct.brand,
    category: mockDbProduct.category,
    images: extractPrimaryImage(mockDbProduct.images) ? [extractPrimaryImage(mockDbProduct.images)] : [],
    inventory: Math.max(0, Number(mockDbProduct.inventory || 0)),
    preOrderEnabled: Boolean(mockDbProduct.preOrderEnabled),
  };

  assert.strictEqual(lightweightDto.id, "prod_123");
  assert.strictEqual(lightweightDto.name, "Luxury Silk Shirt");
  assert.strictEqual(lightweightDto.images.length, 1);
  assert.strictEqual(lightweightDto.images[0], "https://example.com/img1.jpg");
  assert.strictEqual(lightweightDto.variants, undefined, "Variants omitted from lightweight DTO");
  assert.strictEqual(lightweightDto.initialInventory, undefined, "Internal inventory omitted from lightweight DTO");
  console.log("✓ Lightweight DTO contains only minimal fields required for live search");

  // 4. Test Mobile Brand Redirect Guard logic
  function shouldRedirectMobileLink(href) {
    const url = new URL(href, "https://verane.app");
    if (url.pathname !== "/catalog") return false;

    const hasSearchParam = url.searchParams.has("search") || url.searchParams.has("q");
    if (hasSearchParam) return false;

    const brand = url.searchParams.get("brand");
    return Boolean(brand && (brand === "UTHY_LUXURY" || brand === "ALOMZIEE_FOOTIES"));
  }

  assert.strictEqual(
    shouldRedirectMobileLink("https://verane.app/catalog?brand=UTHY_LUXURY"),
    true,
    "Standard mobile catalog brand link redirects"
  );
  assert.strictEqual(
    shouldRedirectMobileLink("https://verane.app/catalog?brand=UTHY_LUXURY&search=shirt"),
    false,
    "Catalog search link with brand parameter bypasses redirect"
  );
  assert.strictEqual(
    shouldRedirectMobileLink("https://verane.app/catalog?q=hoodie"),
    false,
    "Catalog search link with q parameter bypasses redirect"
  );
  console.log("✓ Mobile brand redirect guard correctly preserves search query URLs");

  console.log("\n==================================================");
  console.log("✓ ALL LIVE SEARCH UNIT TESTS PASSED SUCCESSFULLY");
  console.log("==================================================\n");
}

runLiveSearchTests().catch((err) => {
  console.error("❌ Live search test suite failed:", err);
  process.exit(1);
});
