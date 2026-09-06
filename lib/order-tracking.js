export const VALID_TRACKING_STATUSES = ["Processing", "In Transit", "Delivered"];

/**
 * Normalizes brand string variations to canonical brand keys.
 * @param {string} brand
 * @returns {string|null}
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
 * Returns human-readable display name for brand key.
 * @param {string} brandKey
 * @returns {string}
 */
export function getBrandDisplayName(brandKey) {
  const normalized = normalizeBrandKey(brandKey);
  if (normalized === "UTHY_LUXURY") return "UTHY LUXURY";
  if (normalized === "ALOMZIEE_FOOTIES") return "ALOMZIEE FOOTIES";
  return brandKey || "VÉRANE";
}

/**
 * Extract present brand keys from an order's items.
 * @param {Object} order - Order object with items included
 * @returns {string[]} Array of unique normalized brand keys present in order
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
 * Formats brand-specific tracking information for an order.
 * @param {Object} order - Order object with items and brandTrackings
 * @returns {Array<{brand: string, displayName: string, status: string, updatedAt: Date|string}>}
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
