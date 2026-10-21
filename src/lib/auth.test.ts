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
import { run } from './db';

describe('auth', () => {
  beforeEach(async () => {
    // Clean slate for each test.
    await run('DELETE FROM sessions');
    await run('DELETE FROM admins');
    const now = new Date().toISOString();
    await run(
      `INSERT INTO admins (email, password_hash, created_at, updated_at)
       VALUES ($1, $2, $3, $3)`,
      ['winnie@example.com', await hashPassword('StrongPassword123!'), now]
    );
  });

  afterEach(async () => {
    await run('DELETE FROM sessions');
    await run('DELETE FROM admins');
  });

  it('hashes and compares passwords', async () => {
    const hash = await hashPassword('Secret12345!');
    expect(await comparePassword('Secret12345!', hash)).toBe(true);
    expect(await comparePassword('WrongPassword123!', hash)).toBe(false);
  });

  it('creates and authenticates a session', async () => {
    const admin = await getAdminByEmail('winnie@example.com');
    expect(admin).not.toBeNull();
    const { token } = await createSession(admin!.id);
    const session = await getSessionByToken(token);
    expect(session).not.toBeNull();
    expect(session!.admin_id).toBe(admin!.id);

    const result = await authenticateRequest(token);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.admin.email).toBe('winnie@example.com');
  });

  it('rejects an unknown token', async () => {
    const result = await authenticateRequest('does-not-exist');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('invalid');
  });

  it('rejects a missing token', async () => {
    const result = await authenticateRequest(null);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('missing');
  });

  it('deletes a session on logout', async () => {
    const admin = await getAdminByEmail('winnie@example.com');
    const { token } = await createSession(admin!.id);
    expect(await getSessionByToken(token)).not.toBeNull();
    await deleteSession(token);
    expect(await getSessionByToken(token)).toBeNull();
  });

  it('counts administrators', async () => {
    expect(await adminCount()).toBe(1);
  });

  it('stores a session with an expiry and a hashed token', async () => {
    const admin = await getAdminByEmail('winnie@example.com');
    const { token, row } = await createSession(admin!.id);
    expect(row.token_hash).not.toBe(token);
    expect(row.token_hash).toHaveLength(64);
    expect(new Date(row.expires_at).getTime()).toBeGreaterThan(Date.now());
  });
});
