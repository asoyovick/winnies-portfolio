import { describe, it, expect, beforeEach } from 'vitest';
import { rateLimit, clearRateLimit } from './rate-limit';

describe('rateLimit', () => {
  beforeEach(() => {
    clearRateLimit('rl:test:127.0.0.1');
    clearRateLimit('rl:test:127.0.0.2');
    clearRateLimit('rl:test:a');
    clearRateLimit('rl:test:b');
  });

  it('allows requests up to the limit', () => {
    const key = 'rl:test:127.0.0.1';
    const results = [];
    for (let i = 0; i < 3; i++) {
      results.push(rateLimit(key, { limit: 3, windowMs: 60000 }));
    }
    expect(results[0]!.allowed).toBe(true);
    expect(results[1]!.allowed).toBe(true);
    expect(results[2]!.allowed).toBe(true);
    expect(results[2]!.remaining).toBe(0);
  });

  it('rejects requests beyond the limit', () => {
    const key = 'rl:test:127.0.0.2';
    for (let i = 0; i < 4; i++) rateLimit(key, { limit: 3, windowMs: 60000 });
    const result = rateLimit(key, { limit: 3, windowMs: 60000 });
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it('tracks separate keys independently', () => {
    expect(rateLimit('rl:test:a', { limit: 1, windowMs: 60000 }).allowed).toBe(
      true
    );
    expect(rateLimit('rl:test:a', { limit: 1, windowMs: 60000 }).allowed).toBe(
      false
    );
    // A different key is not affected.
    expect(rateLimit('rl:test:b', { limit: 1, windowMs: 60000 }).allowed).toBe(
      true
    );
  });
});
