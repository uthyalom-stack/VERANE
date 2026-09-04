import fs from "fs";
import path from "path";
import assert from "assert";

console.log("=== EXECUTING DIRECT SOURCE VERIFICATION OF app/product/[id]/page.js ===");

const sourceCode = fs.readFileSync(path.join(process.cwd(), "app/product/[id]/page.js"), "utf8");

// Confirm required handlers and state exists directly in production source code
assert(sourceCode.includes("const [selectedVariants, setSelectedVariants] = useState([])"), "State selectedVariants must exist in page.js");
assert(sourceCode.includes("const addOrUpdateSelectedVariant = (colorId, sizeLabel) => {"), "addOrUpdateSelectedVariant handler must exist in page.js");
assert(sourceCode.includes("const updateVariantQty = (key, delta) => {"), "updateVariantQty handler must exist in page.js");
assert(sourceCode.includes("const removeSelectedVariant = (key) => {"), "removeSelectedVariant handler must exist in page.js");
assert(sourceCode.includes("const addToCart = () => {"), "addToCart handler must exist in page.js");
console.log("✓ Production source code structure verified: page.js contains all multi-variant state handlers");

/*
 * Dynamic Extraction & Execution of EXACT Production Handlers from app/product/[id]/page.js
 */

// Helper to create a component state closure running production handlers
function createComponentEnvironment(product) {
  let selectedVariants = [];
  let selectedColor = null;
  let selectedSize = null;
  let customSizing = "";
  let qty = 1;
  let mockLocalStorage = { cart: '{"items":[],"total":0,"event":"Verane"}' };
  let redirectedUrl = null;

  const setSelectedVariants = (action) => {
    if (typeof action === "function") {
      selectedVariants = action(selectedVariants);
    } else {
      selectedVariants = action;
    }
  };

  const setSelectedColor = (val) => { selectedColor = val; };
  const setSelectedSize = (val) => { selectedSize = val; };
  const alert = (msg) => { console.log(`[ALERT] ${msg}`); };

  const router = {
    push: (url) => { redirectedUrl = url; },
  };

  const localStorage = {
    getItem: (k) => mockLocalStorage[k] || null,
    setItem: (k, v) => { mockLocalStorage[k] = v; },
  };

  // Context variables referenced inside page.js
  const productColors = Array.isArray(product?.productColors) ? product.productColors : [];
  const variants = Array.isArray(product?.variants) ? product.variants : [];
  const inventory = Math.max(0, Number(product?.inventory ?? 0));
  const hasSizes = variants.some((v) => Boolean(v.size || v.name || v.value || v.label));
  const isPreOrder = Boolean(product?.preOrderEnabled || product?.isPreOrder);
  const customSizingEnabled = Boolean(product?.customSizingEnabled);
  const fulfillmentTime = product?.fulfillmentTime || product?.preOrderFulfillmentTime || "";
  const isFootwear = product?.brand === "ALOMZIEE_FOOTIES";
  const needsSizeSelection = hasSizes && !isPreOrder;
  const isOutOfStock = inventory <= 0 && variants.every((v) => (v.stock ?? v.inventory ?? 0) <= 0);

  const getColorValue = (color) => {
    if (!color) return "#ffffff";
    return color.hex || color.value || color.color || color.code || "#ffffff";
  };

  // Extract function bodies directly from sourceCode to ensure 100% code identity
  function extractFunctionBody(fnName) {
    const startIdx = sourceCode.indexOf(`const ${fnName} = `);
    if (startIdx === -1) throw new Error(`Could not find function ${fnName} in page.js`);
    const bodyStart = sourceCode.indexOf("{", startIdx);
    let openBrackets = 1;
    let endIdx = bodyStart + 1;
    while (openBrackets > 0 && endIdx < sourceCode.length) {
      if (sourceCode[endIdx] === "{") openBrackets++;
      if (sourceCode[endIdx] === "}") openBrackets--;
      endIdx++;
    }
    return sourceCode.substring(bodyStart, endIdx);
  }

  const addOrUpdateBody = extractFunctionBody("addOrUpdateSelectedVariant");
  const updateVariantQtyBody = extractFunctionBody("updateVariantQty");
  const removeSelectedVariantBody = extractFunctionBody("removeSelectedVariant");
  const addToCartBody = extractFunctionBody("addToCart");

  const addOrUpdateSelectedVariant = new Function(
    "colorId", "sizeLabel", "product", "productColors", "variants", "inventory", "hasSizes",
    "selectedVariants", "setSelectedVariants", "alert", "getColorValue",
    addOrUpdateBody
  );

  const updateVariantQty = new Function(
    "key", "delta", "selectedVariants", "setSelectedVariants", "alert",
    updateVariantQtyBody
  );

  const removeSelectedVariant = new Function(
    "key", "selectedVariants", "setSelectedVariants",
    removeSelectedVariantBody
  );

  const addToCart = new Function(
    "product", "isOutOfStock", "isPreOrder", "customSizingEnabled", "customSizing", "alert",
    "selectedVariants", "needsSizeSelection", "selectedSize", "isFootwear", "productColors",
    "selectedColor", "variants", "hasSizes", "qty", "inventory", "fulfillmentTime",
    "localStorage", "router", "getColorValue",
    addToCartBody
  );

  return {
    state: () => ({
      selectedVariants,
      selectedColor,
      selectedSize,
      cart: JSON.parse(mockLocalStorage.cart),
      redirectedUrl,
    }),
    addOrUpdateSelectedVariant: (c, s) => addOrUpdateSelectedVariant(
      c, s, product, productColors, variants, inventory, hasSizes,
      selectedVariants, setSelectedVariants, alert, getColorValue
    ),
    updateVariantQty: (k, d) => updateVariantQty(
      k, d, selectedVariants, setSelectedVariants, alert
    ),
    removeSelectedVariant: (k) => removeSelectedVariant(
      k, selectedVariants, setSelectedVariants
    ),
    addToCart: () => addToCart(
      product, isOutOfStock, isPreOrder, customSizingEnabled, customSizing, alert,
      selectedVariants, needsSizeSelection, selectedSize, isFootwear, productColors,
      selectedColor, variants, hasSizes, qty, inventory, fulfillmentTime,
      localStorage, router, getColorValue
    ),
  };
}


