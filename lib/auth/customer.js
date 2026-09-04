import crypto from "crypto";

const COOKIE_NAME = "verane_customer";

function getSecret() {
  const secret = process.env.CUSTOMER_AUTH_SECRET;
  if (!secret) {
    throw new Error("CUSTOMER_AUTH_SECRET environment variable is missing.");
  }
  return secret;
}

export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");

  const hash = crypto
    .scryptSync(password, salt, 64)
    .toString("hex");

  return `${salt}:${hash}`;
}

export function verifyPassword(password, storedPassword) {
  try {
    const [salt, storedHash] =
      String(storedPassword || "").split(":");

    if (!salt || !storedHash) {
      return false;
    }

    const calculatedHash = crypto
      .scryptSync(password, salt, 64)
      .toString("hex");

    const storedBuffer = Buffer.from(
      storedHash,
      "hex"
    );

    const calculatedBuffer = Buffer.from(
      calculatedHash,
      "hex"
    );

    if (
      storedBuffer.length !==
      calculatedBuffer.length
    ) {
      return false;
    }

    return crypto.timingSafeEqual(
      storedBuffer,
      calculatedBuffer
    );
  } catch {
    return false;
  }
}

function createSignature(payload) {
  return crypto
    .createHmac("sha256", getSecret())
    .update(payload)
    .digest("hex");
}

const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 days

export function createCustomerSession(user) {
  const now = Date.now();
  const payload = Buffer.from(
    JSON.stringify({
      id: user.id,
      email: user.email,
      name: user.name || "",
      createdAt: now,
      exp: now + SESSION_TTL_MS,
    })
  ).toString("base64url");

  const signature = createSignature(payload);

  return `${payload}.${signature}`;
}

export function verifyCustomerSession(token) {
  try {
    if (!token) {
      return null;
    }

    const parts = token.split(".");

    if (parts.length !== 2) {
      return null;
    }

    const [payload, signature] = parts;

    const expectedSignature =
      createSignature(payload);

    const signatureBuffer = Buffer.from(
      signature,
      "hex"
    );

    const expectedBuffer = Buffer.from(
      expectedSignature,
      "hex"
    );

    if (
      signatureBuffer.length !==
      expectedBuffer.length
    ) {
      return null;
    }

    if (
      !crypto.timingSafeEqual(
        signatureBuffer,
        expectedBuffer
      )
    ) {
      return null;
    }

    const data = JSON.parse(
      Buffer.from(
        payload,
        "base64url"
      ).toString("utf8")
    );

    if (!data?.id || !data?.email) {
      return null;
    }

    // Strict server-side expiration check
    if (
      typeof data?.exp !== "number" ||
      !Number.isFinite(data.exp) ||
      data.exp <= Date.now()
    ) {
      return null;
    }

    return data;
  } catch {
    return null;
  }
}

export function customerCookieOptions() {
  return {
    name: COOKIE_NAME,
    httpOnly: true,
    secure:
      process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  };
}

export function getCustomerCookieName() {
  return COOKIE_NAME;
}