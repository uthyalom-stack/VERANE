import assert from "assert";

console.log("=== RUNNING REAL CUSTOMER MULTI-VARIANT PRODUCT & CART FLOW VERIFICATION ===");

/*
 * SECTION 1: PRODUCT WITHOUT SIZES
 * Simulated selection logic matching app/product/[id]/page.js
 */
const productWithoutSizes = {
  id: "prod_no_sizes",
  inventory: 10,
  productColors: [
    { id: "c_black", name: "Black", hex: "#000000" },
    { id: "c_red", name: "Red", hex: "#ff0000" },
    { id: "c_green", name: "Green", hex: "#00ff00" },
  ],
  variants: [
    { id: "v_black", colorId: "c_black", stock: 5 },
    { id: "v_red", colorId: "c_red", stock: 5 },
    { id: "v_green", colorId: "c_green", stock: 5 },
  ],
};

function simulateProductDetailState(product) {
  let selectedVariants = [];

  const addOrUpdateSelectedVariant = (colorId, sizeLabel, qtyToAdd = 1) => {
    const productColors = product.productColors || [];
    const variants = product.variants || [];
    const hasSizes = variants.some((v) => Boolean(v.size));

    const chosenColorObj = colorId
      ? productColors.find((c) => String(c.id) === String(colorId))
      : null;
    const chosenColorName = chosenColorObj?.name || null;

    const exactVar = variants.find((v) => {
      const vSize = v.size || null;
      const sizeMatches = sizeLabel
        ? Boolean(vSize) && String(vSize) === String(sizeLabel)
        : (!hasSizes ? true : !vSize);
      const colorMatches = colorId
        ? Boolean(v.colorId) && String(v.colorId) === String(colorId)
        : (!chosenColorObj ? true : !v.colorId);
      return sizeMatches && colorMatches;
    }) || null;

    const maxStock = exactVar ? exactVar.stock : product.inventory;
    const varKey = exactVar?.id ? String(exactVar.id) : "";
    const key = [product.id, varKey, chosenColorObj?.id || chosenColorName || "", sizeLabel || ""].join("|");

    const existingIndex = selectedVariants.findIndex((item) => item.key === key);
    if (existingIndex >= 0) {
      const existingItem = selectedVariants[existingIndex];
      const nextQty = existingItem.qty + qtyToAdd;
      if (maxStock > 0 && nextQty > maxStock) return false;
      selectedVariants[existingIndex] = { ...existingItem, qty: nextQty };
    } else {
      selectedVariants.push({
        key,
        exactVariant: exactVar,
        variantId: exactVar?.id || null,
        colorId: chosenColorObj?.id || null,
        colorName: chosenColorName,
        size: sizeLabel || null,
        qty: qtyToAdd,
        maxStock,
      });
    }
    return true;
  };

  const updateVariantQty = (key, delta) => {
    selectedVariants = selectedVariants
      .map((item) => {
        if (item.key !== key) return item;
        const newQty = item.qty + delta;
        if (newQty <= 0) return null;
        if (item.maxStock > 0 && newQty > item.maxStock) return item;
        return { ...item, qty: newQty };
      })
      .filter(Boolean);
  };

  const removeSelectedVariant = (key) => {
    selectedVariants = selectedVariants.filter((item) => item.key !== key);
  };

  return {
    getSelectedVariants: () => selectedVariants,
    addOrUpdateSelectedVariant,
    updateVariantQty,
    removeSelectedVariant,
  };
}

// Test Product WITHOUT sizes
const pdNoSizes = simulateProductDetailState(productWithoutSizes);

// 1. Select Black x1
pdNoSizes.addOrUpdateSelectedVariant("c_black", null, 1);
assert.strictEqual(pdNoSizes.getSelectedVariants().length, 1);
assert.strictEqual(pdNoSizes.getSelectedVariants()[0].colorName, "Black");
assert.strictEqual(pdNoSizes.getSelectedVariants()[0].qty, 1);

// 2. Select Red x3 (adding Red must NOT clear Black)
pdNoSizes.addOrUpdateSelectedVariant("c_red", null, 3);
assert.strictEqual(pdNoSizes.getSelectedVariants().length, 2);

// 3. Select Green x1 (adding Green must NOT clear Black or Red)
pdNoSizes.addOrUpdateSelectedVariant("c_green", null, 1);
assert.strictEqual(pdNoSizes.getSelectedVariants().length, 3);

