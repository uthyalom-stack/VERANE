/**
 * Server-only Shipbubble API client for VÉRANE.
 * Communicates with official Shipbubble v1 API.
 *
 * Requirements:
 * - Server-only execution (strictly forbidden in browser/client code)
 * - API key accessed via process.env.SHIPBUBBLE_API_KEY
 * - No raw key exposure or credentials in logs
 */

if (typeof window !== "undefined") {
  throw new Error("lib/shipbubble.js is a server-only module and must not be imported in browser environment.");
}

const DEFAULT_BASE_URL = "https://api.shipbubble.com/v1/shipping";
const TIMEOUT_MS = 15000;

function getBaseUrl() {
  return process.env.SHIPBUBBLE_API_BASE_URL || DEFAULT_BASE_URL;
}

function getApiKey() {
  const apiKey = process.env.SHIPBUBBLE_API_KEY;
  if (!apiKey) {
    console.warn("[Shipbubble] SHIPBUBBLE_API_KEY environment variable is not configured.");
  }
  return apiKey;
}

/**
 * Executes an HTTP request to the Shipbubble API.
 * @param {string} endpoint - Relative path (e.g., "/fetch_rates")
 * @param {Object} options - Fetch options (method, body, headers, timeout)
 */
async function requestShipbubble(endpoint, options = {}) {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("Shipbubble API key is missing from environment configuration.");
  }

  const baseUrl = getBaseUrl();
  const url = `${baseUrl.replace(/\/$/, "")}${endpoint.startsWith("/") ? endpoint : "/" + endpoint}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), options.timeout || TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: options.method || "GET",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
        ...options.headers,
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const json = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errorMsg = json.message || `Shipbubble API request failed with status ${response.status}`;
      throw new Error(errorMsg);
    }

    if (json.status === "failed") {
      throw new Error(json.message || "Shipbubble API returned status failed");
    }

    return json;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === "AbortError") {
      throw new Error("Shipbubble API request timed out.");
    }
    // Re-throw sanitized error without revealing secret keys
    throw new Error(error.message || "Shipbubble request failed");
  }
}

/**
 * Validates a global deliverable address and returns deliverability & address code.
 * Endpoint: POST /v1/shipping/address/validate
 *
 * @param {Object} params
 * @param {string} params.name
 * @param {string} params.email
 * @param {string} params.phone
 * @param {string} params.address
 * @returns {Promise<Object>} Address validation response
 */
export async function validateAddress({ name, email, phone, address }) {
  if (!name || !email || !phone || !address) {
    throw new Error("name, email, phone, and address are required for address validation.");
  }

  const payload = { name, email, phone, address };

  const result = await requestShipbubble("/address/validate", {
    method: "POST",
    body: payload,
  });

  return {
    success: true,
    data: result.data,
  };
}

/**
 * Helper to resolve an address_code for Shipbubble API payloads.
 * @param {Object|string|number} addressObj
 * @returns {Promise<string|number|null>}
 */
export async function resolveAddressCode(addressObj) {
  if (!addressObj) return null;
  if (typeof addressObj === "number" || typeof addressObj === "string") {
    return addressObj;
  }
  if (addressObj.address_code || addressObj.addressCode) {
    return addressObj.address_code || addressObj.addressCode;
  }

  try {
    const res = await validateAddress({
      name: addressObj.name || "VÉRANE Atelier",
      email: addressObj.email || "checkout@verane.com",
      phone: addressObj.phone || "+2348000000000",
      address: addressObj.address || addressObj.streetAddress || "Victoria Island, Lagos, Nigeria",
    });
    return res.data?.address_code || res.data?.addressCode || res.data?.id || null;
  } catch (err) {
    console.warn("[Shipbubble] Address code resolution fallback:", err.message);
    return null;
  }
}

/**
 * Requests shipping rates for a shipment.
 * Endpoint: POST /v1/shipping/fetch_rates
 *
 * Supports both direct object addresses ({ shipFrom, shipTo })
 * and Shipbubble address code payloads ({ senderAddressCode, recieverAddressCode }).
 * Automatically resolves address codes via validateAddress when required.
 *
 * @param {Object} params
 * @param {Object} [params.shipFrom] - Sender details { name, phone, email, address }
 * @param {Object} [params.shipTo] - Recipient details { name, phone, email, address }
 * @param {number|string} [params.senderAddressCode] - Shipbubble sender address code
 * @param {number|string} [params.recieverAddressCode] - Shipbubble receiver address code
 * @param {Array} [params.packageItems] - Array of items [{ name, description, weight, amount, quantity }]
 * @param {Object} [params.packageDimension] - Package dimension in CM { length, width, height }
 * @param {string} [params.pickupDate] - Pickup date YYYY-MM-DD
 * @param {number|string} [params.categoryId] - Category ID
 * @returns {Promise<Object>} Shipbubble rate response containing request_token, couriers
 */
export async function fetchShippingRates(params) {
  const {
    shipFrom,
    shipTo,
    senderAddressCode,
    recieverAddressCode,
    packageItems,
    packageDimension,
    pickupDate,
    categoryId,
  } = params || {};

  const senderCode = senderAddressCode || (await resolveAddressCode(shipFrom));
  const recieverCode = recieverAddressCode || (await resolveAddressCode(shipTo));

  const payload = {
    ...(senderCode ? { sender_address_code: senderCode } : {}),
    ...(recieverCode ? { reciever_address_code: recieverCode } : {}),
    ...(shipFrom ? { ship_from: shipFrom } : {}),
    ...(shipTo ? { ship_to: shipTo } : {}),
    package_items: packageItems || [],
    package_dimension: packageDimension || { length: 20, width: 20, height: 10 },
  };

  if (pickupDate) payload.pickup_date = pickupDate;
  if (categoryId) payload.category_id = categoryId;

  const result = await requestShipbubble("/fetch_rates", {
    method: "POST",
    body: payload,
  });

  return {
    success: true,
    data: result.data,
  };
}

/**
 * Creates a shipping label / shipment with a selected courier rate.
 * Endpoint: POST /v1/shipping/labels
 *
 * @param {Object} params
 * @param {string} params.requestToken - request_token from Rates API
 * @param {string} params.serviceCode - service_code of selected courier
 * @param {string|number} params.courierId - courier_id of selected courier
 * @returns {Promise<Object>} Shipment creation result with order_id, status, courier info, waybill_document
 */
export async function createShipment({ requestToken, serviceCode, courierId }) {
  if (!requestToken || !serviceCode || courierId === undefined || courierId === null) {
    throw new Error("requestToken, serviceCode, and courierId are required to create a shipment.");
  }

  const payload = {
    request_token: requestToken,
    service_code: serviceCode,
    courier_id: courierId,
  };

  const result = await requestShipbubble("/labels", {
    method: "POST",
    body: payload,
  });

  return {
    success: true,
    data: result.data,
  };
}

/**
 * Retrieves list of shipments / labels created.
 * Endpoint: GET /v1/shipping/labels
 *
 * @param {Object} [params]
 * @param {number} [params.page]
 * @param {number} [params.limit]
 * @returns {Promise<Object>} List of created shipments with tracking info, status, waybill_document
 */
export async function getShipments({ page, limit } = {}) {
  const queryParams = new URLSearchParams();
  if (page) queryParams.append("page", String(page));
  if (limit) queryParams.append("limit", String(limit));

  const endpoint = `/labels${queryParams.toString() ? "?" + queryParams.toString() : ""}`;
  const result = await requestShipbubble(endpoint, {
    method: "GET",
  });

  return {
    success: true,
    data: result.data,
  };
}

/**
 * Cancels a scheduled shipment before it has been processed.
 * Endpoint: POST /v1/shipping/labels/cancel/:order_id
 *
 * @param {string} shipbubbleOrderId - Shipbubble shipment order_id (e.g. "SB-2CF48224272")
 * @returns {Promise<Object>} Cancellation result status
 */
export async function cancelShipment(shipbubbleOrderId) {
  if (!shipbubbleOrderId) {
    throw new Error("shipbubbleOrderId is required to cancel a shipment.");
  }

  const endpoint = `/labels/cancel/${encodeURIComponent(shipbubbleOrderId)}`;
  const result = await requestShipbubble(endpoint, {
    method: "POST",
  });

  return {
    success: true,
    message: result.message || "Shipment successfully cancelled",
  };
}
