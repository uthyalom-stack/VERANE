import prisma from "./prisma.js";

export const FULFILLMENT_METHODS = Object.freeze({
  DELIVERY: "DELIVERY",
  PICKUP: "PICKUP",
});

export const DEFAULT_PICKUP_LOCATION = Object.freeze({
  id: "verane_flagship_store",
  enabled: true,
  name: "VÉRANE Atelier Flagship Store",
  address: "Victoria Island, Lagos, Nigeria",
  phone: "+234 800 837 263",
  openingHours: "Mon - Sat: 10:00 AM - 6:00 PM",
  instructions: "Please present your order confirmation email and a valid photo ID upon collection.",
});

/**
 * Retrieves the pickup location configuration from site settings or defaults.
 * @returns {Promise<Object>} Pickup location details
 */
export async function getPickupLocationConfig() {
  try {
    const settingsRows = await prisma.siteSetting.findMany({
      where: {
        key: {
          in: [
            "pickup_enabled",
            "pickup_name",
            "pickup_address",
            "pickup_phone",
            "pickup_hours",
            "pickup_instructions",
          ],
        },
      },
    });

    const settingsMap = {};
    settingsRows.forEach((row) => {
      settingsMap[row.key] = row.value;
    });

    const enabled =
      settingsMap.pickup_enabled !== undefined
        ? settingsMap.pickup_enabled === "true" || settingsMap.pickup_enabled === true
        : DEFAULT_PICKUP_LOCATION.enabled;

    return {
      id: DEFAULT_PICKUP_LOCATION.id,
      enabled,
      name: settingsMap.pickup_name || DEFAULT_PICKUP_LOCATION.name,
      address: settingsMap.pickup_address || DEFAULT_PICKUP_LOCATION.address,
      phone: settingsMap.pickup_phone || DEFAULT_PICKUP_LOCATION.phone,
      openingHours: settingsMap.pickup_hours || DEFAULT_PICKUP_LOCATION.openingHours,
      instructions: settingsMap.pickup_instructions || DEFAULT_PICKUP_LOCATION.instructions,
    };
  } catch (error) {
    console.error("Error fetching pickup location config:", error);
    return { ...DEFAULT_PICKUP_LOCATION };
  }
}

/**
 * Validates fulfillment rules server-side.
 * @param {Object} params
 * @param {string} params.fulfillmentMethod - "DELIVERY" or "PICKUP"
 * @param {number} params.shippingFee - Computed shipping fee
 * @param {Object} [params.courier] - Selected courier details for delivery
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateFulfillmentRules({ fulfillmentMethod, shippingFee, courier }) {
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
