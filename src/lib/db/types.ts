/** Row shapes shared by the data layer and the API routes. */

export type AdminUser = {
  id: number;
  email: string;
  password_hash: string;
  password_ciphertext: string;
  password_updated_at: string | null;
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
  bucket: string | null;
  visibility: 'public' | 'private';
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
