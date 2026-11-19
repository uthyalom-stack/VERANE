import prisma from "@/lib/prisma";

/**
 * Resolves the appropriate pickup brand for a list of cart items according to VÉRANE rules:
 * 1. Collaboration product/order -> actual collaboration creator's pickup address
 *    (Uses explicit Collaboration.creatorBrand as strictly authoritative, without falling back to brandA or requests)
 *    If a cart contains multiple collaboration products whose creatorBrand values resolve to different brands,
 *    reject pickup resolution cleanly instead of allowing the last collaboration creator to overwrite previous ones.
 * 2. Standalone UTHY + ALOMZIEE mixed cart -> UTHY pickup address
 * 3. UTHY-only order -> UTHY pickup address
 * 4. ALOMZIEE-only order -> ALOMZIEE pickup address
 *
 * NO SILENT TRY/CATCH DB FALLBACKS:
 * If a database operation fails, re-throw or throw a clear error rather than silently defaulting to UTHY.
 *
 * @param {Array} items - Cart items array
 * @returns {Promise<string>} Resolved brand ("UTHY" | "ALOMZIEE")
 */
export async function resolveOrderPickupBrand(items) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("Cannot resolve pickup brand for empty or invalid cart items.");
  }

  let hasCollaboration = false;
  let collaborationCreatorBrand = null;
  let hasUthy = false;
  let hasAlomziee = false;

  for (const item of items) {
    if (!item) continue;

    const collabId = item.collaborationProductId || (item.isCollaboration ? item.id : null);

    if (collabId) {
      hasCollaboration = true;

      // Query database for collaboration product and underlying collaboration
      const collabProd = await prisma.collaborationProduct.findUnique({
        where: { id: collabId },
        include: { collaboration: true },
      });

      if (!collabProd || !collabProd.collaboration) {
        throw new Error(`Collaboration product with ID "${collabId}" not found in database.`);
      }

      const collab = collabProd.collaboration;

      // Resolve creator identity strictly from Collaboration.creatorBrand
      const rawCreator = collab.creatorBrand;
      if (!rawCreator) {
        throw new Error(`Collaboration "${collab.name}" (ID: ${collab.id}) does not have an explicit creatorBrand registered.`);
      }

      const normalized = String(rawCreator).trim().toUpperCase();
      let currentCreator = null;
      if (normalized === "ALOMZIEE" || normalized === "ALOMZIEE_FOOTIES") {
        currentCreator = "ALOMZIEE";
      } else if (normalized === "UTHY" || normalized === "UTHY_LUXURY") {
        currentCreator = "UTHY";
      } else {
        throw new Error(`Invalid collaboration creator brand "${rawCreator}" for collaboration "${collab.id}".`);
      }

      // Check for conflicting collaboration creators in a single pickup cart
      if (collaborationCreatorBrand && collaborationCreatorBrand !== currentCreator) {
        throw new Error(
          `Conflicting collaboration creators in pickup cart (${collaborationCreatorBrand} and ${currentCreator}). Simultaneous pickup for products created by different brands is not supported in a single order.`
        );
      }

      collaborationCreatorBrand = currentCreator;
    } else {
      const prodId = item.productId || item.id;
      let brandStr = item.brand || item.productBrand || null;

      if (prodId) {
        const prod = await prisma.product.findUnique({
          where: { id: prodId },
          select: { brand: true },
        });

        if (!prod) {
          throw new Error(`Product with ID "${prodId}" not found in database.`);
        }

        if (prod.brand) {
          brandStr = prod.brand;
        }
      }

      if (!brandStr) {
        throw new Error(`Product item is missing brand identification.`);
      }

      const b = String(brandStr).toUpperCase();
      if (b.includes("UTHY")) hasUthy = true;
      if (b.includes("ALOMZIEE")) hasAlomziee = true;
    }
  }

  // Precedence Rule 1: Collaboration order -> creator's pickup address
  if (hasCollaboration) {
    if (!collaborationCreatorBrand) {
      throw new Error("Unable to resolve collaboration creator for pickup.");
    }
    return collaborationCreatorBrand;
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
  if (hasUthy && !hasAlomziee) {
    return "UTHY";
  }

  throw new Error("Unable to determine brand for pickup order.");
}

/**
 * Calculates available pickup dates based on admin-configured operating parameters:
 * - immediateEnabled: boolean
 * - leadDays: number of days out normal pickup starts (default 2, start ~2-3 days after order)
 * - allowedDaysOfWeek: string array of permitted days e.g. ["MON", "TUE", "WED", "THU", "FRI", "SAT"]
 * - dateCount: max number of available dates to return (default 5)
 *
 * @param {Object} config
 * @param {boolean} [config.immediateEnabled=false]
 * @param {number} [config.leadDays=2]
 * @param {string[]} [config.allowedDaysOfWeek]
 * @param {number} [config.dateCount=5]
 * @param {Date} [baseDate=new Date()]
 * @returns {Array<Object>} Available pickup date choices
 */
