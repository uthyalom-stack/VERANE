import prisma from "./prisma.js";

/**
 * Durable production rate limiter for serverless environments with in-memory fallback.
 */

const memoryAttemptsMap = new Map();

// Periodic cleanup of expired in-memory entries every 5 minutes
if (typeof setInterval !== "undefined") {
  const cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, record] of memoryAttemptsMap.entries()) {
      if (now - record.firstAttempt > 15 * 60 * 1000) {
        memoryAttemptsMap.delete(key);
      }
    }
  }, 5 * 60 * 1000);

  if (cleanupTimer && typeof cleanupTimer.unref === "function") {
    cleanupTimer.unref();
  }
}

/**
 * Checks if a rate-limited action is allowed.
 * First queries the Prisma `RateLimit` table, falling back to the in-memory map on DB errors.
 *
 * @param {string} key - Unique rate-limiting key (e.g. `customer_login:user@example.com:127.0.0.1`).
 * @param {Object} options
 * @param {number} [options.maxAttempts=5]
 * @param {number} [options.windowMs=900000]
 * @returns {Promise<{ allowed: boolean, remaining: number, resetMs: number }>}
 */
export async function checkRateLimit(key, { maxAttempts = 5, windowMs = 15 * 60 * 1000 } = {}) {
  const now = Date.now();

  try {
    const record = await prisma.rateLimit.findUnique({
      where: { key },
    });

    if (!record || now - record.firstAttempt.getTime() > windowMs) {
      return { allowed: true, remaining: maxAttempts, resetMs: 0 };
    }

    if (record.attempts >= maxAttempts) {
      const resetMs = windowMs - (now - record.firstAttempt.getTime());
      return { allowed: false, remaining: 0, resetMs: Math.max(0, resetMs) };
    }

    return { allowed: true, remaining: maxAttempts - record.attempts, resetMs: 0 };
  } catch (err) {
    console.warn("[RATE LIMIT DB FALLBACK] Falling back to in-memory store due to query error:", err?.message || err);
    // In-memory fallback
    let record = memoryAttemptsMap.get(key);

    if (!record || now - record.firstAttempt > windowMs) {
      record = { count: 0, firstAttempt: now };
      memoryAttemptsMap.set(key, record);
    }

    if (record.count >= maxAttempts) {
      const resetMs = windowMs - (now - record.firstAttempt);
      return { allowed: false, remaining: 0, resetMs: Math.max(0, resetMs) };
    }

    return { allowed: true, remaining: maxAttempts - record.count, resetMs: 0 };
  }
}

/**
 * Increments failed attempt count for a rate limit key.
 *
 * @param {string} key
 * @param {Object} options
 * @param {number} [options.windowMs=900000]
 */
export async function recordFailedAttempt(key, { windowMs = 15 * 60 * 1000 } = {}) {
  const now = new Date();

  try {
    const existing = await prisma.rateLimit.findUnique({
      where: { key },
    });

    if (!existing || Date.now() - existing.firstAttempt.getTime() > windowMs) {
      await prisma.rateLimit.upsert({
        where: { key },
        update: {
          attempts: 1,
          firstAttempt: now,
        },
        create: {
          key,
          attempts: 1,
          firstAttempt: now,
        },
      });
    } else {
      await prisma.rateLimit.update({
        where: { key },
        data: {
          attempts: { increment: 1 },
        },
      });
    }
  } catch (err) {
    console.warn("[RATE LIMIT DB FALLBACK] Failed to record attempt in DB, updating memory:", err?.message || err);
    let record = memoryAttemptsMap.get(key);
    const nowMs = Date.now();
    if (!record || nowMs - record.firstAttempt > windowMs) {
      record = { count: 1, firstAttempt: nowMs };
    } else {
      record.count += 1;
    }
    memoryAttemptsMap.set(key, record);
  }
}

/**
 * Resets rate limit counter on successful authentication.
 *
 * @param {string} key
 */
export async function resetRateLimit(key) {
  try {
    await prisma.rateLimit.delete({
      where: { key },
    }).catch(() => {});
  } catch {
    // Ignore DB errors during reset
  }
  memoryAttemptsMap.delete(key);
}
