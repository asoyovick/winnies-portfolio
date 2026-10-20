import Database from 'better-sqlite3';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..', '..');
const DB_PATH = process.env.DATABASE_URL || join(PROJECT_ROOT, 'data', 'app.db');

export function openDatabase(databasePath: string = DB_PATH): Database.Database {
  const database = new Database(databasePath);
  database.pragma('journal_mode = WAL');
  database.pragma('foreign_keys = ON');
  return database;
}

/*
 * One synchronous connection per module instance. better-sqlite3 with WAL mode
 * handles concurrent reads well enough for this single-instance site.
 *
 * The connection is closed when the process shuts down. Without that, the
 * native module is finalised after the V8 environment has been torn down and
 * better-sqlite3 aborts the process with
 * "Assertion failed: (env) != nullptr".
 */
export const db: Database.Database = openDatabase();

let closed = false;

export function closeDatabase(): void {
  if (closed) return;
  closed = true;
  try {
    db.close();
  } catch {
    // Already closed, or the file was removed underneath us.
  }
}

if (typeof process !== 'undefined' && process.versions?.node) {
  const shutdown = () => closeDatabase();
  // Not on 'beforeExit': that can fire while the server is still serving.
  process.once('exit', shutdown);
  process.once('SIGTERM', shutdown);
  process.once('SIGINT', shutdown);
  process.once('SIGHUP', shutdown);
}

export type AdminUser = {
  id: number;
  email: string;
  password_hash: string;
  created_at: string;
  updated_at: string;
};

export type SessionRow = {
  id: number;
  admin_id: number;
  token_hash: string;
  expires_at: string;
  created_at: string;
};

export type ProfileSettings = {
  id: number;
  display_name: string;
  professional_title: string;
  biography: string;
  location: string;
  public_email: string;
  public_phone: string;
  hero_heading: string;
  hero_subheading: string;
  cv_media_id: number | null;
  profile_image_id: number | null;
  social_links: string;
  updated_at: string;
};

export type ExperienceEntry = {
  id: number;
  position: string;
  organization: string;
  start_date: string;
  end_date: string | null;
  is_current: number;
  description: string;
  responsibilities: string;
  achievements: string;
  display_order: number;
  created_at: string;
  updated_at: string;
};

export type EducationEntry = {
  id: number;
  institution: string;
  qualification: string;
  field_of_study: string;
  start_date: string | null;
  end_date: string | null;
  status: 'completed' | 'ongoing';
  description: string;
  display_order: number;
  created_at: string;
  updated_at: string;
};

export type ExpertiseEntry = {
  id: number;
  title: string;
  description: string;
  category: string;
  display_order: number;
  is_featured: number;
  created_at: string;
  updated_at: string;
};

export type Article = {
  id: number;
  title: string;
  slug: string;
  summary: string;
  body: string;
  featured_image_id: number | null;
  status: 'draft' | 'published';
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

export type MediaAsset = {
  id: number;
  original_name: string;
  storage_name: string;
  mime_type: string;
  size: number;
  path: string;
  width: number | null;
  height: number | null;
  uploaded_by_admin_id: number | null;
  created_at: string;
};

export type ContactInquiry = {
  id: number;
  name: string;
  email: string;
  subject: string;
  message: string;
  is_read: number;
  created_at: string;
};
