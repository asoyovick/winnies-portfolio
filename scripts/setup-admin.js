/**
 * Creates the first administrator account, or resets the password of an
 * existing one.
 *
 *   ADMIN_EMAIL=... ADMIN_PASSWORD=... node scripts/setup-admin.js
 *   RESET_ADMIN=1 ADMIN_EMAIL=... ADMIN_PASSWORD=... node scripts/setup-admin.js
 *
 * Run this on the server. It is the only supported way to create the first
 * administrator: there is no public registration, and no account is ever
 * seeded with a known password.
 */
import pg from 'pg';
import bcrypt from 'bcryptjs';
import { createCipheriv, randomBytes, scryptSync } from 'crypto';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('DATABASE_URL is not set. Point it at the PostgreSQL database first.');
  process.exit(1);
}

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

async function main() {
  const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || '';
  const reset = process.env.RESET_ADMIN === '1';

  if (!email || !email.includes('@')) {
    console.error('ADMIN_EMAIL must be a valid email address.');
    process.exit(1);
  }
  if (!password || password.length < 12) {
    console.error('ADMIN_PASSWORD must be at least 12 characters.');
    process.exit(1);
  }

  const client = new pg.Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  try {
    const existing = await client.query(
      'SELECT id FROM admins WHERE email = $1',
      [email]
    );

    if (existing.rowCount > 0) {
      if (!reset) {
        console.log(`An administrator with the email ${email} already exists.`);
        console.log('To reset its password, run again with RESET_ADMIN=1.');
        return;
      }
      const passwordHash = await bcrypt.hash(password, 12);
      await client.query(
        `UPDATE admins
         SET password_hash = $1, password_ciphertext = $2, password_updated_at = now(), updated_at = now()
         WHERE id = $3`,
        [passwordHash, sealCredential(password), existing.rows[0].id]
      );
      // Every session of that administrator is signed out.
      await client.query('DELETE FROM sessions WHERE admin_id = $1', [existing.rows[0].id]);
      console.log(`Password reset for ${email}. Every session was signed out.`);
      return;
    }

    const count = await client.query('SELECT COUNT(*)::int AS n FROM admins');
    if (count.rows[0].n > 0) {
      console.log(
        'An administrator already exists. Use RESET_ADMIN=1 to reset a known account.'
      );
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);
    await client.query(
      `INSERT INTO admins (email, password_hash, password_ciphertext, password_updated_at, created_at, updated_at)
       VALUES ($1, $2, $3, now(), now(), now())`,
      [email, passwordHash, sealCredential(password)]
    );
    console.log(`Administrator account created for ${email}.`);
    console.log(
      'The password is hashed for sign-in and sealed so it can be viewed in the admin panel.'
    );
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
