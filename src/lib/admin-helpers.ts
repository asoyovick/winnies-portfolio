'use server';

import { cookies } from 'next/headers';
import { authenticateRequest } from './auth';
import { get, query } from './db';
import type {
  AdminUser,
  ProfileSettings,
  ExperienceEntry,
  EducationEntry,
  ExpertiseEntry,
  Article,
  MediaAsset,
  ContactInquiry,
} from './db';

export async function getServerAdmin(): Promise<
  { admin: AdminUser } | { redirect: string }
> {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('portfolio_session')?.value ?? null;
  const result = await authenticateRequest(sessionToken);
  if (!result.ok) {
    return { redirect: '/admin/login' };
  }
  return { admin: result.admin };
}

export async function getServerProfile(): Promise<ProfileSettings | null> {
  const row = await get<ProfileSettings>(
    'SELECT * FROM profile_settings WHERE id = 1'
  );
  return row ?? null;
}

export async function getServerExperience(): Promise<ExperienceEntry[]> {
  return query<ExperienceEntry>(
    'SELECT * FROM experience ORDER BY display_order ASC, start_date DESC'
  );
}

export async function getServerEducation(): Promise<EducationEntry[]> {
  return query<EducationEntry>('SELECT * FROM education ORDER BY display_order ASC');
}

export async function getServerExpertise(): Promise<ExpertiseEntry[]> {
  return query<ExpertiseEntry>('SELECT * FROM expertise ORDER BY display_order ASC');
}

export async function getServerArticles(): Promise<Article[]> {
  return query<Article>('SELECT * FROM articles ORDER BY updated_at DESC');
}

export async function getServerMedia(): Promise<MediaAsset[]> {
  return query<MediaAsset>('SELECT * FROM media ORDER BY created_at DESC');
}

export async function getServerInquiries(): Promise<ContactInquiry[]> {
  return query<ContactInquiry>(
    'SELECT * FROM contact_inquiries ORDER BY created_at DESC'
  );
}
