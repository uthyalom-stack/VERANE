export const VALID_TRACKING_STATUSES = ["Processing", "In Transit", "Delivered"];

/**
 * Normalize a brand name to its canonical key.
 * @param {string} brand - The brand name or alias to normalize.
 * @return {string|null} The canonical brand key, the trimmed uppercase input, or `null` for invalid values.
 */
export function normalizeBrandKey(brand) {
  if (!brand || typeof brand !== "string") return null;
  const upper = brand.trim().toUpperCase();

  if (upper === "UTHY" || upper === "UTHY_LUXURY" || upper === "UTHY LUXURY") {
    return "UTHY_LUXURY";
  }

  if (
    upper === "ALOMZIEE" ||
    upper === "ALOMZIEE_FOOTIES" ||
    upper === "ALOMZIEE FOOTIES"
  ) {
    return "ALOMZIEE_FOOTIES";
  }

  return upper;
}

/**
 * Converts a brand key into its human-readable display name.
 * @param {string} brandKey - The brand key to format.
 * @return {string} The display name, the original brand key, or "VÉRANE" when no key is provided.
 */
export function getBrandDisplayName(brandKey) {
  const normalized = normalizeBrandKey(brandKey);
  if (normalized === "UTHY_LUXURY") return "UTHY LUXURY";
  if (normalized === "ALOMZIEE_FOOTIES") return "ALOMZIEE FOOTIES";
  return brandKey || "VÉRANE";
}

/**
 * Identifies the normalized brand keys represented in an order's items.
 * @param {Object} order - Order containing the items to inspect.
 * @return {string[]} Unique brand keys, with recognized brands listed first.
 */
export function getOrderPresentBrands(order) {
  if (!order || !Array.isArray(order.items)) return [];

  const brandSet = new Set();

  for (const item of order.items) {
    if (item.product?.brand) {
      const key = normalizeBrandKey(item.product.brand);
      if (key) brandSet.add(key);
    }

    if (item.collaborationProduct) {
      if (item.collaborationProduct.productA?.brand) {
        const keyA = normalizeBrandKey(item.collaborationProduct.productA.brand);
        if (keyA) brandSet.add(keyA);
      }
      if (item.collaborationProduct.productB?.brand) {
        const keyB = normalizeBrandKey(item.collaborationProduct.productB.brand);
        if (keyB) brandSet.add(keyB);
      }
      // If productA/productB brand fields aren't populated directly on collaborationProduct,
      // collaborations by architecture involve both UTHY and ALOMZIEE
      if (
        !item.collaborationProduct.productA?.brand &&
        !item.collaborationProduct.productB?.brand
      ) {
        brandSet.add("UTHY_LUXURY");
        brandSet.add("ALOMZIEE_FOOTIES");
      }
    }
  }

  const result = [];
  if (brandSet.has("UTHY_LUXURY")) result.push("UTHY_LUXURY");
  if (brandSet.has("ALOMZIEE_FOOTIES")) result.push("ALOMZIEE_FOOTIES");

  // Add any other brand if exists
  for (const b of brandSet) {
    if (b !== "UTHY_LUXURY" && b !== "ALOMZIEE_FOOTIES") {
      result.push(b);
    }
  }

  return result;
}

/**
 * Builds tracking records for each brand present in an order.
 * @param {Object} order - Order containing items, brand trackings, and a creation timestamp.
 * @returns {Array<{brand: string, displayName: string, status: string, updatedAt: Date|string}>} Brand tracking records with default processing status and creation timestamp when values are missing.
 */
export function getOrderBrandTrackingInfo(order) {
  const presentBrands = getOrderPresentBrands(order);
  const trackingsMap = new Map();

  if (Array.isArray(order.brandTrackings)) {
    for (const bt of order.brandTrackings) {
      const norm = normalizeBrandKey(bt.brand);
      if (norm) {
        trackingsMap.set(norm, bt);
      }
    }
  }

  return presentBrands.map((brandKey) => {
    const record = trackingsMap.get(brandKey);
    return {
      brand: brandKey,
      displayName: getBrandDisplayName(brandKey),
      status: record?.status || "Processing",
      updatedAt: record?.updatedAt || order.createdAt,
    };
  });
}
