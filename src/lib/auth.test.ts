import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  hashPassword,
  comparePassword,
  createSession,
  getSessionByToken,
  authenticateRequest,
  deleteSession,
  adminCount,
  getAdminByEmail,
} from './auth';
import { db } from './db';

describe('auth', () => {
  beforeEach(async () => {
    // Clean slate for each test.
    db.prepare('DELETE FROM sessions').run();
    db.prepare('DELETE FROM admins').run();
    const now = new Date().toISOString();
    await db
      .prepare(
        'INSERT INTO admins (email, password_hash, created_at, updated_at) VALUES (?, ?, ?, ?)'
      )
      .run(
        'winnie@example.com',
        await hashPassword('StrongPassword123!'),
        now,
        now
      );
  });

  afterEach(() => {
    db.prepare('DELETE FROM sessions').run();
    db.prepare('DELETE FROM admins').run();
  });

  it('hashes and compares passwords', async () => {
    const hash = await hashPassword('Secret12345!');
    expect(await comparePassword('Secret12345!', hash)).toBe(true);
    expect(await comparePassword('WrongPassword123!', hash)).toBe(false);
  });

  it('creates and authenticates a session', () => {
    const admin = getAdminByEmail('winnie@example.com')!;
    const { token } = createSession(admin.id);
    const session = getSessionByToken(token);
    expect(session).not.toBeNull();
    expect(session!.admin_id).toBe(admin.id);

    const result = authenticateRequest(token);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.admin.email).toBe('winnie@example.com');
  });

  it('rejects an unknown token', () => {
    const result = authenticateRequest('does-not-exist');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('invalid');
  });

  it('rejects a missing token', () => {
    const result = authenticateRequest(null);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('missing');
  });

  it('deletes a session on logout', () => {
    const admin = getAdminByEmail('winnie@example.com')!;
    const { token } = createSession(admin.id);
    expect(getSessionByToken(token)).not.toBeNull();
    deleteSession(token);
    expect(getSessionByToken(token)).toBeNull();
  });

  it('counts administrators', () => {
    expect(adminCount()).toBe(1);
  });
});
