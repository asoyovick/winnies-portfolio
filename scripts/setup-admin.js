/**
 * Creates the first administrator account, or resets the password of an
 * existing one.
 *
 * This is a protected initialization run directly on the server. It must NOT
 * create a default account with known credentials in production.
 *
 * Usage (interactive):
 *   node scripts/setup-admin.js
 *
 * Usage (non-interactive, for provisioning):
 *   ADMIN_EMAIL=winnie@example.com ADMIN_PASSWORD=... node scripts/setup-admin.js
 *
 * Resetting an existing account (for example when the password is lost):
 *   RESET_ADMIN=1 ADMIN_EMAIL=winnie@example.com ADMIN_PASSWORD=... node scripts/setup-admin.js
 *
 * The ADMIN_SETUP_TOKEN environment variable is not used here; it guards the
 * HTTP setup endpoint instead.
 */
import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createInterface } from 'readline/promises';
import { createCipheriv, randomBytes, scryptSync } from 'crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..');
const DB_PATH = process.env.DATABASE_URL || join(PROJECT_ROOT, 'data', 'app.db');

const KEY_SALT = 'winnie-portfolio-credential-vault-v1';

/**
 * Seals the password so the administrator can view it in the panel. The
 * database holds ciphertext only; the key comes from SESSION_SECRET.
 */
function sealCredential(plainText) {
  const secret = process.env.SESSION_SECRET || '';
  if (secret.length < 32) {
    throw new Error(
      'SESSION_SECRET must be at least 32 characters so the password can be sealed.'
    );
  }
  const key = scryptSync(secret, KEY_SALT, 32);
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
  return [
    'v1',
    iv.toString('base64'),
    cipher.getAuthTag().toString('base64'),
    encrypted.toString('base64'),
  ].join(':');
}

function existingAdminCount(db) {
  return db.prepare('SELECT COUNT(*) AS n FROM admins').get().n;
}

async function prompt(question) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    return await rl.question(question);
  } finally {
    rl.close();
  }
}

async function main() {
  const db = new Database(DB_PATH);
  db.pragma('foreign_keys = ON');

  const count = existingAdminCount(db);
  const reset = process.env.RESET_ADMIN === '1';

  if (count > 0 && !reset) {
    console.log(`${count} administrator account(s) already exist.`);
    console.log('To reset a password, run again with RESET_ADMIN=1.');
    db.close();
    return;
  }

  const email =
    process.env.ADMIN_EMAIL || (await prompt('Administrator email: '));
  const password =
    process.env.ADMIN_PASSWORD || (await prompt('Administrator password: '));

  if (!email || !email.includes('@')) {
    throw new Error('A valid email address is required.');
  }
  if (!password || password.length < 10) {
    throw new Error('Password must be at least 10 characters.');
  }

  const emailLower = email.toLowerCase();
  const passwordHash = await bcrypt.hash(password, 12);
  const sealed = sealCredential(password);
  const now = new Date().toISOString();

  const existing = db.prepare('SELECT id FROM admins WHERE email = ?').get(emailLower);

  if (existing) {
    if (!reset) {
      throw new Error(`An administrator with email ${emailLower} already exists.`);
    }
    db.prepare(
      `UPDATE admins
       SET password_hash = ?, password_ciphertext = ?, password_updated_at = ?, updated_at = ?
       WHERE id = ?`
    ).run(passwordHash, sealed, now, now, existing.id);
    db.prepare('DELETE FROM sessions WHERE admin_id = ?').run(existing.id);
    console.log(`Password reset for ${emailLower}. Every session was signed out.`);
    db.close();
    return;
  }

  db.prepare(
    `INSERT INTO admins (email, password_hash, password_ciphertext, password_updated_at, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(emailLower, passwordHash, sealed, now, now, now);

  console.log(`Administrator account created for ${emailLower}.`);
  console.log(
    'The password is hashed for sign-in and sealed so it can be viewed in the admin panel.'
  );
  db.close();
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
