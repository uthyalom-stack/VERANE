import prisma from "./prisma.js";

export const FULFILLMENT_METHODS = Object.freeze({
  DELIVERY: "DELIVERY",
  PICKUP: "PICKUP",
});

export const FULFILLMENT_STATUSES = Object.freeze({
  UNFULFILLED: "UNFULFILLED",
  READY_FOR_PICKUP: "READY_FOR_PICKUP",
  PICKED_UP: "PICKED_UP",
  DISPATCH_PENDING: "DISPATCH_PENDING",
  DISPATCHED: "DISPATCHED",
  DELIVERED: "DELIVERED",
  DISPATCH_FAILED: "DISPATCH_FAILED",
  CANCELLED: "CANCELLED",
});

export const DEFAULT_UTHY_PICKUP = Object.freeze({
  id: "uthy_flagship",
  brand: "UTHY_LUXURY",
  enabled: true,
  name: "UTHY LUXURY Atelier Store",
  address: "Victoria Island, Lagos, Nigeria",
  phone: "+234 800 837 2631",
  openingHours: "Mon - Sat: 10:00 AM - 6:00 PM",
  instructions: "Please present your order confirmation email and a valid photo ID upon collection.",
});

export const DEFAULT_ALOMZIEE_PICKUP = Object.freeze({
  id: "alomziee_flagship",
  brand: "ALOMZIEE_FOOTIES",
  enabled: true,
  name: "ALOMZIEE FOOTIES Studio",
  address: "Lekki Phase 1, Lagos, Nigeria",
  phone: "+234 800 837 2632",
  openingHours: "Mon - Sat: 10:00 AM - 6:00 PM",
  instructions: "Please present your order confirmation email and a valid photo ID upon collection.",
});

/**
 * Retrieves the pickup location configuration for a specific brand from SiteSettings or defaults.
 * @param {string} brand - "UTHY_LUXURY" | "UTHY" | "ALOMZIEE_FOOTIES" | "ALOMZIEE"
 * @returns {Promise<Object>} Pickup location details
 */
export async function getBrandPickupConfig(brand) {
  const normBrand = (brand || "").toUpperCase().includes("ALOMZIEE") ? "ALOMZIEE" : "UTHY";
  const defaultLoc = normBrand === "ALOMZIEE" ? DEFAULT_ALOMZIEE_PICKUP : DEFAULT_UTHY_PICKUP;
  const prefix = normBrand === "ALOMZIEE" ? "alomziee_pickup_" : "uthy_pickup_";

  try {
    const settingsRows = await prisma.siteSetting.findMany({
      where: {
        key: {
          in: [
            `${prefix}enabled`,
            `${prefix}name`,
            `${prefix}address`,
            `${prefix}phone`,
            `${prefix}hours`,
            `${prefix}instructions`,
          ],
        },
      },
    });

    const settingsMap = {};
    settingsRows.forEach((row) => {
      settingsMap[row.key] = row.value;
    });

    const enabled =
      settingsMap[`${prefix}enabled`] !== undefined
        ? settingsMap[`${prefix}enabled`] === "true" || settingsMap[`${prefix}enabled`] === true
        : defaultLoc.enabled;

    return {
      id: defaultLoc.id,
      brand: defaultLoc.brand,
      enabled,
      name: settingsMap[`${prefix}name`] || defaultLoc.name,
      address: settingsMap[`${prefix}address`] || defaultLoc.address,
      phone: settingsMap[`${prefix}phone`] || defaultLoc.phone,
      openingHours: settingsMap[`${prefix}hours`] || defaultLoc.openingHours,
      instructions: settingsMap[`${prefix}instructions`] || defaultLoc.instructions,
    };
  } catch (error) {
    console.error(`Error fetching pickup location config for ${normBrand}:`, error);
    return { ...defaultLoc };
  }
}

/**
 * Returns default sender details for Shipbubble rate requests.
 * @returns {Promise<Object>} Shipbubble sender object
 */
export async function getShipbubbleSenderAddress() {
  try {
    const settings = await prisma.siteSetting.findMany({
      where: { key: { startsWith: "shipbubble_sender_" } },
    });

    const map = {};
    settings.forEach((s) => {
      map[s.key] = s.value;
    });

    return {
      name: map.shipbubble_sender_name || "VÉRANE Atelier Central Hub",
      email: map.shipbubble_sender_email || "logistics@verane.com",
      phone: map.shipbubble_sender_phone || "+234800837263",
      address: map.shipbubble_sender_address || "Victoria Island, Lagos, Nigeria",
    };
  } catch {
    return {
      name: "VÉRANE Atelier Central Hub",
      email: "logistics@verane.com",
      phone: "+234800837263",
      address: "Victoria Island, Lagos, Nigeria",
    };
  }
}

/**
 * Validates fulfillment rules server-side.
 * @param {Object} params
 * @param {string} params.fulfillmentMethod - "DELIVERY" or "PICKUP"
 * @param {number} params.shippingFee - Computed customer shipping fee
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateFulfillmentRules({ fulfillmentMethod, shippingFee }) {
  const method = (fulfillmentMethod || FULFILLMENT_METHODS.DELIVERY).toUpperCase();

  if (!Object.values(FULFILLMENT_METHODS).includes(method)) {
    return { valid: false, error: `Invalid fulfillment method '${fulfillmentMethod}'. Must be DELIVERY or PICKUP.` };
  }

  if (method === FULFILLMENT_METHODS.PICKUP) {
    if (Number(shippingFee) !== 0) {
      return { valid: false, error: "Pickup orders must have a shipping fee of exactly ₦0." };
    }
    return { valid: true };
  }

  if (method === FULFILLMENT_METHODS.DELIVERY) {
    if (typeof shippingFee !== "number" || isNaN(shippingFee) || shippingFee < 0) {
      return { valid: false, error: "Delivery orders require a valid non-negative shipping fee." };
    }
    return { valid: true };
  }

  return { valid: false, error: "Fulfillment validation error." };
}
