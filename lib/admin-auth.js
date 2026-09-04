import { cookies } from "next/headers";
import crypto from "crypto";

const BRAND_ROLES = {
  UTHY: "UTHY_LUXURY",
  ALOMZIEE: "ALOMZIEE_FOOTIES",
};

const SEVEN_DAYS_IN_SECONDS = 7 * 24 * 60 * 60;

/**
 * Retrieves the admin authentication secret from environment variables.
 * @returns {string|null} The admin auth secret, or null if not configured.
 */
function getAuthSecret() {
  const secret = process.env.ADMIN_AUTH_SECRET;
  if (!secret) {
    return null;
  }
  return secret;
}

/**
 * Creates a signed HMAC-SHA256 admin authentication token with 7-day expiration.
 * @param {Object} payload - The admin payload containing role, brand, and name.
 * @returns {string|null} The signed token string, or null if secret is missing.
 */
export function createSignedAdminToken(payload) {
  const secret = getAuthSecret();
  if (!secret) {
    return null;
  }

  const exp = Math.floor(Date.now() / 1000) + SEVEN_DAYS_IN_SECONDS;
  const tokenPayload = {
    ...payload,
    exp,
  };

  const payloadStr = JSON.stringify(tokenPayload);
  const payloadBase64 = Buffer.from(payloadStr, "utf-8").toString("base64url");

  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(payloadBase64);
  const signature = hmac.digest("base64url");

  return `${payloadBase64}.${signature}`;
}

/**
 * Verifies and decodes an admin authentication token, checking signature and expiration.
 * @param {string} token - The signed admin token to verify.
 * @returns {Object|null} Decoded admin session with role, brand, name, and isSuperAdmin flag, or null if invalid.
 */
export function verifyAndDecodeAdminToken(token) {
  if (!token || typeof token !== "string") {
    return null;
  }

  const parts = token.split(".");
  if (parts.length !== 2) {
    return null;
  }

  const [payloadBase64, providedSignature] = parts;

  const secret = getAuthSecret();
  if (!secret) {
    return null;
  }

  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(payloadBase64);
  const expectedSignature = hmac.digest("base64url");

  const providedSigBuffer = Buffer.from(providedSignature, "utf-8");
  const expectedSigBuffer = Buffer.from(expectedSignature, "utf-8");

  if (providedSigBuffer.length !== expectedSigBuffer.length) {
    return null;
  }

  if (!crypto.timingSafeEqual(providedSigBuffer, expectedSigBuffer)) {
    return null;
  }

  try {
    const payloadStr = Buffer.from(payloadBase64, "base64url").toString("utf-8");
    const admin = JSON.parse(payloadStr);

    if (
      typeof admin?.exp !== "number" ||
      !Number.isFinite(admin.exp) ||
      admin.exp * 1000 <= Date.now()
    ) {
      return null;
    }

    if (!admin?.role || !admin?.brand || !admin?.name) {
      return null;
    }

    if (
      admin.role !== "UTHY" &&
      admin.role !== "ALOMZIEE" &&
      admin.role !== "SUPERADMIN"
    ) {
      return null;
    }

    if (admin.role === "UTHY" && admin.brand !== BRAND_ROLES.UTHY) {
      return null;
    }

    if (admin.role === "ALOMZIEE" && admin.brand !== BRAND_ROLES.ALOMZIEE) {
      return null;
    }

    if (admin.role === "SUPERADMIN" && admin.brand !== "ALL") {
      return null;
    }

    return {
      role: admin.role,
      brand: admin.brand,
      name: admin.name,
      isSuperAdmin: admin.role === "SUPERADMIN",
    };
  } catch {
    return null;
  }
}

/**
 * Retrieves the current admin session from cookies and validates it.
 * @returns {Promise<Object|null>} The decoded admin session object, or null if not authenticated.
 */
export async function getAdminSession() {
  const cookieStore = await cookies();
  const authCookie = cookieStore.get("adminAuth")?.value;

  if (!authCookie) {
    return null;
  }

  return verifyAndDecodeAdminToken(authCookie);
}

/**
 * Requires an authenticated admin session for API route protection.
 * @returns {Promise<Object>} Object with ok flag and admin session data.
 */
export async function requireAdmin() {
  const admin = await getAdminSession();

  if (!admin) {
    return {
      ok: false,
      admin: null,
    };
  }

  return {
    ok: true,
    admin,
  };
}

/**
 * Requires an authenticated brand-specific admin session for API route protection.
 * @param {string} brand - The required brand identifier to check against.
 * @returns {Promise<Object>} Object with ok flag and admin session data.
 */
export async function requireBrandAdmin(brand) {
  const admin = await getAdminSession();

  if (!admin) {
    return {
      ok: false,
      admin: null,
    };
  }

  if (admin.role === "SUPERADMIN") {
    return {
      ok: false,
      admin,
    };
  }

  if (admin.brand !== brand) {
    return {
      ok: false,
      admin,
    };
  }

  return {
    ok: true,
    admin,
  };
}
