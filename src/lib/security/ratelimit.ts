/**
 * In-Memory Sliding Window Rate Limiter & Brute-Force Lockout Engine
 * Protects login endpoints, password resets, and Gemini AI queries
 */

interface RateLimitRecord {
  count: number;
  firstRequestTime: number;
  lockedUntil?: number;
}

const rateLimitStore = new Map<string, RateLimitRecord>();

// Automatically clean up stale keys every 10 minutes
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of rateLimitStore.entries()) {
      if (record.lockedUntil && record.lockedUntil < now) {
        rateLimitStore.delete(key);
      } else if (now - record.firstRequestTime > 3600000) {
        rateLimitStore.delete(key);
      }
    }
  }, 10 * 60 * 1000).unref?.();
}

export interface RateLimitOptions {
  windowMs: number; // Time frame in milliseconds
  maxAttempts: number; // Max requests allowed per window
  lockoutDurationMs?: number; // Lockout penalty if exceeded
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds?: number;
  isLocked: boolean;
}

/**
 * Checks and increments rate limit for an identifier (e.g. IP or email)
 */
export function checkRateLimit(
  identifier: string,
  options: RateLimitOptions
): RateLimitResult {
  const now = Date.now();
  const record = rateLimitStore.get(identifier);

  // If locked, check if lockout has expired
  if (record?.lockedUntil) {
    if (now < record.lockedUntil) {
      const remainingSeconds = Math.ceil((record.lockedUntil - now) / 1000);
      return {
        allowed: false,
        remaining: 0,
        retryAfterSeconds: remainingSeconds,
        isLocked: true,
      };
    }
    // Lockout expired, reset counter
    rateLimitStore.delete(identifier);
  }

  // If no record exists or window expired
  if (!record || now - record.firstRequestTime > options.windowMs) {
    rateLimitStore.set(identifier, {
      count: 1,
      firstRequestTime: now,
    });
    return {
      allowed: true,
      remaining: options.maxAttempts - 1,
      isLocked: false,
    };
  }

  // Increment attempt count
  record.count += 1;

  if (record.count > options.maxAttempts) {
    const lockoutMs = options.lockoutDurationMs || options.windowMs;
    record.lockedUntil = now + lockoutMs;
    const remainingSeconds = Math.ceil(lockoutMs / 1000);

    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: remainingSeconds,
      isLocked: true,
    };
  }

  return {
    allowed: true,
    remaining: options.maxAttempts - record.count,
    isLocked: false,
  };
}

/**
 * Resets rate limit for an identifier on successful action (e.g. valid login)
 */
export function resetRateLimit(identifier: string) {
  rateLimitStore.delete(identifier);
}
