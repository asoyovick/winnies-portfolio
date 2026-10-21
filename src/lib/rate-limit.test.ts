import { describe, it, expect, beforeEach } from 'vitest';
import { rateLimit, clearRateLimit, rateLimitKey } from './rate-limit';

describe('rateLimit', () => {
  beforeEach(async () => {
    await clearRateLimit('rl:test:127.0.0.1');
    await clearRateLimit('rl:test:127.0.0.2');
    await clearRateLimit('rl:test:a');
    await clearRateLimit('rl:test:b');
  });

  it('allows requests up to the limit', async () => {
    const key = 'rl:test:127.0.0.1';
    const results = [];
    for (let i = 0; i < 3; i++) {
      results.push(await rateLimit(key, { limit: 3, windowMs: 60000 }));
    }
    expect(results[0]!.allowed).toBe(true);
    expect(results[1]!.allowed).toBe(true);
    expect(results[2]!.allowed).toBe(true);
    expect(results[2]!.remaining).toBe(0);
  });

  it('rejects requests beyond the limit', async () => {
    const key = 'rl:test:127.0.0.2';
    for (let i = 0; i < 4; i++) {
      await rateLimit(key, { limit: 3, windowMs: 60000 });
    }
    const result = await rateLimit(key, { limit: 3, windowMs: 60000 });
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it('tracks separate keys independently', async () => {
    expect((await rateLimit('rl:test:a', { limit: 1, windowMs: 60000 })).allowed).toBe(
      true
    );
    expect((await rateLimit('rl:test:a', { limit: 1, windowMs: 60000 })).allowed).toBe(
      false
    );
    // A different key is not affected.
    expect((await rateLimit('rl:test:b', { limit: 1, windowMs: 60000 })).allowed).toBe(
      true
    );
  });

  it('builds a key from an address and a route', () => {
    expect(rateLimitKey('10.0.0.1', 'login')).toBe('rl:login:10.0.0.1');
    expect(rateLimitKey(undefined, 'login')).toBe('rl:login:unknown');
  });
});
