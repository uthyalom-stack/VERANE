import prisma from "./prisma.js";

/**
 * Durable production rate limiter for serverless environments with atomic PostgreSQL execution and bounded in-memory fallback.
 */

const MAX_MEMORY_MAP_SIZE = 10000;
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
 * Opportunistically cleans up expired DB rate limit records.
 * Probabilistically triggers (e.g. 10% of requests) to prevent DB accumulation without background processes.
 */
async function opportunisticDbCleanup(windowMs) {
  if (Math.random() < 0.1) {
    try {
      const cutoff = new Date(Date.now() - windowMs * 2);
      await prisma.rateLimit.deleteMany({
        where: {
          firstAttempt: {
            lt: cutoff,
          },
        },
      });
    } catch {
      // Suppress background cleanup failures
    }
  }
}

/**
 * Checks if a rate-limited key (IP or account) is currently blocked/throttled without incrementing failure counters.
 *
 * @param {string} key - Unique rate-limiting key.
 * @param {Object} options
 * @param {number} [options.maxAttempts=5]
 * @param {number} [options.windowMs=900000]
 * @returns {Promise<{ allowed: boolean, remaining: number, resetMs: number }>}
 */
export async function checkRateLimit(key, { maxAttempts = 5, windowMs = 15 * 60 * 1000 } = {}) {
  const nowMs = Date.now();
  opportunisticDbCleanup(windowMs).catch(() => {});

  try {
    const record = await prisma.rateLimit.findUnique({
      where: { key },
    });

    if (!record || nowMs - record.firstAttempt.getTime() > windowMs) {
      return { allowed: true, remaining: maxAttempts, resetMs: 0 };
    }

    if (record.attempts >= maxAttempts) {
      const resetMs = windowMs - (nowMs - record.firstAttempt.getTime());
      return { allowed: false, remaining: 0, resetMs: Math.max(0, resetMs) };
    }

    return { allowed: true, remaining: maxAttempts - record.attempts, resetMs: 0 };
  } catch (err) {
    console.warn("[RATE LIMIT DB FALLBACK] Read query fallback to in-memory store");
    let record = memoryAttemptsMap.get(key);

    if (!record || nowMs - record.firstAttempt > windowMs) {
      return { allowed: true, remaining: maxAttempts, resetMs: 0 };
    }

    if (record.count >= maxAttempts) {
      const resetMs = windowMs - (nowMs - record.firstAttempt);
      return { allowed: false, remaining: 0, resetMs: Math.max(0, resetMs) };
    }

    return { allowed: true, remaining: maxAttempts - record.count, resetMs: 0 };
  }
}

/**
 * Atomically increments failed attempt count for a rate limit key ONLY on failed authentication.
 * Uses atomic PostgreSQL UPSERT or Prisma atomic update to prevent concurrent race conditions.
 *
 * @param {string} key
 * @param {Object} options
 * @param {number} [options.windowMs=900000]
 * @returns {Promise<{ attempts: number }>}
 */
export async function recordFailedAttempt(key, { windowMs = 15 * 60 * 1000 } = {}) {
  const now = new Date();
  const cutoff = new Date(Date.now() - windowMs);

  try {
    // Atomically upsert/update using raw PostgreSQL query
    const results = await prisma.$queryRaw`
      INSERT INTO "RateLimit" ("key", "attempts", "firstAttempt", "updatedAt")
      VALUES (${key}, 1, ${now}, ${now})
      ON CONFLICT ("key") DO UPDATE SET
        "attempts" = CASE WHEN "RateLimit"."firstAttempt" < ${cutoff} THEN 1 ELSE "RateLimit"."attempts" + 1 END,
        "firstAttempt" = CASE WHEN "RateLimit"."firstAttempt" < ${cutoff} THEN ${now} ELSE "RateLimit"."firstAttempt" END,
        "updatedAt" = ${now}
      RETURNING "attempts";
    `;

    if (Array.isArray(results) && results.length > 0) {
      return { attempts: Number(results[0].attempts || 1) };
    }
    return { attempts: 1 };
  } catch {
    // Fallback to Prisma ORM update
    try {
      const existing = await prisma.rateLimit.findUnique({
        where: { key },
      });

      let updatedRecord;
      if (!existing || Date.now() - existing.firstAttempt.getTime() > windowMs) {
        updatedRecord = await prisma.rateLimit.upsert({
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
        updatedRecord = await prisma.rateLimit.update({
          where: { key },
          data: {
            attempts: { increment: 1 },
          },
        });
      }

      return { attempts: updatedRecord.attempts };
    } catch {
      // In-memory fallback with bounded map size
      if (memoryAttemptsMap.size >= MAX_MEMORY_MAP_SIZE) {
        const firstKey = memoryAttemptsMap.keys().next().value;
        if (firstKey) memoryAttemptsMap.delete(firstKey);
      }

      let record = memoryAttemptsMap.get(key);
      const nowMs = Date.now();
      if (!record || nowMs - record.firstAttempt > windowMs) {
        record = { count: 1, firstAttempt: nowMs };
      } else {
        record.count += 1;
      }
      memoryAttemptsMap.set(key, record);

      return { attempts: record.count };
    }
  }
}

/**
 * Resets/deletes rate limit failure counter for a key (called on successful authentication).
 *
 * @param {string} key
 */
export async function resetRateLimit(key) {
  try {
    await prisma.rateLimit.delete({
      where: { key },
    }).catch(() => {});
  } catch {
    // Suppress DB errors during reset
  }
  memoryAttemptsMap.delete(key);
}
