import prisma from "@/lib/prisma";

const DEFAULT_PICKUP_SETTINGS = {
  uthyPickupAddress: "UTHY LUXURY Atelier, Victoria Island, Lagos, Nigeria",
  uthyImmediatePickupEnabled: "false",
  uthyPickupInstructions: "Please present your order confirmation email and a valid photo ID upon arrival.",
  alomzieePickupAddress: "ALOMZIEE FOOTIES Boutique, Ikoyi, Lagos, Nigeria",
  alomzieeImmediatePickupEnabled: "false",
  alomzieePickupInstructions: "Please present your order confirmation email and a valid photo ID upon arrival.",
};

/**
 * Resolves the appropriate pickup brand for a list of cart items according to VÉRANE rules:
 * 1. UTHY-only order -> UTHY pickup address
 * 2. ALOMZIEE-only order -> ALOMZIEE pickup address
 * 3. Collaboration order -> pickup address belonging to the creator brand responsible for that collaboration
 * 4. Mixed standalone UTHY + ALOMZIEE products -> UTHY pickup address
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

  // Precedence Rule 3: Collaboration order -> creator's pickup address
  if (hasCollaboration && collaborationCreatorBrand) {
    return collaborationCreatorBrand === "ALOMZIEE" ? "ALOMZIEE" : "UTHY";
  }

  // Precedence Rule 4: Mixed UTHY + ALOMZIEE -> UTHY pickup address
  if (hasUthy && hasAlomziee) {
    return "UTHY";
  }

  // Precedence Rule 2: ALOMZIEE-only -> ALOMZIEE pickup address
  if (hasAlomziee && !hasUthy) {
    return "ALOMZIEE";
  }

  // Precedence Rule 1: UTHY-only -> UTHY pickup address
  return "UTHY";
}

/**
 * Calculates available pickup dates based on order date and admin immediate settings.
 * Normal pickup dates start 2-3 days after order date.
 *
 * @param {boolean} immediateEnabled - Whether immediate pickup is enabled by admin.
 * @param {Date} [baseDate] - Base reference date (defaults to now).
 * @returns {Array<Object>} List of available pickup date choices.
 */
export function calculatePickupDates(immediateEnabled, baseDate = new Date()) {
  const dates = [];

  if (immediateEnabled) {
    dates.push({
      value: "IMMEDIATE",
      label: "Immediate Pickup (Ready Today)",
      isImmediate: true,
    });
  }

  // Normal pickup starts 2 days from order date
  const startDaysOut = 2;
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
 * Loads full pickup information for a cart.
 *
 * @param {Array} items - Cart items
 * @returns {Promise<Object>} Full pickup details
 */
export async function getPickupDetailsForCart(items) {
  const pickupBrand = await resolveOrderPickupBrand(items);

  const settings = { ...DEFAULT_PICKUP_SETTINGS };
  try {
    const rows = await prisma.siteSetting.findMany({
      where: {
        key: {
          in: Object.keys(DEFAULT_PICKUP_SETTINGS),
        },
      },
    });
    rows.forEach((row) => {
      settings[row.key] = row.value;
    });
  } catch {
    // Graceful fallback to default pickup settings if DB is unavailable
  }

  const isUthy = pickupBrand === "UTHY";
  const pickupAddress = isUthy ? settings.uthyPickupAddress : settings.alomzieePickupAddress;
  const immediateEnabled = (isUthy ? settings.uthyImmediatePickupEnabled : settings.alomzieeImmediatePickupEnabled) === "true";
  const pickupInstructions = isUthy ? settings.uthyPickupInstructions : settings.alomzieePickupInstructions;

  const availableDates = calculatePickupDates(immediateEnabled);

  return {
    pickupBrand,
    pickupBrandDisplayName: isUthy ? "UTHY LUXURY" : "ALOMZIEE FOOTIES",
    pickupAddress,
    immediatePickupEnabled: immediateEnabled,
    pickupInstructions,
    availableDates,
  };
}