/*
 * TEST SCENARIO 1: NO-SIZE PRODUCT
 * Select Black x1, Red x3, Green x1 on the same product page.
 */
const noSizeProduct = {
  id: "prod_no_sizes_1001",
  inventory: 15,
  productColors: [
    { id: "col_black", name: "Black", hex: "#000000" },
    { id: "col_red", name: "Red", hex: "#ff0000" },
    { id: "col_green", name: "Green", hex: "#00ff00" },
  ],
  variants: [
    { id: "var_black", colorId: "col_black", stock: 5 },
    { id: "var_red", colorId: "col_red", stock: 5 },
    { id: "var_green", colorId: "col_green", stock: 5 },
  ],
};

console.log("\n--- TEST SCENARIO 1: NO-SIZE PRODUCT ---");
const env1 = createComponentEnvironment(noSizeProduct);

// 1. Select Black x1
env1.addOrUpdateSelectedVariant("col_black", null);
assert.strictEqual(env1.state().selectedVariants.length, 1);
assert.strictEqual(env1.state().selectedVariants[0].colorName, "Black");
assert.strictEqual(env1.state().selectedVariants[0].qty, 1);

// 2. Select Red x3 (adding Red must NOT clear Black)
env1.addOrUpdateSelectedVariant("col_red", null);
env1.addOrUpdateSelectedVariant("col_red", null);
env1.addOrUpdateSelectedVariant("col_red", null);
assert.strictEqual(env1.state().selectedVariants.length, 2);
assert.strictEqual(env1.state().selectedVariants.find(v => v.colorName === "Red").qty, 3);

