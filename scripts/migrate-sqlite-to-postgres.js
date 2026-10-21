/**
 * Copies an existing SQLite portfolio database into PostgreSQL.
 *
 *   DATABASE_URL=postgresql://... node scripts/migrate-sqlite-to-postgres.js
 *
 * The script:
 *   1. reads the SQLite database (data/app.db by default);
 *   2. checks the target is empty, so a live database is never overwritten;
 *   3. copies every table, keeping the identifiers and the relationships;
 *   4. verifies the record counts and the foreign keys;
 *   5. reports anything it could not copy, without skipping it silently.
 *
 * The SQLite database is only ever read. It is left in place so the move can
 * be repeated, and so there is always something to go back to.
 */
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';
import pg from 'pg';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..');

const SQLITE_PATH =
  process.env.SQLITE_PATH || join(PROJECT_ROOT, 'data', 'app.db');
const DATABASE_URL = process.env.DATABASE_URL;
const FORCE = process.env.MIGRATION_FORCE === '1';

if (!DATABASE_URL) {
  console.error('DATABASE_URL is not set. Point it at the target PostgreSQL database.');
  process.exit(1);
}

if (!existsSync(SQLITE_PATH)) {
  console.error(`No SQLite database found at ${SQLITE_PATH}.`);
  process.exit(1);
}

const source = new Database(SQLITE_PATH, { readonly: true });

/** Reads every row of a table, or an empty list when the table is missing. */
function readAll(table) {
  const exists = source
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?")
    .get(table);
  if (!exists) return [];
  return source.prepare(`SELECT * FROM ${table}`).all();
}

function toBoolean(value) {
  return value === 1 || value === true || value === '1';
}

/** JSON columns: PostgreSQL takes the JSON text as it is. */
function toJson(value) {
  if (value === null || value === undefined) return '[]';
  if (typeof value === 'object') return JSON.stringify(value);
  const text = String(value);
  try {
    JSON.parse(text);
    return text;
  } catch {
    return '[]';
  }
}

function toTimestamp(value) {
  if (!value) return null;
  const text = String(value);
  // SQLite stored ISO strings; PostgreSQL understands them.
  return text.includes('T') ? text : text.replace(' ', 'T') + 'Z';
}