export function calculatePickupDates({
  immediateEnabled = false,
  leadDays = 2,
  allowedDaysOfWeek = ["MON", "TUE", "WED", "THU", "FRI", "SAT"],
  dateCount = 5,
} = {}, baseDate = new Date()) {
  const dates = [];

  if (immediateEnabled) {
    dates.push({
      value: "IMMEDIATE",
      label: "Immediate Pickup (Ready Today)",
      isImmediate: true,
    });
  }

  const startLead = Math.max(1, Number(leadDays) || 2);
  const targetCount = Math.min(10, Math.max(1, Number(dateCount) || 5));

  const dayMap = {
    0: "SUN",
    1: "MON",
    2: "TUE",
    3: "WED",
    4: "THU",
    5: "FRI",
    6: "SAT",
  };

  const normalizedAllowedDays = Array.isArray(allowedDaysOfWeek) && allowedDaysOfWeek.length > 0
    ? allowedDaysOfWeek.map((d) => String(d).trim().toUpperCase())
    : ["MON", "TUE", "WED", "THU", "FRI", "SAT"];

  let currentOffset = startLead;
  let safetyLimit = 30; // Search max 30 calendar days out

  while (dates.filter((d) => !d.isImmediate).length < targetCount && safetyLimit > 0) {
    safetyLimit--;
    const d = new Date(baseDate);
    d.setDate(d.getDate() + currentOffset);
    currentOffset++;

    const dayCode = dayMap[d.getDay()];

    if (normalizedAllowedDays.includes(dayCode)) {
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
    `${prefix}PickupLocationName`,
    `${prefix}PickupAddress`,
    `${prefix}PickupContactName`,
    `${prefix}PickupContactPhone`,
    `${prefix}ImmediatePickupEnabled`,
    `${prefix}PickupInstructions`,
    `${prefix}PickupMinDays`,
    `${prefix}PickupMaxDays`,
    `${prefix}PickupLeadDays`,
    `${prefix}PickupAllowedDays`,
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

  const locationName = map[`${prefix}PickupLocationName`]?.trim() || (isUthy ? "UTHY LUXURY Flagship Atelier" : "ALOMZIEE FOOTIES Boutique");
  const rawAddress = map[`${prefix}PickupAddress`]?.trim() || "";
  const contactName = map[`${prefix}PickupContactName`]?.trim() || "Atelier Concierge";
  const contactPhone = map[`${prefix}PickupContactPhone`]?.trim() || "+2348000000000";
  const immediateEnabled = map[`${prefix}ImmediatePickupEnabled`] === "true";
  const instructions = map[`${prefix}PickupInstructions`]?.trim() || "";
  const minDays = Number(map[`${prefix}PickupMinDays`] || 1);
  const maxDays = Number(map[`${prefix}PickupMaxDays`] || 3);
  const leadDays = Number(map[`${prefix}PickupLeadDays`] || 2);
  const rawAllowedDays = map[`${prefix}PickupAllowedDays`]?.trim() || "";

  const formattedTimeframe = `Pickup available ${minDays}–${maxDays} days after order`;

  let allowedDaysOfWeek = ["MON", "TUE", "WED", "THU", "FRI", "SAT"];
  if (rawAllowedDays) {
    try {
      const parsed = JSON.parse(rawAllowedDays);
      if (Array.isArray(parsed) && parsed.length > 0) {
        allowedDaysOfWeek = parsed;
      }
    } catch {
      // Keep default if JSON parse fails
    }
  }

  if (!rawAddress) {
    return {
      pickupBrand,
      pickupBrandDisplayName: isUthy ? "UTHY LUXURY" : "ALOMZIEE FOOTIES",
      configured: false,
      available: false,
      error: `Pickup address for ${isUthy ? "UTHY LUXURY" : "ALOMZIEE FOOTIES"} has not been configured by the brand administrator.`,
    };
  }

  const availableDates = calculatePickupDates({
    immediateEnabled,
    leadDays,
    allowedDaysOfWeek,
  });

  return {
    pickupBrand,
    pickupBrandDisplayName: isUthy ? "UTHY LUXURY" : "ALOMZIEE FOOTIES",
    configured: true,
    available: true,
    pickupLocationName: locationName,
    pickupAddress: rawAddress,
    pickupContactName: contactName,
    pickupContactPhone: contactPhone,
    pickupTimeframe: formattedTimeframe,
    immediatePickupEnabled: immediateEnabled,
    pickupInstructions: instructions,
    minDays,
    maxDays,
    leadDays,
    allowedDaysOfWeek,
    availableDates,
  };
}
