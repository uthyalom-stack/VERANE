/**
 * In-memory sliding-window rate limiter for authentication endpoints.
 */

const attemptsMap = new Map();

// Periodic cleanup of expired entries every 5 minutes
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of attemptsMap.entries()) {
      if (now - record.firstAttempt > 15 * 60 * 1000) {
        attemptsMap.delete(key);
      }
    }
  }, 5 * 60 * 1000);
}

/**
 * Checks and records a rate-limited attempt.
 * @param {string} key - Unique rate-limiting key (e.g., `login:user@example.com:127.0.0.1`).
 * @param {Object} options - Configuration.
 * @param {number} [options.maxAttempts=5] - Maximum allowed failed attempts.
 * @param {number} [options.windowMs=900000] - Time window in milliseconds (default 15 mins).
 * @returns {{ allowed: boolean, remaining: number, resetMs: number }}
 */
export function checkRateLimit(key, { maxAttempts = 5, windowMs = 15 * 60 * 1000 } = {}) {
  const now = Date.now();
  let record = attemptsMap.get(key);

  if (!record || now - record.firstAttempt > windowMs) {
    record = { count: 0, firstAttempt: now };
    attemptsMap.set(key, record);
  }

  if (record.count >= maxAttempts) {
    const resetMs = windowMs - (now - record.firstAttempt);
    return { allowed: false, remaining: 0, resetMs: Math.max(0, resetMs) };
  }

  return { allowed: true, remaining: maxAttempts - record.count, resetMs: 0 };
}

/**
 * Increments failed attempt count for a rate limit key.
 * @param {string} key
 */
export function recordFailedAttempt(key) {
  const now = Date.now();
  let record = attemptsMap.get(key);
  if (!record) {
    record = { count: 1, firstAttempt: now };
  } else {
    record.count += 1;
  }
  attemptsMap.set(key, record);
}

/**
 * Resets rate limit counter on successful authentication.
 * @param {string} key
 */
export function resetRateLimit(key) {
  attemptsMap.delete(key);
}