async function main() {
  const client = new pg.Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  const problems = [];

  try {
    // --- 2. never overwrite a database that already has content ---------
    // The migrations create an empty profile row, so that one row is not
    // treated as content; a profile that has been edited is.
    const existing = await client.query(
      `SELECT
         (SELECT COUNT(*)::int FROM profile_settings WHERE id = 1 AND
            (biography <> '' OR hero_heading <> 'Clear thinking.'||chr(10)||'Confident decisions.')) AS profile,
         (SELECT COUNT(*)::int FROM experience) AS experience,
         (SELECT COUNT(*)::int FROM education) AS education,
         (SELECT COUNT(*)::int FROM expertise) AS expertise,
         (SELECT COUNT(*)::int FROM articles) AS articles,
         (SELECT COUNT(*)::int FROM media) AS media,
         (SELECT COUNT(*)::int FROM admins) AS admins,
         (SELECT COUNT(*)::int FROM contact_inquiries) AS inquiries`
    );
    const counts = existing.rows[0];
    const total = Object.values(counts).reduce((sum, n) => sum + Number(n), 0);
    if (total > 0 && !FORCE) {
      console.error(
        'The target database already holds content. Nothing was copied.'
      );
      console.error(
        'Re-run with MIGRATION_FORCE=1 if you really mean to add these records to it.'
      );
      process.exitCode = 1;
      return;
    }

    await client.query('BEGIN');

    // --- 3. copy every table -------------------------------------------
    // media first: the profile and the articles refer to it.
    const media = readAll('media');
    for (const row of media) {
      try {
        await client.query(
          `INSERT INTO media (
             id, original_name, storage_name, mime_type, size, path, bucket,
             visibility, width, height, uploaded_by_admin_id, created_at, updated_at
           ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,now())
           ON CONFLICT (id) DO NOTHING`,
          [
            row.id,
            row.original_name,
            row.storage_name,
            row.mime_type,
            row.size,
            row.path ?? '',
            null,
            'private',
            row.width ?? null,
            row.height ?? null,
            row.uploaded_by_admin_id ?? null,
            toTimestamp(row.created_at),
          ]
        );
      } catch (error) {
        problems.push(
          `media ${row.id} (${row.original_name}): ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    }

    const admins = readAll('admins');
    for (const row of admins) {
      try {
        await client.query(
          `INSERT INTO admins (
             id, email, password_hash, password_ciphertext, password_updated_at,
             created_at, updated_at
           ) VALUES ($1,$2,$3,$4,$5,$6,now())
           ON CONFLICT (id) DO NOTHING`,
          [
            row.id,
            row.email,
            row.password_hash,
            row.password_ciphertext ?? '',
            toTimestamp(row.password_updated_at),
            toTimestamp(row.created_at),
          ]
        );
      } catch (error) {
        problems.push(
          `admins ${row.id} (${row.email}): ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    }

    const sessions = readAll('sessions');
    for (const row of sessions) {
      try {
        await client.query(
          `INSERT INTO sessions (id, admin_id, token_hash, expires_at, created_at)
           VALUES ($1,$2,$3,$4,$5)
           ON CONFLICT (id) DO NOTHING`,
          [
            row.id,
            row.admin_id,
            row.token_hash,
            toTimestamp(row.expires_at),
            toTimestamp(row.created_at),
          ]
        );
      } catch (error) {
        problems.push(
          `sessions ${row.id}: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }

    const profile = readAll('profile_settings')[0];
    if (profile) {
      try {
        await client.query(
          `INSERT INTO profile_settings (
             id, display_name, professional_title, biography, location,
             public_email, public_phone, hero_heading, hero_subheading,
             cv_media_id, profile_image_id, social_links, updated_at
           ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb,$13)
           ON CONFLICT (id) DO NOTHING`,
          [
            profile.id,
            profile.display_name,
            profile.professional_title,
            profile.biography,
            profile.location,
            profile.public_email,
            profile.public_phone ?? '',
            profile.hero_heading ?? '',
            profile.hero_subheading ?? '',
            profile.cv_media_id ?? null,
            profile.profile_image_id ?? null,
            toJson(profile.social_links),
            toTimestamp(profile.updated_at),
          ]
        );
      } catch (error) {
        problems.push(
          `profile_settings: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }

    const experience = readAll('experience');
    for (const row of experience) {
      try {
        await client.query(
          `INSERT INTO experience (
             id, position, organization, start_date, end_date, is_current,
             description, responsibilities, achievements, display_order,
             created_at, updated_at
           ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9::jsonb,$10,$11,now())
           ON CONFLICT (id) DO NOTHING`,
          [
            row.id,
            row.position,
            row.organization,
            row.start_date,
            row.end_date ?? null,
            toBoolean(row.is_current),
            row.description ?? '',
            toJson(row.responsibilities),
            toJson(row.achievements),
            row.display_order ?? 0,
            toTimestamp(row.created_at),
          ]
        );
      } catch (error) {
        problems.push(
          `experience ${row.id} (${row.organization}): ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    }

    const education = readAll('education');
    for (const row of education) {
      try {
        await client.query(
          `INSERT INTO education (
             id, institution, qualification, field_of_study, start_date,
             end_date, status, description, display_order, created_at, updated_at
           ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,now())
           ON CONFLICT (id) DO NOTHING`,
          [
            row.id,
            row.institution,
            row.qualification,
            row.field_of_study ?? '',
            row.start_date ?? null,
            row.end_date ?? null,
            row.status,
            row.description ?? '',
            row.display_order ?? 0,
            toTimestamp(row.created_at),
          ]
        );
      } catch (error) {
        problems.push(
          `education ${row.id} (${row.qualification}): ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    }

    const expertise = readAll('expertise');
    for (const row of expertise) {
      try {
        await client.query(
          `INSERT INTO expertise (
             id, title, description, category, display_order, is_featured,
             created_at, updated_at
           ) VALUES ($1,$2,$3,$4,$5,$6,$7,now())
           ON CONFLICT (id) DO NOTHING`,
          [
            row.id,
            row.title,
            row.description ?? '',
            row.category ?? '',
            row.display_order ?? 0,
            toBoolean(row.is_featured),
            toTimestamp(row.created_at),
          ]
        );
      } catch (error) {
        problems.push(
          `expertise ${row.id} (${row.title}): ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    }

    const articles = readAll('articles');
    for (const row of articles) {
      try {
        await client.query(
          `INSERT INTO articles (
             id, title, slug, summary, body, featured_image_id, status,
             published_at, created_at, updated_at
           ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,now())
           ON CONFLICT (id) DO NOTHING`,
          [
            row.id,
            row.title,
            row.slug,
            row.summary ?? '',
            row.body ?? '',
            row.featured_image_id ?? null,
            row.status,
            toTimestamp(row.published_at),
            toTimestamp(row.created_at),
          ]
        );
      } catch (error) {
        problems.push(
          `articles ${row.id} (${row.slug}): ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    }

    const inquiries = readAll('contact_inquiries');
    for (const row of inquiries) {
      try {
        await client.query(
          `INSERT INTO contact_inquiries (
             id, name, email, subject, message, is_read, created_at
           ) VALUES ($1,$2,$3,$4,$5,$6,$7)
           ON CONFLICT (id) DO NOTHING`,
          [
            row.id,
            row.name,
            row.email,
            row.subject ?? '',
            row.message,
            toBoolean(row.is_read),
            toTimestamp(row.created_at),
          ]
        );
      } catch (error) {
        problems.push(
          `contact_inquiries ${row.id}: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    }

    await client.query('COMMIT');

    // --- 4. verify ------------------------------------------------------
    const verify = await client.query(
      `SELECT
         (SELECT COUNT(*)::int FROM profile_settings WHERE id = 1) AS profile,
         (SELECT COUNT(*)::int FROM experience) AS experience,
         (SELECT COUNT(*)::int FROM education) AS education,
         (SELECT COUNT(*)::int FROM expertise) AS expertise,
         (SELECT COUNT(*)::int FROM articles) AS articles,
         (SELECT COUNT(*)::int FROM media) AS media,
         (SELECT COUNT(*)::int FROM admins) AS admins,
         (SELECT COUNT(*)::int FROM contact_inquiries) AS inquiries`
    );

    console.log('Copied from SQLite to PostgreSQL:');
    const expected = {
      profile: profile ? 1 : 0,
      experience: experience.length,
      education: education.length,
      expertise: expertise.length,
      articles: articles.length,
      media: media.length,
      admins: admins.length,
      inquiries: inquiries.length,
    };
    let mismatched = 0;
    for (const [table, expectedCount] of Object.entries(expected)) {
      const actual = Number(verify.rows[0][table]);
      const ok = actual === expectedCount;
      if (!ok) mismatched += 1;
      console.log(
        `  ${ok ? 'ok  ' : 'DIFF'} ${table}: ${actual} of ${expectedCount} copied`
      );
    }

    // Foreign keys: nothing may point at a row that was not copied.
    const orphans = await client.query(`
      SELECT
        (SELECT COUNT(*)::int FROM profile_settings p
          LEFT JOIN media m ON m.id = p.profile_image_id
          WHERE p.profile_image_id IS NOT NULL AND m.id IS NULL) AS profile_image,
        (SELECT COUNT(*)::int FROM articles a
          LEFT JOIN media m ON m.id = a.featured_image_id
          WHERE a.featured_image_id IS NOT NULL AND m.id IS NULL) AS article_image,
        (SELECT COUNT(*)::int FROM sessions s
          LEFT JOIN admins a ON a.id = s.admin_id
          WHERE a.id IS NULL) AS session_admin
    `);
    const orphanTotal = Object.values(orphans.rows[0]).reduce(
      (sum, n) => sum + Number(n),
      0
    );
    console.log(
      orphanTotal === 0
        ? '  ok   every reference points at a copied row'
        : `  WARN ${orphanTotal} reference(s) point at a row that was not copied`
    );

    if (problems.length > 0) {
      console.error('');
      console.error(`${problems.length} row(s) could not be copied:`);
      for (const problem of problems) console.error(`  - ${problem}`);
      process.exitCode = 1;
    } else {
      console.log('  ok   every row was copied');
    }

    if (mismatched > 0) {
      console.error(
        'Some tables do not match the source. Check the rows listed above before using this database.'
      );
      process.exitCode = 1;
    }
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    await client.end();
    source.close();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
