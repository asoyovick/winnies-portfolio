'use server';

import { cookies } from 'next/headers';
import { authenticateRequest } from './auth';
import { db } from './db';
import type { AdminUser, ProfileSettings, ExperienceEntry, EducationEntry, ExpertiseEntry, Article, MediaAsset, ContactInquiry } from './db';

export async function getServerAdmin(): Promise<{ admin: AdminUser } | { redirect: string }> {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('portfolio_session')?.value ?? null;
  const result = authenticateRequest(sessionToken);
  if (!result.ok) {
    return { redirect: '/admin/login' };
  }
  return { admin: result.admin };
}

export async function getServerProfile(): Promise<ProfileSettings | null> {
  const row = db.prepare('SELECT * FROM profile_settings WHERE id = 1').get();
  if (!row) return null;
  return row as ProfileSettings;
}

export async function getServerExperience(): Promise<ExperienceEntry[]> {
  return db.prepare('SELECT * FROM experience ORDER BY display_order ASC, start_date DESC').all() as ExperienceEntry[];
}

export async function getServerEducation(): Promise<EducationEntry[]> {
  return db.prepare('SELECT * FROM education ORDER BY display_order ASC').all() as EducationEntry[];
}

export async function getServerExpertise(): Promise<ExpertiseEntry[]> {
  return db.prepare('SELECT * FROM expertise ORDER BY display_order ASC').all() as ExpertiseEntry[];
}

export async function getServerArticles(): Promise<Article[]> {
  return db.prepare('SELECT * FROM articles ORDER BY updated_at DESC').all() as Article[];
}

export async function getServerMedia(): Promise<MediaAsset[]> {
  return db.prepare('SELECT * FROM media ORDER BY created_at DESC').all() as MediaAsset[];
}

export async function getServerInquiries(): Promise<ContactInquiry[]> {
  return db.prepare('SELECT * FROM contact_inquiries ORDER BY created_at DESC').all() as ContactInquiry[];
}
