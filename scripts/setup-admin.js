/**
 * Creates the first administrator account.
 *
 * This is a one-time protected initialization. It must NOT create a default
 * account with known credentials in production.
 *
 * Usage (interactive):
 *   node scripts/setup-admin.js
 *
 * Usage (non-interactive, for provisioning):
 *   ADMIN_EMAIL=winnie@example.com ADMIN_PASSWORD=... node scripts/setup-admin.js
 *
 * The ADMIN_SETUP_TOKEN environment variable is not used here; it guards the
 * HTTP setup endpoint instead. Run this script directly on the server.
 */
import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createInterface } from 'readline/promises';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..');
const DB_PATH = process.env.DATABASE_URL || join(PROJECT_ROOT, 'data', 'app.db');

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
  if (count > 0) {
    console.log(`${count} administrator account(s) already exist. Aborting.`);
    db.close();
    return;
  }

  const email =
    process.env.ADMIN_EMAIL ||
    (await prompt('Administrator email: '));
  const password =
    process.env.ADMIN_PASSWORD ||
    (await prompt('Administrator password: '));

  if (!email || !email.includes('@')) {
    throw new Error('A valid email address is required.');
  }
  if (!password || password.length < 10) {
    throw new Error('Password must be at least 10 characters.');
  }

  const emailLower = email.toLowerCase();
  const exists = db.prepare('SELECT id FROM admins WHERE email = ?').get(emailLower);
  if (exists) {
    throw new Error(`An administrator with email ${emailLower} already exists.`);
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const now = new Date().toISOString();
  db.prepare(
    'INSERT INTO admins (email, password_hash, created_at, updated_at) VALUES (?, ?, ?, ?)'
  ).run(emailLower, passwordHash, now, now);

  console.log(`Administrator account created for ${emailLower}.`);
  console.log(
    'Store the password securely. It is hashed in the database and cannot be recovered.'
  );
  db.close();
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
