/**
 * Public content access layer. Reads verified portfolio content from SQLite.
 * Used by server components so the public site always reflects admin edits
 * without a redeploy.
 */
import { db } from './db';
import type {
  ProfileSettings,
  ExperienceEntry,
  EducationEntry,
  ExpertiseEntry,
  Article,
  MediaAsset,
} from './db';

export function getProfile(): ProfileSettings | null {
  const row = db.prepare('SELECT * FROM profile_settings WHERE id = 1').get();
  if (!row) return null;
  return row as ProfileSettings;
}

export function getExperience(): ExperienceEntry[] {
  return db
    .prepare(
      `SELECT * FROM experience ORDER BY display_order ASC, start_date DESC`
    )
    .all() as ExperienceEntry[];
}

export function getEducation(): EducationEntry[] {
  return db
    .prepare(
      `SELECT * FROM education ORDER BY display_order ASC, end_date DESC`
    )
    .all() as EducationEntry[];
}

export function getExpertise(): ExpertiseEntry[] {
  return db
    .prepare('SELECT * FROM expertise ORDER BY display_order ASC')
    .all() as ExpertiseEntry[];
}

export function getPublishedArticles(): Article[] {
  return db
    .prepare(
      `SELECT * FROM articles WHERE status = 'published' ORDER BY published_at DESC, updated_at DESC`
    )
    .all() as Article[];
}

export function getArticleBySlug(slug: string, includeDrafts = false): Article | null {
  const row = db
    .prepare(
      includeDrafts
        ? `SELECT * FROM articles WHERE slug = ?`
        : `SELECT * FROM articles WHERE slug = ? AND status = 'published'`
    )
    .get(slug) as Article | undefined;
  return row ?? null;
}

export function getMediaAsset(id: number): MediaAsset | null {
  const row = db.prepare('SELECT * FROM media WHERE id = ?').get(id) as
    | MediaAsset
    | undefined;
  return row ?? null;
}

export function formatDate(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-GB', {
    year: 'numeric',
    month: 'long',
  });
}

export function formatDateRange(entry: {
  start_date: string | null;
  end_date: string | null;
  is_current?: number | boolean;
}): string {
  const start = entry.start_date ? new Date(entry.start_date) : null;
  const end = entry.end_date ? new Date(entry.end_date) : null;
  const startStr = start
    ? start.toLocaleDateString('en-GB', { year: 'numeric', month: 'long' })
    : '';
  const endStr = entry.is_current
    ? 'Present'
    : end
      ? end.toLocaleDateString('en-GB', { year: 'numeric', month: 'long' })
      : '';
  if (!startStr) return endStr || '';
  return endStr ? `${startStr} – ${endStr}` : `${startStr} – Present`;
}