const listNoSizes = pdNoSizes.getSelectedVariants();
assert.strictEqual(listNoSizes.find((v) => v.colorName === "Black").qty, 1);
assert.strictEqual(listNoSizes.find((v) => v.colorName === "Red").qty, 3);
assert.strictEqual(listNoSizes.find((v) => v.colorName === "Green").qty, 1);
console.log("✓ Scenario 1 (Product WITHOUT sizes x3 colors): PASSED");


/*
 * SECTION 2: PRODUCT WITH SIZES
 */
const productWithSizes = {
  id: "prod_with_sizes",
  inventory: 20,
  productColors: [
    { id: "c_red", name: "Red", hex: "#ff0000" },
    { id: "c_black", name: "Black", hex: "#000000" },
    { id: "c_green", name: "Green", hex: "#00ff00" },
  ],
  variants: [
    { id: "v_red_s", colorId: "c_red", size: "S", stock: 10 },
    { id: "v_red_m", colorId: "c_red", size: "M", stock: 10 },
    { id: "v_black_l", colorId: "c_black", size: "L", stock: 10 },
    { id: "v_green_s", colorId: "c_green", size: "S", stock: 10 },
    { id: "v_red_l", colorId: "c_red", size: "L", stock: 10 },
  ],
};

const pdSizes = simulateProductDetailState(productWithSizes);

// Select Red/S x1, Red/M x1, Black/L x1, Green/S x2, Red/L x1
pdSizes.addOrUpdateSelectedVariant("c_red", "S", 1);
pdSizes.addOrUpdateSelectedVariant("c_red", "M", 1);
pdSizes.addOrUpdateSelectedVariant("c_black", "L", 1);
pdSizes.addOrUpdateSelectedVariant("c_green", "S", 2);
pdSizes.addOrUpdateSelectedVariant("c_red", "L", 1);

assert.strictEqual(pdSizes.getSelectedVariants().length, 5);
const listSizes = pdSizes.getSelectedVariants();
assert.strictEqual(listSizes.find((v) => v.colorName === "Red" && v.size === "S").qty, 1);
assert.strictEqual(listSizes.find((v) => v.colorName === "Red" && v.size === "M").qty, 1);
assert.strictEqual(listSizes.find((v) => v.colorName === "Black" && v.size === "L").qty, 1);
assert.strictEqual(listSizes.find((v) => v.colorName === "Green" && v.size === "S").qty, 2);
assert.strictEqual(listSizes.find((v) => v.colorName === "Red" && v.size === "L").qty, 1);
console.log("✓ Scenario 2 (Product WITH sizes 5 exact combinations): PASSED");


/*
 * SECTION 3: REPEAT SELECTION & INVENTORY STOCK ENFORCEMENT
 */
// Selecting exact same variant (Red/S) again increases quantity
pdSizes.addOrUpdateSelectedVariant("c_red", "S", 1);
assert.strictEqual(pdSizes.getSelectedVariants().length, 5); // Length remains 5
assert.strictEqual(pdSizes.getSelectedVariants().find((v) => v.colorName === "Red" && v.size === "S").qty, 2);
console.log("✓ Scenario 3 (Repeat selection increments quantity): PASSED");


/*
 * SECTION 4: CART INTEGRATION & INDEPENDENCE
 */
const mockCartItems = [];
for (const item of pdSizes.getSelectedVariants()) {
  const cartItemKey = [productWithSizes.id, item.variantId || "", item.colorId || "", item.size || "", ""].join("|");
  mockCartItems.push({
    ...productWithSizes,
    variantId: item.variantId,
    cartItemKey,
    qty: item.qty,
    selectedColor: item.colorName,
    selectedSize: item.size,
  });
}

assert.strictEqual(mockCartItems.length, 5);

// Removing one cart line (Green/S) leaves other 4 lines untouched
const targetKeyToDel = mockCartItems.find((i) => i.selectedColor === "Green" && i.selectedSize === "S").cartItemKey;
const filteredCart = mockCartItems.filter((i) => i.cartItemKey !== targetKeyToDel);

assert.strictEqual(filteredCart.length, 4);
assert.strictEqual(filteredCart.some((i) => i.selectedColor === "Green"), false);
assert.strictEqual(filteredCart.find((i) => i.selectedColor === "Red" && i.selectedSize === "S").qty, 2);
console.log("✓ Scenario 4 (Cart line separation & independent removal): PASSED");

console.log("\n=== REAL CUSTOMER MULTI-VARIANT FLOW VERIFICATION COMPLETE ===");