// 3. Select Green x1 (adding Green must NOT clear Black or Red)
env1.addOrUpdateSelectedVariant("col_green", null);
assert.strictEqual(env1.state().selectedVariants.length, 3);
assert.strictEqual(env1.state().selectedVariants.find(v => v.colorName === "Green").qty, 1);
assert.strictEqual(env1.state().selectedVariants.find(v => v.colorName === "Black").qty, 1);

console.log("✓ Scenario 1 (No-size product multi-color selections preserved): PASSED");


/*
 * TEST SCENARIO 2: SIZED PRODUCT
 * Select Red/S x1, Red/M x1, Black/L x1, Green/S x2, Red/L x1
 */
const sizedProduct = {
  id: "prod_sized_1002",
  inventory: 30,
  productColors: [
    { id: "col_red", name: "Red", hex: "#ff0000" },
    { id: "col_black", name: "Black", hex: "#000000" },
    { id: "col_green", name: "Green", hex: "#00ff00" },
  ],
  variants: [
    { id: "var_red_s", colorId: "col_red", size: "S", stock: 5 },
    { id: "var_red_m", colorId: "col_red", size: "M", stock: 5 },
    { id: "var_black_l", colorId: "col_black", size: "L", stock: 5 },
    { id: "var_green_s", colorId: "col_green", size: "S", stock: 5 },
    { id: "var_red_l", colorId: "col_red", size: "L", stock: 5 },
  ],
};

console.log("\n--- TEST SCENARIO 2: SIZED PRODUCT ---");
const env2 = createComponentEnvironment(sizedProduct);

env2.addOrUpdateSelectedVariant("col_red", "S");
env2.addOrUpdateSelectedVariant("col_red", "M");
env2.addOrUpdateSelectedVariant("col_black", "L");
env2.addOrUpdateSelectedVariant("col_green", "S");
env2.addOrUpdateSelectedVariant("col_green", "S"); // Repeat Green/S -> x2
env2.addOrUpdateSelectedVariant("col_red", "L");

assert.strictEqual(env2.state().selectedVariants.length, 5);
assert.strictEqual(env2.state().selectedVariants.find(v => v.colorName === "Red" && v.size === "S").qty, 1);
assert.strictEqual(env2.state().selectedVariants.find(v => v.colorName === "Red" && v.size === "M").qty, 1);
assert.strictEqual(env2.state().selectedVariants.find(v => v.colorName === "Black" && v.size === "L").qty, 1);
assert.strictEqual(env2.state().selectedVariants.find(v => v.colorName === "Green" && v.size === "S").qty, 2);
assert.strictEqual(env2.state().selectedVariants.find(v => v.colorName === "Red" && v.size === "L").qty, 1);

console.log("✓ Scenario 2 (Sized product 5 exact combinations preserved simultaneously): PASSED");


/*
 * TEST SCENARIO 3: REPEAT SELECTION & CART VERIFICATION
 */
console.log("\n--- TEST SCENARIO 3: ADD TO CART & CART LINE INDEPENDENCE ---");
env2.addToCart();

const cartData = env2.state().cart;
assert.strictEqual(cartData.items.length, 5);
assert.strictEqual(env2.state().redirectedUrl, "/cart");

// Verify every distinct variant became its own cart line with correct cartItemKey
const cartGreenS = cartData.items.find(i => i.selectedColor === "Green" && i.selectedSize === "S");
assert.strictEqual(cartGreenS.variantId, "var_green_s");
assert.strictEqual(cartGreenS.qty, 2);

console.log("✓ Scenario 3 (Add to Cart produces separate cartItemKey lines): PASSED");

console.log("\n=== ALL DIRECT SOURCE VERIFICATIONS PASSED SUCCESSFULLY ===");
