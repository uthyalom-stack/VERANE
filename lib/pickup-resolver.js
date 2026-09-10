import prisma from "@/lib/prisma";

/**
 * Resolves the appropriate pickup brand for a list of cart items according to VÉRANE rules:
 * 1. Collaboration product/order -> actual collaboration creator's pickup address
 * 2. Standalone UTHY + ALOMZIEE mixed cart -> UTHY pickup address
 * 3. UTHY-only order -> UTHY pickup address
 * 4. ALOMZIEE-only order -> ALOMZIEE pickup address
 *
 * @param {Array} items - Cart items array
 * @returns {Promise<string>} Resolved brand ("UTHY" | "ALOMZIEE")
 */
export async function resolveOrderPickupBrand(items) {
  if (!Array.isArray(items) || items.length === 0) {
    return "UTHY";
  }

  let hasCollaboration = false;
  let collaborationCreatorBrand = null;
  let hasUthy = false;
  let hasAlomziee = false;

  for (const item of items) {
    if (!item) continue;

    const collabId = item.collaborationProductId || (item.isCollaboration ? item.id : null);

    if (collabId && item.isCollaboration) {
      hasCollaboration = true;
      try {
        const collabProd = await prisma.collaborationProduct.findUnique({
          where: { id: collabId },
          include: { collaboration: { include: { requests: true } } },
        });

        if (collabProd?.collaboration) {
          const collab = collabProd.collaboration;
          if (collab.creatorBrand) {
            collaborationCreatorBrand = collab.creatorBrand === "ALOMZIEE_FOOTIES" ? "ALOMZIEE" : collab.creatorBrand;
          } else if (Array.isArray(collab.requests) && collab.requests.length > 0) {
            const req = collab.requests.find((r) => r.status === "ACCEPTED") || collab.requests[0];
            if (req?.fromBrand) {
              collaborationCreatorBrand = req.fromBrand === "ALOMZIEE_FOOTIES" ? "ALOMZIEE" : req.fromBrand;
            }
          }

          if (!collaborationCreatorBrand && collab.brandA) {
            collaborationCreatorBrand = collab.brandA === "ALOMZIEE_FOOTIES" ? "ALOMZIEE" : collab.brandA;
          }
        }
      } catch {
        // Fallback safely if query fails
      }
    } else {
      const prodId = item.productId || item.id;
      let brandStr = item.brand || item.productBrand || null;

      if (prodId) {
        try {
          const prod = await prisma.product.findUnique({
            where: { id: prodId },
            select: { brand: true },
          });
          if (prod?.brand) {
            brandStr = prod.brand;
          }
        } catch {
          // Ignore DB error during resolution fallback
        }
      }

      if (brandStr) {
        const b = String(brandStr).toUpperCase();
        if (b.includes("UTHY")) hasUthy = true;
        if (b.includes("ALOMZIEE")) hasAlomziee = true;
      }
    }
  }

  // Precedence Rule 1: Collaboration order -> creator's pickup address
  if (hasCollaboration && collaborationCreatorBrand) {
    return collaborationCreatorBrand === "ALOMZIEE" ? "ALOMZIEE" : "UTHY";
  }

  // Precedence Rule 2: Standalone UTHY + ALOMZIEE mixed cart -> UTHY pickup address
  if (hasUthy && hasAlomziee) {
    return "UTHY";
  }

  // Precedence Rule 4: ALOMZIEE-only -> ALOMZIEE pickup address
  if (hasAlomziee && !hasUthy) {
    return "ALOMZIEE";
  }

  // Precedence Rule 3: UTHY-only -> UTHY pickup address
  return "UTHY";
}

/**
 * Calculates available pickup dates based on brand leadDays config and immediate toggle.
 *
 * @param {boolean} immediateEnabled - Whether immediate pickup is enabled by admin.
 * @param {number} leadDays - Number of days out normal pickup starts (default 2).
 * @param {Date} [baseDate] - Base reference date.
 * @returns {Array<Object>} Available pickup date options.
 */
export function calculatePickupDates(immediateEnabled, leadDays = 2, baseDate = new Date()) {
  const dates = [];

  if (immediateEnabled) {
    dates.push({
      value: "IMMEDIATE",
      label: "Immediate Pickup (Ready Today)",
      isImmediate: true,
    });
  }

  const startDaysOut = Math.max(1, Number(leadDays || 2));
  const numDaysToShow = 5;

  for (let i = 0; i < numDaysToShow; i++) {
    const d = new Date(baseDate);
    d.setDate(d.getDate() + startDaysOut + i);

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const formattedValue = `${year}-${month}-${day}`;

    const formattedLabel = d.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });

    dates.push({
      value: formattedValue,
      label: formattedLabel,
      isImmediate: false,
    });
  }

  return dates;
}

/**
 * Loads full pickup information for a cart directly from SiteSetting table.
 * NO FAKE DEFAULTS: If address is unconfigured, return configured: false and available: false.
 *
 * @param {Array} items - Cart items
 * @returns {Promise<Object>} Pickup details for cart
 */
export async function getPickupDetailsForCart(items) {
  const pickupBrand = await resolveOrderPickupBrand(items);
  const isUthy = pickupBrand === "UTHY";

  const prefix = isUthy ? "uthy" : "alomziee";

  const settingKeys = [
    `${prefix}PickupAddress`,
    `${prefix}ImmediatePickupEnabled`,
    `${prefix}PickupInstructions`,
    `${prefix}PickupLeadDays`,
  ];

  const rows = await prisma.siteSetting.findMany({
    where: {
      key: { in: settingKeys },
    },
  });

  const map = {};
  rows.forEach((r) => {
    map[r.key] = r.value;
  });

  const rawAddress = map[`${prefix}PickupAddress`]?.trim() || "";
  const immediateEnabled = map[`${prefix}ImmediatePickupEnabled`] === "true";
  const instructions = map[`${prefix}PickupInstructions`]?.trim() || "";
  const leadDays = Number(map[`${prefix}PickupLeadDays`] || 2);

  if (!rawAddress) {
    return {
      pickupBrand,
      pickupBrandDisplayName: isUthy ? "UTHY LUXURY" : "ALOMZIEE FOOTIES",
      configured: false,
      available: false,
      error: `Pickup address for ${isUthy ? "UTHY LUXURY" : "ALOMZIEE FOOTIES"} has not been configured by the brand administrator.`,
    };
  }

  const availableDates = calculatePickupDates(immediateEnabled, leadDays);

  return {
    pickupBrand,
    pickupBrandDisplayName: isUthy ? "UTHY LUXURY" : "ALOMZIEE FOOTIES",
    configured: true,
    available: true,
    pickupAddress: rawAddress,
    immediatePickupEnabled: immediateEnabled,
    pickupInstructions: instructions,
    leadDays,
    availableDates,
  };
}
