import { cookies } from "next/headers";
import crypto from "crypto";

const BRAND_ROLES = {
  UTHY: "UTHY_LUXURY",
  ALOMZIEE: "ALOMZIEE_FOOTIES",
};

const SEVEN_DAYS_IN_SECONDS = 7 * 24 * 60 * 60;

/**
 * Retrieves the configured administrator authentication secret.
 * @return {string|null} The authentication secret, or `null` when it is not configured.
 */
function getAuthSecret() {
  const secret = process.env.ADMIN_AUTH_SECRET;
  if (!secret) {
    return null;
  }
  return secret;
}

/**
 * Creates a signed administrator authentication token with a seven-day expiration.
 * @param {Object} payload - The administrator data to include in the token.
 * @returns {string|null} The signed token, or `null` when no authentication secret is configured.
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
 * Validates an administrator token and extracts its identity.
 * @param {string} token - The signed administrator token to validate.
 * @return {{role: string, brand: string, name: string, isSuperAdmin: boolean}|null} The normalized administrator identity, or `null` if the token is invalid, expired, or incomplete.
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
 * Retrieves and verifies the administrator session from the authentication cookie.
 * @returns {Object|null} The authenticated administrator data, or `null` if no valid session exists.
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
 * Require a valid administrator session.
 * @return {Promise<{ok: boolean, admin: object|null}>} An object containing the authenticated administrator and a success status.
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
 * Checks whether the current administrator is authorized for a specific brand.
 * @param {string} brand - The brand the administrator must be assigned to.
 * @returns {{ok: boolean, admin: object|null}} An object containing the administrator and whether access is authorized.
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
