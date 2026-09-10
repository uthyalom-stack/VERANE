import prisma from "@/lib/prisma";

const SHIPBUBBLE_API_BASE = process.env.SHIPBUBBLE_API_BASE || "https://api.shipbubble.com/v1";

function getApiKey() {
  return process.env.SHIPBUBBLE_API_KEY || "";
}

function isMockMode() {
  if (process.env.SHIPBUBBLE_MOCK_MODE === "true") return true;
  if (process.env.NODE_ENV === "test") return true;
  if (!getApiKey()) return true;
  return false;
}

/**
 * Loads configured Shipbubble origin address code from database SiteSetting.
 * Throws clear error if not configured.
 */
export async function getShipbubbleOriginAddressCode() {
  if (isMockMode()) {
    return "addr_origin_verane_01";
  }

  const setting = await prisma.siteSetting.findUnique({
    where: { key: "shipbubbleSenderAddressCode" },
  });

  const code = setting?.value?.trim();
  if (!code) {
    throw new Error("Shipbubble origin address code (shipbubbleSenderAddressCode) is not configured in site settings.");
  }

  return code;
}

/**
 * Fetch courier shipping rates from Shipbubble API using official v1 contract.
 *
 * Official Payload Contract:
 * - sender_address_code
 * - receiver_address
 * - pickup_date
 * - category_id
 * - package_items
 * - package_dimension
 *
 * @param {Object} params
 * @param {string} params.senderAddressCode
 * @param {Object} params.receiverAddress
 * @param {Array} params.packageItems
 * @param {Object} params.packageDimension
 * @returns {Promise<Object>} Normalized rates response preserving rate_card_amount
 */
export async function fetchShipbubbleRates({ senderAddressCode, receiverAddress, packageItems, packageDimension }) {
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

  if (!senderAddressCode) {
    throw new Error("Shipbubble sender_address_code is required for rate calculation.");
  }

  const payload = {
    sender_address_code: senderAddressCode,
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
