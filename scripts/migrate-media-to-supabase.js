/**
 * Moves the uploaded files from the local disk into Supabase Storage.
 *
 *   DATABASE_URL=postgresql://... \
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
 *   node scripts/migrate-media-to-supabase.js
 *
 * Run the database migration first: this script works from the media rows in
 * PostgreSQL, which still point at the files on disk.
 *
 *   * the profile photograph, the published CV and the article covers are
 *     uploaded to the public bucket, because they are shown on the website;
 *   * every other file goes to the private bucket and is only ever handed to
 *     a signed-in administrator;
 *   * the local files are left in place, so the move can be repeated.
 */
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readFile } from 'fs/promises';
import pg from 'pg';
import { createClient } from '@supabase/supabase-js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..');

const DATABASE_URL = process.env.DATABASE_URL;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PUBLIC_BUCKET = process.env.SUPABASE_PUBLIC_BUCKET || 'portfolio-public';
const PRIVATE_BUCKET = process.env.SUPABASE_PRIVATE_BUCKET || 'portfolio-private';
const MEDIA_DIR = process.env.MEDIA_DIR || join(PROJECT_ROOT, 'data', 'uploads');

if (!DATABASE_URL || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error(
    'DATABASE_URL, SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are all required.'
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function main() {
  const client = new pg.Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  const problems = [];
  let uploaded = 0;
  let skipped = 0;

  try {
    // Which assets are shown on the website?
    const references = await client.query(`
      SELECT
        COALESCE(
          ARRAY(SELECT profile_image_id FROM profile_settings WHERE profile_image_id IS NOT NULL)
          || ARRAY(SELECT cv_media_id FROM profile_settings WHERE cv_media_id IS NOT NULL)
          || ARRAY(SELECT featured_image_id FROM articles WHERE featured_image_id IS NOT NULL)
        , ARRAY[]::int[]) AS public_ids
    `);
    const publicIds = new Set<number>(
      (references.rows[0].public_ids as number[]).map(Number)
    );

    const assets = await client.query(
      'SELECT id, original_name, storage_name, mime_type, path, bucket, visibility FROM media ORDER BY id'
    );

    for (const asset of assets.rows) {
      // Where is the file now?
      const localPath = asset.path && existsSync(asset.path)
        ? asset.path
        : join(MEDIA_DIR, asset.storage_name);

      if (!existsSync(localPath)) {
        problems.push(
          `media ${asset.id} (${asset.original_name}): no file at ${localPath}`
        );
        continue;
      }

      const bucket = publicIds.has(Number(asset.id)) ? PUBLIC_BUCKET : PRIVATE_BUCKET;
      const key = asset.storage_name;

      try {
        const buffer = await readFile(localPath);
        const { error } = await supabase.storage
          .from(bucket)
          .upload(key, buffer, {
            contentType: asset.mime_type,
            cacheControl: '31536000',
            upsert: true,
          });
        if (error) {
          throw new Error(error.message);
        }

        await client.query(
          'UPDATE media SET bucket = $1, path = $2, visibility = $3, updated_at = now() WHERE id = $4',
          [
            bucket,
            key,
            bucket === PUBLIC_BUCKET ? 'public' : 'private',
            asset.id,
          ]
        );
        uploaded += 1;
        console.log(`  uploaded ${key} -> ${bucket}`);
      } catch (error) {
        problems.push(
          `media ${asset.id} (${asset.original_name}): ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    }

    // Verify: every asset is in the bucket it says it is in.
    const verify = await client.query(
      'SELECT id, storage_name, bucket FROM media WHERE bucket IS NOT NULL'
    );
    let missing = 0;
    for (const asset of verify.rows) {
      const { error } = await supabase.storage
        .from(asset.bucket)
        .download(asset.storage_name);
      if (error) {
        missing += 1;
        problems.push(
          `media ${asset.id}: ${asset.storage_name} is not in ${asset.bucket}`
        );
      }
    }

    console.log('');
    console.log(`Uploaded ${uploaded} file(s), skipped ${skipped}.`);
    console.log(
      missing === 0
        ? '  ok   every file was found in its bucket'
        : `  WARN ${missing} file(s) could not be verified`
    );

    if (problems.length > 0) {
      console.error('');
      console.error(`${problems.length} problem(s):`);
      for (const problem of problems) console.error(`  - ${problem}`);
      process.exitCode = 1;
    }
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
