-- Content fields for the hero, contact details and expertise selection.
--
--  * hero_heading / hero_subheading replace the single hero_text column so the
--    headline and the supporting line can be edited separately.
--  * public_phone holds an optional phone number Winnie chooses to publish.
--  * expertise.is_featured marks the areas shown on the homepage.

ALTER TABLE profile_settings ADD COLUMN public_phone TEXT NOT NULL DEFAULT '';
ALTER TABLE profile_settings ADD COLUMN hero_heading TEXT NOT NULL DEFAULT '';
ALTER TABLE profile_settings ADD COLUMN hero_subheading TEXT NOT NULL DEFAULT '';

-- Carry the existing hero copy into the new subheading field.
UPDATE profile_settings
SET hero_subheading = hero_text
WHERE hero_subheading = '' AND hero_text IS NOT NULL AND hero_text <> '';

UPDATE profile_settings
SET hero_heading = 'Clear thinking.
Confident decisions.'
WHERE hero_heading = '';

-- Rebuild the table without the superseded hero_text column.
CREATE TABLE profile_settings_rebuilt (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  display_name TEXT NOT NULL DEFAULT 'Winnie Awuor Otieno',
  professional_title TEXT NOT NULL DEFAULT 'Accounting, Audit & Tax Professional',
  biography TEXT NOT NULL DEFAULT '',
  location TEXT NOT NULL DEFAULT 'Kisumu, Kenya',
  public_email TEXT NOT NULL DEFAULT '',
  public_phone TEXT NOT NULL DEFAULT '',
  hero_heading TEXT NOT NULL DEFAULT '',
  hero_subheading TEXT NOT NULL DEFAULT '',
  cv_media_id INTEGER REFERENCES media(id) ON DELETE SET NULL,
  profile_image_id INTEGER REFERENCES media(id) ON DELETE SET NULL,
  social_links TEXT NOT NULL DEFAULT '[]',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT INTO profile_settings_rebuilt (
  id, display_name, professional_title, biography, location, public_email,
  public_phone, hero_heading, hero_subheading, cv_media_id, profile_image_id,
  social_links, updated_at
)
SELECT
  id, display_name, professional_title, biography, location, public_email,
  public_phone, hero_heading, hero_subheading, cv_media_id, profile_image_id,
  social_links, updated_at
FROM profile_settings;

DROP TABLE profile_settings;
ALTER TABLE profile_settings_rebuilt RENAME TO profile_settings;

ALTER TABLE expertise ADD COLUMN is_featured INTEGER NOT NULL DEFAULT 0;

UPDATE expertise SET is_featured = 1 WHERE category IN ('Tax', 'Audit');

-- Verified achievements recorded on the CV (JSON array of strings).
ALTER TABLE experience ADD COLUMN achievements TEXT NOT NULL DEFAULT '[]';
