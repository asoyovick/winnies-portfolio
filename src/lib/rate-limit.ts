/**
 * Simple in-memory fixed-window rate limiter.
 *
 * Keys are per IP + route. Counts are reset after the window. Suitable for a
 * single-instance deployment. For multi-instance production, replace with a
 * Redis-backed store keyed the same way.
 */
interface Window {
  count: number;
  resetAt: number;
}

const windows = new Map<string, Window>();

export type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
};

export function rateLimit(
  key: string,
  options: { limit: number; windowMs: number }
): RateLimitResult {
  const now = Date.now();
  const { limit, windowMs } = options;
  const existing = windows.get(key);

  if (!existing || now >= existing.resetAt) {
    windows.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, limit, remaining: limit - 1, resetAt: now + windowMs };
  }

  existing.count += 1;
  const remaining = Math.max(0, limit - existing.count);
  return { allowed: existing.count <= limit, limit, remaining, resetAt: existing.resetAt };
}

export function rateLimitKey(ip: string | undefined, route: string): string {
  return `rl:${route}:${ip ?? 'unknown'}`;
}

export function clearRateLimit(key: string): void {
  windows.delete(key);
}
