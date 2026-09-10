/**
 * Shipbubble API Integration Service
 *
 * Provides server-side functions for Shipbubble rate calculation and waybill label generation.
 * Secrets (SHIPBUBBLE_API_KEY) are strictly retained on the server.
 */

const SHIPBUBBLE_API_BASE = process.env.SHIPBUBBLE_API_BASE || "https://api.shipbubble.com/v1";

function getApiKey() {
  return process.env.SHIPBUBBLE_API_KEY || process.env.SHIPBUBBLE_SECRET_KEY || "";
}

function isMockMode() {
  if (process.env.SHIPBUBBLE_MOCK_MODE === "true") return true;
  if (process.env.NODE_ENV === "test") return true;
  if (!getApiKey()) return true;
  return false;
}

/**
 * Fetch courier shipping rates from Shipbubble API.
 *
 * @param {Object} params - Rate query parameters.
 * @param {Object} params.senderAddress - Pickup address info (or brand warehouse).
 * @param {Object} params.receiverAddress - Customer delivery address info.
 * @param {Array} params.parcels - Parcel dimensions and items.
 * @returns {Promise<Object>} Response containing request_token and courier rate options.
 */
export async function fetchShipbubbleRates({ senderAddress, receiverAddress, parcels }) {
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
          total_charge: 3500,
          currency: "NGN",
          eta_days: "1 - 2 Days",
        },
        {
          courier_id: "cour_dhl_02",
          courier_name: "DHL Express",
          service_code: "dhl_priority",
          service_type: "Priority Overnight",
          total_charge: 5200,
          currency: "NGN",
          eta_days: "Same Day / Next Day",
        },
        {
          courier_id: "cour_redstar_03",
          courier_name: "Red Star Express",
          service_code: "redstar_standard",
          service_type: "Standard Economy",
          total_charge: 2800,
          currency: "NGN",
          eta_days: "2 - 3 Days",
        },
      ],
    };
  }

  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("Shipbubble API key is not configured.");
  }

  const payload = {
    sender_address: senderAddress,
    receiver_address: receiverAddress,
    parcels: parcels || [{ weight: 1, length: 10, width: 10, height: 10 }],
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

  // Normalize response structure from Shipbubble API contract
  const requestToken = data.data?.request_token || data.request_token;
  const rates = data.data?.couriers || data.data?.rates || data.couriers || [];

  const normalizedCouriers = rates.map((item) => ({
    courier_id: String(item.courier_id || item.courier_code || ""),
    courier_name: String(item.courier_name || item.name || "Courier"),
    service_code: String(item.service_code || item.code || "standard"),
    service_type: String(item.service_type || item.service_name || "Delivery"),
    total_charge: Number(item.total_charge || item.charge || item.rate || 0),
    currency: String(item.currency || "NGN"),
    eta_days: String(item.eta_days || item.estimated_days || "1-3 Days"),
  }));

  return {
    success: true,
    request_token: requestToken,
    couriers: normalizedCouriers,
  };
}

/**
 * Generate waybill and label for a confirmed shipment using Shipbubble Labels API.
 *
 * @param {Object} params - Waybill generation parameters.
 * @param {string} params.requestToken - Request token obtained during rate fetching.
 * @param {string} params.serviceCode - Selected service code.
 * @param {string} params.courierId - Selected courier ID.
 * @returns {Promise<Object>} Response containing waybill_number, label_url, and tracking_url.
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
    throw new Error("Shipbubble API key is not configured.");
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
    tracking_url: resData.tracking_url || `https://shipbubble.com/track/${resData.waybill_number || ""}`,
  };
}
