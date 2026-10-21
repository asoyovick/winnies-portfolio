import { createHash } from 'crypto';
import bcrypt from 'bcryptjs';
import { get, run } from './db';
import type { AdminUser, SessionRow } from './db';

const SESSION_SECRET = process.env.SESSION_SECRET || '';
const SESSION_MAX_AGE = Number(process.env.SESSION_MAX_AGE || 604800); // seconds
const SESSION_COOKIE = 'portfolio_session';
const CSRF_COOKIE = 'portfolio_csrf';

export function sessionCookieName() {
  return SESSION_COOKIE;
}

export function csrfCookieName() {
  return CSRF_COOKIE;
}

export function isConfigured(): boolean {
  return Boolean(SESSION_SECRET && SESSION_SECRET.length >= 32);
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function comparePassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateToken(): string {
  const buf = Buffer.alloc(32);
  crypto.getRandomValues(buf);
  return buf.toString('hex');
}

export function hashToken(token: string): string {
  const buf = Buffer.from(token, 'utf8');
  return createHash('sha256').update(buf).digest('hex');
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function expiresIn(seconds: number): string {
  return new Date(Date.now() + seconds * 1000).toISOString();
}

export async function createSession(
  adminId: number
): Promise<{ token: string; row: SessionRow }> {
  const token = generateToken();
  const tokenHash = hashToken(token);
  const expiresAt = expiresIn(SESSION_MAX_AGE);
  const row = await get<SessionRow>(
    `INSERT INTO sessions (admin_id, token_hash, expires_at)
     VALUES ($1, $2, $3)
     RETURNING id, admin_id, token_hash, expires_at, created_at`,
    [adminId, tokenHash, expiresAt]
  );
  if (!row) throw new Error('The session could not be created.');
  return { token, row };
}

export async function getSessionByToken(token: string): Promise<SessionRow | null> {
  const tokenHash = hashToken(token);
  const row = await get<SessionRow>(
    `SELECT id, admin_id, token_hash, expires_at, created_at
     FROM sessions WHERE token_hash = $1`,
    [tokenHash]
  );
  if (!row) return null;
  if (new Date(row.expires_at) <= new Date()) {
    await run('DELETE FROM sessions WHERE id = $1', [row.id]);
    return null;
  }
  return row;
}

export async function deleteSession(token: string): Promise<void> {
  const tokenHash = hashToken(token);
  await run('DELETE FROM sessions WHERE token_hash = $1', [tokenHash]);
}

export async function deleteExpiredSessions(): Promise<void> {
  await run('DELETE FROM sessions WHERE expires_at <= now()');
}

export async function getAdminById(id: number): Promise<AdminUser | null> {
  const row = await get<AdminUser>(
    `SELECT id, email, password_hash, password_ciphertext, password_updated_at,
            created_at, updated_at
     FROM admins WHERE id = $1`,
    [id]
  );
  return row ?? null;
}

export async function getAdminByEmail(email: string): Promise<AdminUser | null> {
  const row = await get<AdminUser>(
    `SELECT id, email, password_hash, password_ciphertext, password_updated_at,
            created_at, updated_at
     FROM admins WHERE email = $1`,
    [email]
  );
  return row ?? null;
}

export async function adminCount(): Promise<number> {
  const row = await get<{ n: number }>('SELECT COUNT(*)::int AS n FROM admins');
  return row?.n ?? 0;
}

export function cookieOptions(production: boolean) {
  return {
    httpOnly: true,
    secure: production,
    sameSite: 'lax' as const,
    path: '/',
    maxAge: SESSION_MAX_AGE,
  } as const;
}

export function csrfCookieOptions(production: boolean) {
  return {
    httpOnly: false, // read by the frontend to build the X-CSRF-Token header
    secure: production,
    sameSite: 'lax' as const,
    path: '/',
    maxAge: SESSION_MAX_AGE,
  } as const;
}

export type AuthResult =
  | { ok: true; admin: AdminUser }
  | { ok: false; reason: 'missing' | 'invalid' | 'expired' | 'unconfigured' };

export async function authenticateRequest(
  sessionToken: string | null
): Promise<AuthResult> {
  if (!isConfigured()) {
    return { ok: false, reason: 'unconfigured' };
  }
  if (!sessionToken) {
    return { ok: false, reason: 'missing' };
  }
  const session = await getSessionByToken(sessionToken);
  if (!session) {
    return { ok: false, reason: 'invalid' };
  }
  const admin = await getAdminById(session.admin_id);
  if (!admin) {
    await deleteSession(sessionToken);
    return { ok: false, reason: 'invalid' };
  }
  return { ok: true, admin };
}

export async function requireAdmin(
  sessionToken: string | null
): Promise<{ admin: AdminUser } | { error: string; status: number }> {
  if (!isConfigured()) {
    return { error: 'Authentication is not configured on the server.', status: 500 };
  }
  const result = await authenticateRequest(sessionToken);
  if (!result.ok) {
    return { error: 'Not authenticated.', status: 401 };
  }
  return { admin: result.admin };
}

export function validateCsrfToken(
  submitted: string | null,
  cookieValue: string | null
): boolean {
  if (!submitted || !cookieValue) return false;
  // Constant-time comparison.
  const a = Buffer.from(submitted, 'utf8');
  const b = Buffer.from(cookieValue, 'utf8');
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= (a[i] ?? 0) ^ (b[i] ?? 0);
  return diff === 0;
}
