import prisma from "@/lib/prisma";

const SHIPBUBBLE_API_BASE = process.env.SHIPBUBBLE_API_BASE || "https://api.shipbubble.com/v1";

function getApiKey() {
  return process.env.SHIPBUBBLE_API_KEY ? process.env.SHIPBUBBLE_API_KEY.trim() : "";
}

function isMockMode() {
  if (process.env.SHIPBUBBLE_MOCK_MODE === "true") return true;
  if (process.env.NODE_ENV === "test") return true;
  return false;
}

/**
 * Diagnostic logger for Shipbubble API responses.
 * Logs endpoint, HTTP status, API status, and error details without leaking API keys.
 */
function logShipbubbleDiagnostic(endpoint, httpStatus, responseData, contextMessage = "") {
  console.error(`[SHIPBUBBLE DIAGNOSTIC FAILURE] ${contextMessage}`, {
    endpoint,
    httpStatus,
    status: responseData?.status,
    message: responseData?.message || responseData?.error || "Unknown API response",
    errors: responseData?.errors || responseData?.data?.errors || null,
  });
}

/**
 * Fetches available package categories from official Shipbubble Package Categories API.
 * Official Endpoint: GET https://api.shipbubble.com/v1/shipping/labels/categories
 *
 * @returns {Promise<Array<{category_id: number, category: string, name: string}>>}
 */
export async function getShipbubbleCategories() {
  if (isMockMode()) {
    return [
      { category_id: 98246239, category: "Fashion wears", name: "Fashion wears" },
    ];
  }

  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("Shipbubble API key (SHIPBUBBLE_API_KEY) is not configured.");
  }

  const response = await fetch(`${SHIPBUBBLE_API_BASE}/shipping/labels/categories`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
  });

  const data = await response.json();

  if (!response.ok || data.status === "error" || data.status === false) {
    logShipbubbleDiagnostic("shipping/labels/categories", response.status, data, "Category resolution failed");
    throw new Error(data.message || "Failed to fetch categories from Shipbubble.");
  }

  const categories = data.data || data.categories || [];
  return categories.map((cat) => {
    const numId = Number(cat.category_id || cat.id);
    const catName = String(cat.category || cat.name || "Fashion wears");
    return {
      category_id: numId,
      category: catName,
      name: catName,
    };
  });
}

/**
 * Resolves configured Shipbubble Category ID.
 * Hierarchy: process.env.SHIPBUBBLE_CATEGORY_ID -> SiteSetting "shipbubbleCategoryId"
 * Defaults to official Shipbubble "Fashion wears" category ID (98246239).
 *
 * @returns {Promise<number>} Resolved numeric category_id
 */
export async function getShipbubbleCategoryId(brand) {
  let rawVal = process.env.SHIPBUBBLE_CATEGORY_ID ? process.env.SHIPBUBBLE_CATEGORY_ID.trim() : null;

  const prefix = brand ? (String(brand).toLowerCase().includes("alomziee") ? "alomziee" : "uthy") : null;

  if (!rawVal) {
    try {
      const searchKeys = prefix
        ? [`${prefix}ShipbubbleCategoryId`, "shipbubbleCategoryId", "uthyShipbubbleCategoryId", "alomzieeShipbubbleCategoryId"]
        : ["shipbubbleCategoryId", "uthyShipbubbleCategoryId", "alomzieeShipbubbleCategoryId"];
      const settings = await prisma.siteSetting.findMany({
        where: { key: { in: searchKeys } },
      });
      const map = {};
      settings.forEach((s) => { map[s.key] = s.value?.trim(); });
      rawVal = (prefix && map[`${prefix}ShipbubbleCategoryId`]) || map.shipbubbleCategoryId || map.uthyShipbubbleCategoryId || map.alomzieeShipbubbleCategoryId || null;
    } catch {
      // Database lookup error
    }
  }

  if (!rawVal) {
    return 98246239;
  }

  const numId = Number(rawVal);
  if (isNaN(numId) || !Number.isFinite(numId) || numId <= 0) {
    throw new Error(`Invalid Shipbubble Category ID "${rawVal}". Category ID must be a positive numeric value.`);
  }

  if (!isMockMode()) {
    const validCategories = await getShipbubbleCategories();
    const exists = validCategories.some((cat) => Number(cat.category_id) === numId);
    if (!exists) {
      throw new Error(
        `Configured Shipbubble Category ID (${numId}) was not found in the official Shipbubble categories list.`
      );
    }
  }

  return numId;
}

