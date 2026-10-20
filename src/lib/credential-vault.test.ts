import { describe, expect, it, beforeAll } from 'vitest';
import { isStrongEnough, openCredential, safeEqual, sealCredential } from './credential-vault';

describe('credential vault', () => {
  beforeAll(() => {
    process.env.SESSION_SECRET = 'unit-test-secret-key-with-at-least-32-chars';
  });

  it('seals and opens a credential', () => {
    const password = 'WinnieSecurePass2026!';
    const sealed = sealCredential(password);
    expect(sealed).not.toContain(password);
    expect(sealed.startsWith('v1:')).toBe(true);
    expect(openCredential(sealed)).toBe(password);
  });

  it('cannot open a credential sealed with a different secret', () => {
    const sealed = sealCredential('WinnieSecurePass2026!');
    const original = process.env.SESSION_SECRET;
    process.env.SESSION_SECRET = 'a-completely-different-secret-key-32-chars';
    expect(openCredential(sealed)).toBeNull();
    process.env.SESSION_SECRET = original;
    expect(openCredential(sealed)).toBe('WinnieSecurePass2026!');
  });

  it('refuses a tampered value', () => {
    const sealed = sealCredential('WinnieSecurePass2026!');
    const tampered = sealed.slice(0, -4) + 'AAAA';
    expect(openCredential(tampered)).toBeNull();
  });

  it('returns null for an empty or malformed value', () => {
    expect(openCredential('')).toBeNull();
    expect(openCredential('not-a-sealed-value')).toBeNull();
  });

  it('compares strings safely', () => {
    expect(safeEqual('abc', 'abc')).toBe(true);
    expect(safeEqual('abc', 'abd')).toBe(false);
    expect(safeEqual('abc', 'abcd')).toBe(false);
  });

  it('checks password strength', () => {
    expect(isStrongEnough('WinnieSecurePass2026!')).toBe(true);
    expect(isStrongEnough('short1!')).toBe(false);
    expect(isStrongEnough('alllowercaseletters')).toBe(false);
    expect(isStrongEnough('alllowercaseletters1')).toBe(false);
  });
});
