/**
 * Server-only Shipbubble API integration client for VÉRANE.
 * Communicates with the official Shipbubble v1 API.
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
 * Requests shipping rates for a shipment.
 * Endpoint: POST /v1/shipping/fetch_rates
 *
 * @param {Object} params
 * @param {Object} params.shipFrom - Sender details { name, phone, email, address, latitude?, longitude? }
 * @param {Object} params.shipTo - Recipient details { name, phone, email, address, latitude?, longitude? }
 * @param {Array} params.packageItems - Array of items [{ name, description, weight, amount, quantity }]
 * @param {Object} params.packageDimension - Package dimension in CM { length, width, height }
 * @returns {Promise<Object>} Shipbubble rate response containing request_token, couriers, fastest_courier, cheapest_courier
 */
export async function fetchShippingRates({ shipFrom, shipTo, packageItems, packageDimension }) {
  if (!shipFrom || !shipTo) {
    throw new Error("shipFrom and shipTo are required for fetching shipping rates.");
  }

  const payload = {
    ship_from: shipFrom,
    ship_to: shipTo,
    package_items: packageItems || [],
    package_dimension: packageDimension || { length: 10, width: 10, height: 10 },
  };

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
 * @param {string} [params.insuranceCode] - Optional insurance code
 * @param {boolean} [params.isCodLabel] - Cash on delivery flag
 * @returns {Promise<Object>} Shipment creation result with order_id, status, courier info, tracking_url
 */
export async function createShipment({ requestToken, serviceCode, courierId, insuranceCode, isCodLabel }) {
  if (!requestToken || !serviceCode || courierId === undefined || courierId === null) {
    throw new Error("requestToken, serviceCode, and courierId are required to create a shipment.");
  }

  const payload = {
    request_token: requestToken,
    service_code: serviceCode,
    courier_id: courierId,
    ...(insuranceCode ? { insurance_code: insuranceCode } : {}),
    ...(isCodLabel !== undefined ? { is_cod_label: isCodLabel } : {}),
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

/**
 * Validates a global deliverable address.
 * Endpoint: POST /v1/shipping/address/validate
 *
 * @param {Object} params
 * @param {string} params.name
 * @param {string} params.email
 * @param {string} params.phone
 * @param {string} params.address
 * @param {number} [params.latitude]
 * @param {number} [params.longitude]
 * @returns {Promise<Object>} Address validation response
 */
export async function validateAddress({ name, email, phone, address, latitude, longitude }) {
  if (!name || !email || !phone || !address) {
    throw new Error("name, email, phone, and address are required for address validation.");
  }

  const payload = {
    name,
    email,
    phone,
    address,
    ...(latitude !== undefined ? { latitude } : {}),
    ...(longitude !== undefined ? { longitude } : {}),
  };

  const result = await requestShipbubble("/address/validate", {
    method: "POST",
    body: payload,
  });

  return {
    success: true,
    data: result.data,
  };
}