/**
 * Loads configured VÉRANE physical delivery origin address from database SiteSetting.
 * Constructs clean physical origin address object dynamically at runtime.
 */
export async function getShipbubbleOriginAddress(brand) {
  if (isMockMode()) {
    return {
      name: "Mock Fulfillment Center",
      email: "mock_fulfillment@example.com",
      phone: "+2348000000000",
      country: "Nigeria",
      state: "Lagos",
      city: "Ikeja",
      address: "123 Mock Test Street, Ikeja",
    };
  }

  const prefix = brand ? (String(brand).toLowerCase().includes("alomziee") ? "alomziee" : "uthy") : null;

  const brandKeys = prefix ? [
    `${prefix}ShipbubbleOriginName`,
    `${prefix}ShipbubbleOriginEmail`,
    `${prefix}ShipbubbleOriginPhone`,
    `${prefix}ShipbubbleOriginCountry`,
    `${prefix}ShipbubbleOriginState`,
    `${prefix}ShipbubbleOriginCity`,
    `${prefix}ShipbubbleOriginStreet`,
  ] : [];

  const genericKeys = [
    "shipbubbleOriginName",
    "shipbubbleOriginEmail",
    "shipbubbleOriginPhone",
    "shipbubbleOriginCountry",
    "shipbubbleOriginState",
    "shipbubbleOriginCity",
    "shipbubbleOriginStreet",
    "uthyShipbubbleOriginName",
    "uthyShipbubbleOriginEmail",
    "uthyShipbubbleOriginPhone",
    "uthyShipbubbleOriginCountry",
    "uthyShipbubbleOriginState",
    "uthyShipbubbleOriginCity",
    "uthyShipbubbleOriginStreet",
    "alomzieeShipbubbleOriginName",
    "alomzieeShipbubbleOriginEmail",
    "alomzieeShipbubbleOriginPhone",
    "alomzieeShipbubbleOriginCountry",
    "alomzieeShipbubbleOriginState",
    "alomzieeShipbubbleOriginCity",
    "alomzieeShipbubbleOriginStreet",
  ];

  const keys = Array.from(new Set([...brandKeys, ...genericKeys]));

  const rows = await prisma.siteSetting.findMany({
    where: { key: { in: keys } },
  });

  const map = {};
  rows.forEach((r) => {
    map[r.key] = r.value?.trim();
  });

  const name = (prefix && map[`${prefix}ShipbubbleOriginName`]) || map.shipbubbleOriginName || map.uthyShipbubbleOriginName || map.alomzieeShipbubbleOriginName || "";
  const email = (prefix && map[`${prefix}ShipbubbleOriginEmail`]) || map.shipbubbleOriginEmail || map.uthyShipbubbleOriginEmail || map.alomzieeShipbubbleOriginEmail || "";
  const phone = (prefix && map[`${prefix}ShipbubbleOriginPhone`]) || map.shipbubbleOriginPhone || map.uthyShipbubbleOriginPhone || map.alomzieeShipbubbleOriginPhone || "";
  const country = (prefix && map[`${prefix}ShipbubbleOriginCountry`]) || map.shipbubbleOriginCountry || map.uthyShipbubbleOriginCountry || map.alomzieeShipbubbleOriginCountry || "Nigeria";
  const state = (prefix && map[`${prefix}ShipbubbleOriginState`]) || map.shipbubbleOriginState || map.uthyShipbubbleOriginState || map.alomzieeShipbubbleOriginState || "";
  const city = (prefix && map[`${prefix}ShipbubbleOriginCity`]) || map.shipbubbleOriginCity || map.uthyShipbubbleOriginCity || map.alomzieeShipbubbleOriginCity || "";
  const street = (prefix && map[`${prefix}ShipbubbleOriginStreet`]) || map.shipbubbleOriginStreet || map.uthyShipbubbleOriginStreet || map.alomzieeShipbubbleOriginStreet || "";

  if (!name || !email || !phone || !state || !city || !street) {
    throw new Error(
      "Shipbubble delivery origin address is incomplete or not configured in site settings. Please configure physical delivery origin details in Admin Settings."
    );
  }

  return {
    name,
    email,
    phone,
    country,
    state,
    city,
    address: street,
  };
}

/**
 * Resolves a physical address object into a Shipbubble address_code dynamically using Validate Address API.
 * Passes the complete physical address string.
 *
 * Official Shipbubble API Endpoint:
 * POST https://api.shipbubble.com/v1/shipping/address/validate
 *
 * @param {Object} addressObj - Complete physical address object
 * @returns {Promise<string>} Shipbubble address_code string
 */
