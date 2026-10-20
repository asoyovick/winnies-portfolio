import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from 'crypto';

/**
 * Credential vault.
 *
 * The administrator can ask the panel to show the password they signed in
 * with. To make that possible without ever writing a plain-text password to
 * the database, the credential is sealed with AES-256-GCM under a key derived
 * from SESSION_SECRET (which lives in the environment, never in the database).
 *
 * If SESSION_SECRET is rotated the sealed value can no longer be opened, and
 * the panel falls back to "set a new password" instead.
 */

const ALGORITHM = 'aes-256-gcm';
const VERSION = 'v1';
const KEY_SALT = 'winnie-portfolio-credential-vault-v1';

function vaultKey(): Buffer {
  const secret = process.env.SESSION_SECRET || '';
  if (secret.length < 32) {
    throw new Error('SESSION_SECRET must be at least 32 characters.');
  }
  return scryptSync(secret, KEY_SALT, 32);
}

export function sealCredential(plainText: string): string {
  const key = vaultKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [
    VERSION,
    iv.toString('base64'),
    tag.toString('base64'),
    encrypted.toString('base64'),
  ].join(':');
}

export function openCredential(sealed: string): string | null {
  if (!sealed) return null;
  const parts = sealed.split(':');
  if (parts.length !== 4) return null;
  const [version, ivPart, tagPart, dataPart] = parts;
  if (version !== VERSION || !ivPart || !tagPart || !dataPart) return null;
  try {
    const key = vaultKey();
    const iv = Buffer.from(ivPart, 'base64');
    const tag = Buffer.from(tagPart, 'base64');
    const encrypted = Buffer.from(dataPart, 'base64');
    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
  } catch {
    // The secret was rotated, or the value was tampered with.
    return null;
  }
}

/** Constant-time comparison of two strings of the same length. */
export function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a, 'utf8');
  const right = Buffer.from(b, 'utf8');
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export function isStrongEnough(password: string): boolean {
  if (password.length < 12) return false;
  const classes = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^A-Za-z0-9]/].filter((pattern) =>
    pattern.test(password)
  );
  return classes.length >= 3;
}
