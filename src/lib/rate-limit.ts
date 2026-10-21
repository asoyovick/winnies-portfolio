import { get, run } from './db';

/**
 * Rate limiting.
 *
 * The counters live in PostgreSQL so the limit is shared by every instance of
 * the application: on a platform that runs more than one instance, an
 * in-memory counter would let an attacker multiply their attempts.
 */
export type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
};

export async function rateLimit(
  key: string,
  options: { limit: number; windowMs: number }
): Promise<RateLimitResult> {
  const { limit, windowMs } = options;

  // One atomic statement: count the attempt and start a new window when the
  // old one has passed.
  const row = await get<{ count: number; reset_at: string }>(
    `INSERT INTO rate_limits (key, count, reset_at)
     VALUES ($1, 1, now() + ($2::bigint * interval '1 millisecond'))
     ON CONFLICT (key) DO UPDATE SET
       count = CASE WHEN rate_limits.reset_at <= now() THEN 1 ELSE rate_limits.count + 1 END,
       reset_at = CASE WHEN rate_limits.reset_at <= now()
                       THEN EXCLUDED.reset_at
                       ELSE rate_limits.reset_at END
     RETURNING count, reset_at`,
    [key, windowMs]
  );

  const count = Number(row?.count ?? 1);
  const resetAt = row?.reset_at ? new Date(row.reset_at).getTime() : Date.now() + windowMs;

  return {
    allowed: count <= limit,
    limit,
    remaining: Math.max(0, limit - count),
    resetAt,
  };
}

export function rateLimitKey(ip: string | undefined, route: string): string {
  return `rl:${route}:${ip ?? 'unknown'}`;
}

export async function clearRateLimit(key: string): Promise<void> {
  await run('DELETE FROM rate_limits WHERE key = $1', [key]);
}