export async function resolveShipbubbleAddressCode(addressObj) {
  if (isMockMode()) {
    const slug = (addressObj?.name || addressObj?.city || "address").toLowerCase().replace(/[^a-z0-9]/g, "_");
    return `addr_${slug}_${Math.random().toString(36).substring(2, 8)}`;
  }

  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("Shipbubble API key (SHIPBUBBLE_API_KEY) is not configured.");
  }

  if (!addressObj || !addressObj.name || !addressObj.email || !addressObj.phone || !addressObj.address || !addressObj.city || !addressObj.state) {
    throw new Error("Complete physical address object (name, email, phone, address, city, state) is required for address code resolution.");
  }

  const payload = {
    name: addressObj.name,
    email: addressObj.email,
    phone: addressObj.phone,
    address: addressObj.address, // Pass complete normalized physical address
    city: addressObj.city,
    state: addressObj.state,
    country: addressObj.country || "Nigeria",
  };

  const response = await fetch(`${SHIPBUBBLE_API_BASE}/shipping/address/validate`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok || data.status === "error" || data.status === false) {
    logShipbubbleDiagnostic("shipping/address/validate", response.status, data, `Address validation failed for ${addressObj.name || "recipient"}`);
    const errMsg = data.message || (Array.isArray(data.errors) ? data.errors.join(", ") : "Failed to validate address with Shipbubble.");
    throw new Error(errMsg);
  }

  const resData = data.data || data;
  const addressCode = resData.address_code || resData.code || resData.id;

  if (!addressCode) {
    logShipbubbleDiagnostic("shipping/address/validate", response.status, data, "Missing address_code in response");
    throw new Error("Shipbubble Address Validation API did not return a valid address_code.");
  }

  return addressCode;
}

/**
 * Fetch courier shipping rates from Shipbubble API using official v1 contract.
 * Dynamically resolves physical origin address and customer destination address into address codes.
 *
 * Official Payload Contract:
 * - sender_address_code
 * - reciever_address_code (official Shipbubble spelling)
 * - pickup_date
 * - category_id
 * - package_items
 * - package_dimension
 *
 * @param {Object} params
 * @returns {Promise<Object>} Normalized rates response preserving rate_card_amount
 */
