import prisma from "@/lib/prisma";

const SHIPBUBBLE_API_BASE = process.env.SHIPBUBBLE_API_BASE || "https://api.shipbubble.com/v1";

function getApiKey() {
  return process.env.SHIPBUBBLE_API_KEY || "";
}

function isMockMode() {
  if (process.env.SHIPBUBBLE_MOCK_MODE === "true") return true;
  if (process.env.NODE_ENV === "test") return true;
  return false;
}

/**
 * Loads configured VÉRANE physical delivery origin address from database SiteSetting.
 * Constructs clean physical origin address object dynamically at runtime.
 * Throws clear error if physical origin is unconfigured in production.
 */
export async function getShipbubbleOriginAddress() {
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

  const keys = [
    "shipbubbleOriginName",
    "shipbubbleOriginEmail",
    "shipbubbleOriginPhone",
    "shipbubbleOriginCountry",
    "shipbubbleOriginState",
    "shipbubbleOriginCity",
    "shipbubbleOriginStreet",
  ];

  const rows = await prisma.siteSetting.findMany({
    where: { key: { in: keys } },
  });

  const map = {};
  rows.forEach((r) => {
    map[r.key] = r.value?.trim();
  });

  const name = map.shipbubbleOriginName || "";
  const email = map.shipbubbleOriginEmail || "";
  const phone = map.shipbubbleOriginPhone || "";
  const country = map.shipbubbleOriginCountry || "Nigeria";
  const state = map.shipbubbleOriginState || "";
  const city = map.shipbubbleOriginCity || "";
  const street = map.shipbubbleOriginStreet || "";

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
 * Fetch courier shipping rates from Shipbubble API using official v1 contract.
 * Dynamic sender physical origin address is supplied or fetched automatically from SiteSetting.
 *
 * Official Payload Contract:
 * - pickup_address (Physical Origin Object: name, email, phone, address, city, state, country)
 * - receiver_address (Customer Destination Object)
 * - pickup_date
 * - category_id
 * - package_items
 * - package_dimension
 *
 * @param {Object} params
 * @param {Object} [params.senderAddress] - Physical origin object
 * @param {Object} params.receiverAddress - Customer destination address object
 * @param {Array} params.packageItems - Item details array
 * @param {Object} params.packageDimension - Package dimensions object
 * @returns {Promise<Object>} Normalized rates response preserving rate_card_amount
 */
export async function fetchShipbubbleRates({ senderAddress, receiverAddress, packageItems, packageDimension }) {
  if (isMockMode()) {
    const mockRequestToken = `sb_req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    return {
      success: true,
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

  const origin = senderAddress || (await getShipbubbleOriginAddress());

  if (!origin || typeof origin !== "object") {
    throw new Error("Shipbubble physical delivery origin address object is required.");
  }

  const payload = {
    pickup_address: origin,
    receiver_address: receiverAddress,
    pickup_date: new Date().toISOString().slice(0, 10),
    category_id: "cat_apparel_01",
    package_items: packageItems || [],
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
    throw new Error(data.message || "Failed to fetch shipping rates from Shipbubble.");
  }

  const requestToken = data.data?.request_token || data.request_token;
  const rates = data.data?.couriers || data.data?.rates || data.couriers || [];

  const normalizedCouriers = rates.map((item) => {
    const rateCardAmount = Number(item.rate_card_amount ?? item.total_charge ?? item.charge ?? item.rate ?? 0);
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
  });

  return {
    success: true,
    request_token: requestToken,
    couriers: normalizedCouriers,
  };
}

/**
 * Generate waybill and label for a confirmed shipment using official Shipbubble Labels API.
 *
 * Official Payload Contract:
 * - request_token
 * - courier_id
 * - service_code
 *
 * @param {Object} params
 * @param {string} params.requestToken
 * @param {string} params.serviceCode
 * @param {string} params.courierId
 * @returns {Promise<Object>}
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
