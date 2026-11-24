import prisma from "./prisma.js";

/**
 * Durable production rate limiter for serverless environments with a bounded
 * in-memory fallback. Database calls must never be allowed to hold an auth
 * request open indefinitely: a stalled libSQL request previously had no
 * deadline and could cause the Cloudflare Worker to cancel the whole request.
 */

const MAX_MEMORY_MAP_SIZE = 10000;
const DB_OPERATION_TIMEOUT_MS = 1200;
const memoryAttemptsMap = new Map();

/**
 * Race a database operation against a short deadline. The underlying driver
 * promise may finish later, but its rejection is always observed by Promise.race.
 */
async function withDbTimeout(operation, operationName) {
  let timeoutId;
  try {
    return await Promise.race([
      operation,
      new Promise((_, reject) => {
        timeoutId = setTimeout(
          () => reject(new Error(`Rate-limit database ${operationName} timed out after ${DB_OPERATION_TIMEOUT_MS}ms`)),
          DB_OPERATION_TIMEOUT_MS
        );
      }),
    ]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

function getMemoryRecord(key, windowMs, nowMs = Date.now()) {
  const record = memoryAttemptsMap.get(key);
  if (!record || nowMs - record.firstAttempt > windowMs) {
    if (record) memoryAttemptsMap.delete(key);
    return null;
  }
  return record;
}

function rememberFailure(key, windowMs) {
  if (memoryAttemptsMap.size >= MAX_MEMORY_MAP_SIZE && !memoryAttemptsMap.has(key)) {
    const firstKey = memoryAttemptsMap.keys().next().value;
    if (firstKey) memoryAttemptsMap.delete(firstKey);
  }

  const nowMs = Date.now();
  const record = getMemoryRecord(key, windowMs, nowMs);
  if (record) record.count += 1;
  else memoryAttemptsMap.set(key, { count: 1, firstAttempt: nowMs });

  return memoryAttemptsMap.get(key).count;
}

/**
 * Checks whether a key is blocked without incrementing its failure counter.
 * If Turso is slow/unavailable, use the bounded isolate-local fallback rather
 * than keeping the login request pending.
 */
export async function checkRateLimit(
  key,
  { maxAttempts = 5, windowMs = 15 * 60 * 1000 } = {}
) {
  try {
    const record = await withDbTimeout(
      prisma.rateLimit.findUnique({ where: { key } }),
      "read"
    );
    const nowMs = Date.now();

    if (!record || nowMs - record.firstAttempt.getTime() > windowMs) {
      return { allowed: true, remaining: maxAttempts, resetMs: 0 };
    }

    if (record.attempts >= maxAttempts) {
      const resetMs = windowMs - (nowMs - record.firstAttempt.getTime());
      return { allowed: false, remaining: 0, resetMs: Math.max(0, resetMs) };
    }

    return { allowed: true, remaining: maxAttempts - record.attempts, resetMs: 0 };
  } catch (err) {
    console.warn("[RATE LIMIT DB FALLBACK] Using in-memory limiter:", err?.message || "database unavailable");
    const record = getMemoryRecord(key, windowMs);
    if (!record) return { allowed: true, remaining: maxAttempts, resetMs: 0 };

    if (record.count >= maxAttempts) {
      const resetMs = windowMs - (Date.now() - record.firstAttempt);
      return { allowed: false, remaining: 0, resetMs: Math.max(0, resetMs) };
    }

    return { allowed: true, remaining: maxAttempts - record.count, resetMs: 0 };
  }
}

/**
 * Atomically increments failed attempts in Turso. A timeout/error falls back
 * to a bounded in-memory counter so a database hiccup cannot hang login.
 */
export async function recordFailedAttempt(key, { windowMs = 15 * 60 * 1000 } = {}) {
  const nowIso = new Date().toISOString();
  const cutoffIso = new Date(Date.now() - windowMs).toISOString();

  try {
    const results = await withDbTimeout(
      prisma.$queryRaw`
        INSERT INTO "RateLimit" ("key", "attempts", "firstAttempt", "updatedAt")
        VALUES (${key}, 1, ${nowIso}, ${nowIso})
        ON CONFLICT ("key") DO UPDATE SET
          "attempts" = CASE WHEN "firstAttempt" < ${cutoffIso} THEN 1 ELSE "attempts" + 1 END,
          "firstAttempt" = CASE WHEN "firstAttempt" < ${cutoffIso} THEN ${nowIso} ELSE "firstAttempt" END,
          "updatedAt" = ${nowIso}
        RETURNING "attempts";
      `,
      "write"
    );

    if (Array.isArray(results) && results.length > 0) {
      return { attempts: Number(results[0].attempts || 1) };
    }
    return { attempts: 1 };
  } catch (err) {
    console.warn("[RATE LIMIT DB FALLBACK] Recording failure in memory:", err?.message || "database unavailable");
    return { attempts: rememberFailure(key, windowMs) };
  }
}

/** Resets a key after successful authentication, with a bounded DB wait. */
export async function resetRateLimit(key) {
  try {
    await withDbTimeout(
      prisma.rateLimit.delete({ where: { key } }),
      "reset"
    );
  } catch (err) {
    console.warn("[RATE LIMIT DB FALLBACK] Could not reset persistent counter:", err?.message || "database unavailable");
  } finally {
    memoryAttemptsMap.delete(key);
  }
}
