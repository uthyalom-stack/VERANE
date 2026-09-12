/**
 * Shipping Weight Resolution Utilities for VÉRANE Logistical Estimates
 *
 * Weight Resolution Precedence:
 * 1. Product.weight (Product-level override if explicitly configured and non-null)
 * 2. Category.shippingWeight (Admin-configured category default)
 *
 * If both are missing/null, shipping weight resolution throws a clear error.
 * No hardcoded category-name mappings.
 * No arbitrary 1.0 KG / 0.5 KG silent fallbacks.
 */

/**
 * Validates a category shipping weight value in KG.
 * Category weight range: 0.15 KG to 1.50 KG (preferably 0.05 increments).
 *
 * @param {number} weight
 * @returns {boolean}
 */
export function isValidCategoryShippingWeight(weight) {
  const num = Number(weight);
  if (!Number.isFinite(num) || num < 0.15 || num > 1.50) {
    return false;
  }
  return true;
}

/**
 * Server-authoritatively resolves the unit shipping weight for a product item.
 *
 * Precedence:
 * Product.weight ?? Category.shippingWeight
 *
 * @param {Object} productRef - Product record with optional categoryRef
 * @returns {number} Unit weight in KG
 */
export function resolveItemUnitWeight(productRef) {
  if (!productRef || typeof productRef !== "object") {
    throw new Error("Missing product data for shipping weight calculation.");
  }

  // 1. Product level override
  if (productRef.weight !== undefined && productRef.weight !== null) {
    const w = Number(productRef.weight);
    if (!isNaN(w) && w > 0) {
      return Math.round(w * 100) / 100;
    }
  }

  // 2. Category level default
  const categoryWeight = productRef.categoryRef?.shippingWeight ?? productRef.categoryShippingWeight;
  if (categoryWeight !== undefined && categoryWeight !== null) {
    const cw = Number(categoryWeight);
    if (!isNaN(cw) && cw >= 0.15 && cw <= 1.50) {
      return Math.round(cw * 100) / 100;
    }
  }

  // 3. Neither exists -> fail clearly without silent arbitrary fallback
  const prodName = productRef.name ? `"${productRef.name}"` : "Product";
  throw new Error(`Shipping weight configuration missing for ${prodName}. Both product weight override and category shipping weight are unset.`);
}

/**
 * Server-authoritatively calculates combined parcel weight and package dimensions for cart items.
 *
 * Formula: totalWeight = Σ(resolvedUnitWeight * quantity)
 *
 * @param {Array} validatedItems - Items array with fetched product and category references
 * @returns {{ weight: number, length: number, width: number, height: number }}
 */
export function calculateParcelPackageDetails(validatedItems) {
  if (!Array.isArray(validatedItems) || validatedItems.length === 0) {
    throw new Error("Cart is empty for package calculation.");
  }

  let totalWeight = 0;
  let maxLength = 20;
  let maxWidth = 20;
  let totalHeight = 5;

  for (const item of validatedItems) {
    const qty = Math.max(1, Number(item.qty || item.quantity || 1));
    const productRef = item.product || item;

    const unitWeight = resolveItemUnitWeight(productRef);
    totalWeight += unitWeight * qty;

    const l = Number(productRef?.packageLength) || 20;
    const w = Number(productRef?.packageWidth) || 20;
    const h = Number(productRef?.packageHeight) || 5;

    if (l > maxLength) maxLength = l;
    if (w > maxWidth) maxWidth = w;
    totalHeight += h * qty;
  }

  const finalWeight = Math.round(totalWeight * 100) / 100;
  const finalHeight = Math.min(100, Math.max(10, Math.round(totalHeight)));

  return {
    weight: finalWeight,
    length: Math.round(maxLength),
    width: Math.round(maxWidth),
    height: finalHeight,
  };
}
