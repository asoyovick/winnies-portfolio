/**
 * Public content access layer. Reads verified portfolio content from
 * PostgreSQL.
 * Used by server components so the public site always reflects admin edits
 * without a redeploy.
 */
import { get, query } from './db';
import type {
  ProfileSettings,
  ExperienceEntry,
  EducationEntry,
  ExpertiseEntry,
  Article,
  MediaAsset,
} from './db';

export async function getProfile(): Promise<ProfileSettings | null> {
  const row = await get<ProfileSettings>(
    'SELECT * FROM profile_settings WHERE id = 1'
  );
  return row ?? null;
}

export async function getExperience(): Promise<ExperienceEntry[]> {
  return query<ExperienceEntry>(
    'SELECT * FROM experience ORDER BY display_order ASC, start_date DESC'
  );
}

export async function getEducation(): Promise<EducationEntry[]> {
  return query<EducationEntry>(
    'SELECT * FROM education ORDER BY display_order ASC'
  );
}

export async function getExpertise(): Promise<ExpertiseEntry[]> {
  return query<ExpertiseEntry>(
    'SELECT * FROM expertise ORDER BY display_order ASC'
  );
}

export async function getPublishedArticles(): Promise<Article[]> {
  return query<Article>(
    `SELECT * FROM articles WHERE status = 'published'
     ORDER BY published_at DESC, updated_at DESC`
  );
}

export async function getArticleBySlug(
  slug: string,
  includeDrafts = false
): Promise<Article | null> {
  const row = includeDrafts
    ? await get<Article>('SELECT * FROM articles WHERE slug = $1', [slug])
    : await get<Article>(
        `SELECT * FROM articles WHERE slug = $1 AND status = 'published'`,
        [slug]
      );
  return row ?? null;
}

export async function getMediaAsset(id: number): Promise<MediaAsset | null> {
  const row = await get<MediaAsset>('SELECT * FROM media WHERE id = $1', [id]);
  return row ?? null;
}

/** "October 2023" — parsed from the stored value, without any timezone. */
export function formatDate(iso: string | null): string {
  if (!iso) return '';
  const match = /^(\d{4})-(\d{2})/.exec(iso);
  if (!match) return iso;
  const months = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];
  const monthIndex = Number(match[2]) - 1;
  const month = months[monthIndex] ?? match[2];
  return `${month} ${match[1]}`;
}

/** "October 2023 – Present" */
export function formatDateRange(entry: {
  start_date: string | null;
  end_date: string | null;
  is_current?: number | boolean;
}): string {
  const start = entry.start_date ? formatDate(entry.start_date) : '';
  const end = entry.is_current
    ? 'Present'
    : entry.end_date
      ? formatDate(entry.end_date)
      : '';
  if (!start) return end || '';
  return end ? `${start} – ${end}` : `${start} – Present`;
}