export async function fetchShipbubbleRates({ senderAddress, receiverAddress, packageItems, packageDimension }) {
  if (isMockMode()) {
    const mockSenderCode = `addr_sender_${Math.random().toString(36).substring(2, 7)}`;
    const mockRecieverCode = `addr_reciever_${Math.random().toString(36).substring(2, 7)}`;
    const mockRequestToken = `sb_req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    return {
      success: true,
      sender_address_code: mockSenderCode,
      reciever_address_code: mockRecieverCode,
      request_token: mockRequestToken,
      couriers: [
        {
          courier_id: "cour_gig_01",
          courier_name: "GIG Logistics",
          service_code: "gig_express",
          service_type: "Express Delivery",
          rate_card_amount: 3500,
          total: 3500,
          currency: "NGN",
          eta_days: "1 - 2 Days",
        },
        {
          courier_id: "cour_dhl_02",
          courier_name: "DHL Express",
          service_code: "dhl_priority",
          service_type: "Priority Overnight",
          rate_card_amount: 5200,
          total: 5200,
          currency: "NGN",
          eta_days: "Same Day / Next Day",
        },
        {
          courier_id: "cour_redstar_03",
          courier_name: "Red Star Express",
          service_code: "redstar_standard",
          service_type: "Standard Economy",
          rate_card_amount: 2800,
          total: 2800,
          currency: "NGN",
          eta_days: "2 - 3 Days",
        },
      ],
    };
  }

  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("Shipbubble API key (SHIPBUBBLE_API_KEY) is not configured.");
  }

  const originObj = senderAddress || (await getShipbubbleOriginAddress());

  // Dynamically resolve physical addresses to Shipbubble address codes at runtime
  let senderAddressCode;
  try {
    senderAddressCode = await resolveShipbubbleAddressCode(originObj);
  } catch (senderErr) {
    console.error("[SHIPBUBBLE ORIGIN ADDRESS VALIDATION ERROR]", senderErr.message);
    throw new Error("SENDER_ADDRESS_VALIDATION_FAILED: " + senderErr.message);
  }

  let recieverAddressCode;
  try {
    recieverAddressCode = await resolveShipbubbleAddressCode(receiverAddress);
  } catch (recieverErr) {
    console.error("[SHIPBUBBLE RECEIVER ADDRESS VALIDATION ERROR]", recieverErr.message);
    throw new Error("RECEIVER_ADDRESS_VALIDATION_FAILED: " + recieverErr.message);
  }

  let categoryId;
  try {
    categoryId = await getShipbubbleCategoryId(originObj?.brand || originObj?.pickupBrand);
  } catch (catErr) {
    console.error("[SHIPBUBBLE CATEGORY RESOLUTION ERROR]", catErr.message);
    throw new Error("CATEGORY_RESOLUTION_FAILED: " + catErr.message);
  }

  const formattedPackageItems = (packageItems || []).map((item) => {
    const qty = Math.max(1, Number(item.quantity || item.qty || 1));
    const unitWeight = Number(item.unit_weight ?? item.weight ?? 0.5);
    const unitAmount = Number(item.unit_amount ?? item.unit_price ?? item.price ?? 0);
    const nameStr = String(item.name || "Item").trim();
    const descStr = String(item.description || item.name || "Fashion item").trim();

    return {
      name: nameStr,
      description: descStr,
      unit_weight: unitWeight,
      unit_amount: unitAmount,
      quantity: qty,
    };
  });

  const payload = {
    sender_address_code: senderAddressCode,
    reciever_address_code: recieverAddressCode,
    pickup_date: new Date().toISOString().slice(0, 10),
    category_id: categoryId,
    package_items: formattedPackageItems,
    package_dimension: packageDimension || { length: 15, width: 15, height: 15 },
  };

  const response = await fetch(`${SHIPBUBBLE_API_BASE}/shipping/fetch_rates`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok || data.status === "error" || data.status === false) {
    logShipbubbleDiagnostic("shipping/fetch_rates", response.status, data, "Rate calculation request failed");
    throw new Error(data.message || "Failed to fetch shipping rates from Shipbubble.");
  }

  const requestToken = data.data?.request_token || data.request_token;
  const rates = data.data?.couriers || data.data?.rates || data.couriers || [];

  const normalizedCouriers = rates
    .map((item) => {
      const rawRateCard = item.rate_card_amount ?? item.total_charge ?? item.charge ?? item.rate;
      if (rawRateCard === null || rawRateCard === undefined || isNaN(Number(rawRateCard))) {
        return null; // Reject couriers with missing/invalid price
      }

      const rateCardAmount = Number(rawRateCard);
      const totalAmount = Number(item.total ?? rateCardAmount);

      return {
        courier_id: String(item.courier_id || item.courier_code || ""),
        courier_name: String(item.courier_name || item.name || "Courier"),
        service_code: String(item.service_code || item.code || "standard"),
        service_type: String(item.service_type || item.service_name || "Delivery"),
        rate_card_amount: rateCardAmount,
        total: totalAmount,
        currency: String(item.currency || "NGN"),
        eta_days: String(item.eta_days || item.estimated_days || "1-3 Days"),
      };
    })
    .filter((courier) => courier && courier.rate_card_amount > 0 && courier.courier_id && courier.service_code);

  return {
    success: true,
    sender_address_code: senderAddressCode,
    reciever_address_code: recieverAddressCode,
    request_token: requestToken,
    couriers: normalizedCouriers,
  };
}

/**
 * Generate waybill and label for a confirmed shipment using official Shipbubble Labels API.
 */
export async function generateShipbubbleLabel({ requestToken, serviceCode, courierId }) {
  if (isMockMode()) {
    const randomCode = Math.floor(10000000 + Math.random() * 90000000);
    return {
      success: true,
      waybill_number: `SB-WB-${randomCode}`,
      label_url: `https://shipbubble.com/labels/WB-${randomCode}.pdf`,
      tracking_url: `https://shipbubble.com/track/WB-${randomCode}`,
    };
  }

  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("Shipbubble API key (SHIPBUBBLE_API_KEY) is not configured.");
  }

  const payload = {
    request_token: requestToken,
    service_code: serviceCode,
    courier_id: courierId,
  };

  const response = await fetch(`${SHIPBUBBLE_API_BASE}/shipping/labels`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok || data.status === "error" || data.status === false) {
    logShipbubbleDiagnostic("shipping/labels", response.status, data, "Waybill generation failed");
    throw new Error(data.message || "Failed to generate waybill label with Shipbubble.");
  }

  const resData = data.data || data;

  return {
    success: true,
    waybill_number: resData.waybill_number || resData.tracking_code || resData.waybill_code,
    label_url: resData.label_url || resData.waybill_url,
    tracking_url: resData.tracking_url || (resData.waybill_number ? `https://shipbubble.com/track/${resData.waybill_number}` : null),
  };
}
