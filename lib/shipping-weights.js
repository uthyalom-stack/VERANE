/**
 * Shipping Weight Presets and Calculation Utilities for VÉRANE Logistical Estimates
 */

export const WEIGHT_PRESETS = [
  { keywords: ["t-shirt", "tshirt", "tee", "light shirt", "top"], weight: 0.25, name: "T-shirt / Light Shirt" },
  { keywords: ["dress shirt", "shirt", "button down", "blouse"], weight: 0.35, name: "Dress Shirt" },
  { keywords: ["hoodie", "sweatshirt", "sweater"], weight: 0.70, name: "Hoodie / Sweatshirt" },
  { keywords: ["trouser", "pants", "pant", "slacks", "chinos"], weight: 0.60, name: "Trousers" },
  { keywords: ["jean", "denim"], weight: 0.70, name: "Jeans" },
  { keywords: ["jacket", "coat", "blazer", "outerwear", "suit"], weight: 0.60, name: "Jacket" },
  { keywords: ["traditional", "agbada", "kaftan", "senator", "native", "boubou"], weight: 0.80, name: "Traditional Outfit" },
  { keywords: ["short", "shorts", "bermuda"], weight: 0.30, name: "Shorts" },
  { keywords: ["sneaker", "sneakers", "trainer", "kicks"], weight: 1.00, name: "Sneakers" },
  { keywords: ["boot", "boots"], weight: 1.00, name: "Boots" },
  { keywords: ["sandal", "sandals"], weight: 0.60, name: "Sandals" },
  { keywords: ["slide", "slides", "mule", "flip-flop", "slipper"], weight: 0.50, name: "Slides / Slippers" },
  { keywords: ["belt"], weight: 0.40, name: "Belt" },
  { keywords: ["handbag", "bag", "purse", "tote", "clutch"], weight: 0.80, name: "Handbag" },
  { keywords: ["accessory", "accessories", "wallet", "hat", "cap", "sunglasses", "jewelry", "sock", "socks"], weight: 0.15, name: "Small Accessory" },
];

/**
 * Returns default estimated weight in KG based on product category or name.
 *
 * @param {string} [categoryName]
 * @param {string} [productName]
 * @returns {number} Estimated weight in KG (min 0.15 KG)
 */
export function getDefaultProductWeight(categoryName = "", productName = "") {
  const combined = `${categoryName || ""} ${productName || ""}`.toLowerCase();

  for (const preset of WEIGHT_PRESETS) {
    if (preset.keywords.some((kw) => combined.includes(kw))) {
      return preset.weight;
    }
  }

  // Fallback default for unmapped apparel / footwear
  return 0.50;
}

/**
 * Server-authoritatively calculates combined parcel weight and package dimensions for cart items.
 * Never uses quantity as weight or arbitrary hardcoded fallbacks.
 *
 * @param {Array} validatedItems - Items array with fetched product references
 * @returns {{ weight: number, length: number, width: number, height: number }}
 */
export function calculateParcelPackageDetails(validatedItems) {
  if (!Array.isArray(validatedItems) || validatedItems.length === 0) {
    return { weight: 1.0, length: 20, width: 20, height: 15 };
  }

  let totalWeight = 0;
  let maxLength = 20;
  let maxWidth = 20;
  let totalHeight = 5;

  for (const item of validatedItems) {
    const qty = Math.max(1, Number(item.qty || item.quantity || 1));
    const productRef = item.product || item;

    const unitWeight = Number(productRef?.weight) > 0
      ? Number(productRef.weight)
      : getDefaultProductWeight(productRef?.category, productRef?.name);

    totalWeight += unitWeight * qty;

    const l = Number(productRef?.packageLength) || 20;
    const w = Number(productRef?.packageWidth) || 20;
    const h = Number(productRef?.packageHeight) || 5;

    if (l > maxLength) maxLength = l;
    if (w > maxWidth) maxWidth = w;
    totalHeight += h * qty;
  }

  // Ensure minimum weight of 0.25 KG and round to 2 decimal places
  const finalWeight = Math.max(0.25, Math.round(totalWeight * 100) / 100);
  const finalHeight = Math.min(100, Math.max(10, Math.round(totalHeight)));

  return {
    weight: finalWeight,
    length: Math.round(maxLength),
    width: Math.round(maxWidth),
    height: finalHeight,
  };
}
