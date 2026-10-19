import { createHash } from 'crypto';
import bcrypt from 'bcryptjs';
import { db } from './db';
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

export function createSession(adminId: number): { token: string; row: SessionRow } {
  const token = generateToken();
  const tokenHash = hashToken(token);
  const expiresAt = expiresIn(SESSION_MAX_AGE);
  const row = db
    .prepare(
      `INSERT INTO sessions (admin_id, token_hash, expires_at)
       VALUES (?, ?, ?)
       RETURNING id, admin_id, token_hash, expires_at, created_at`
    )
    .get(adminId, tokenHash, expiresAt) as SessionRow;
  return { token, row };
}

export function getSessionByToken(token: string): SessionRow | null {
  const tokenHash = hashToken(token);
  const row = db
    .prepare(
      `SELECT id, admin_id, token_hash, expires_at, created_at
       FROM sessions WHERE token_hash = ?`
    )
    .get(tokenHash) as SessionRow | undefined;
  if (!row) return null;
  if (new Date(row.expires_at) <= new Date()) {
    db.prepare('DELETE FROM sessions WHERE id = ?').run(row.id);
    return null;
  }
  return row;
}

export function deleteSession(token: string): void {
  const tokenHash = hashToken(token);
  db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(tokenHash);
}

export function deleteExpiredSessions(): void {
  db.prepare('DELETE FROM sessions WHERE expires_at <= datetime(\'now\')').run();
}

export function getAdminById(id: number): AdminUser | null {
  const row = db
    .prepare('SELECT id, email, password_hash, created_at, updated_at FROM admins WHERE id = ?')
    .get(id) as AdminUser | undefined;
  return row ?? null;
}

export function getAdminByEmail(email: string): AdminUser | null {
  const row = db
    .prepare('SELECT id, email, password_hash, created_at, updated_at FROM admins WHERE email = ?')
    .get(email) as AdminUser | undefined;
  return row ?? null;
}

export function adminCount(): number {
  const row = db.prepare('SELECT COUNT(*) AS n FROM admins').get() as { n: number };
  return row.n;
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

export function authenticateRequest(
  sessionToken: string | null
): AuthResult {
  if (!isConfigured()) {
    return { ok: false, reason: 'unconfigured' };
  }
  if (!sessionToken) {
    return { ok: false, reason: 'missing' };
  }
  const session = getSessionByToken(sessionToken);
  if (!session) {
    return { ok: false, reason: 'invalid' };
  }
  const admin = getAdminById(session.admin_id);
  if (!admin) {
    deleteSession(sessionToken);
    return { ok: false, reason: 'invalid' };
  }
  return { ok: true, admin };
}

export function requireAdmin(
  sessionToken: string | null
): { admin: AdminUser } | { error: string; status: number } {
  if (!isConfigured()) {
    return { error: 'Authentication is not configured on the server.', status: 500 };
  }
  const result = authenticateRequest(sessionToken);
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
