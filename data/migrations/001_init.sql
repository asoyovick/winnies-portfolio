-- Initial schema for Winnie Awuor Otieno's professional portfolio.
-- Public content is separated from administrator authentication.

PRAGMA foreign_keys = ON;

-- Administrator accounts. No default account is seeded; the first administrator
-- is created through the protected setup process (scripts/setup-admin.js or
-- POST /api/admin/setup with ADMIN_SETUP_TOKEN).
CREATE TABLE IF NOT EXISTS admins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Persistent administrator sessions (cookie-based).
CREATE TABLE IF NOT EXISTS sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  admin_id INTEGER NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_sessions_token_hash ON sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

-- Singleton public profile settings. One row only.
CREATE TABLE IF NOT EXISTS profile_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  display_name TEXT NOT NULL DEFAULT 'Winnie Awuor Otieno',
  professional_title TEXT NOT NULL DEFAULT 'Accounting, Audit & Tax Professional',
  biography TEXT NOT NULL DEFAULT '',
  location TEXT NOT NULL DEFAULT 'Kisumu, Kenya',
  public_email TEXT NOT NULL DEFAULT '',
  hero_text TEXT NOT NULL DEFAULT '',
  cv_media_id INTEGER REFERENCES media(id) ON DELETE SET NULL,
  profile_image_id INTEGER REFERENCES media(id) ON DELETE SET NULL,
  social_links TEXT NOT NULL DEFAULT '[]', -- JSON array of {label, url}
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Employment history (reverse chronological on the public site).
CREATE TABLE IF NOT EXISTS experience (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  position TEXT NOT NULL,
  organization TEXT NOT NULL,
  start_date TEXT NOT NULL, -- ISO date
  end_date TEXT, -- NULL for current positions
  is_current INTEGER NOT NULL DEFAULT 0,
  description TEXT NOT NULL DEFAULT '',
  responsibilities TEXT NOT NULL DEFAULT '[]', -- JSON array of strings
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Education and professional qualifications.
CREATE TABLE IF NOT EXISTS education (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  institution TEXT NOT NULL,
  qualification TEXT NOT NULL,
  field_of_study TEXT NOT NULL DEFAULT '',
  start_date TEXT,
  end_date TEXT,
  status TEXT NOT NULL DEFAULT 'completed', -- completed | ongoing
  description TEXT NOT NULL DEFAULT '',
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Areas of expertise / skills.
CREATE TABLE IF NOT EXISTS expertise (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT '',
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Articles and professional insights.
CREATE TABLE IF NOT EXISTS articles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  summary TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL DEFAULT '',
  featured_image_id INTEGER REFERENCES media(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'draft', -- draft | published
  published_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_articles_slug ON articles(slug);
CREATE INDEX IF NOT EXISTS idx_articles_status ON articles(status);

-- Media assets (persistent storage).
CREATE TABLE IF NOT EXISTS media (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  original_name TEXT NOT NULL,
  storage_name TEXT NOT NULL UNIQUE,
  mime_type TEXT NOT NULL,
  size INTEGER NOT NULL,
  path TEXT NOT NULL,
  width INTEGER,
  height INTEGER,
  uploaded_by_admin_id INTEGER REFERENCES admins(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Contact inquiries from the public contact form. Not exposed to public APIs.
CREATE TABLE IF NOT EXISTS contact_inquiries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  subject TEXT NOT NULL DEFAULT '',
  message TEXT NOT NULL,
  is_read INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_contact_inquiries_created_at ON contact_inquiries(created_at);

-- Seed the singleton profile row (idempotent).
INSERT INTO profile_settings (id, display_name, professional_title, biography, location, public_email, hero_text)
VALUES (
  1,
  'Winnie Awuor Otieno',
  'Accounting, Audit & Tax Professional',
  '',
  'Kisumu, Kenya',
  '',
  ''
)
ON CONFLICT(id) DO NOTHING;
