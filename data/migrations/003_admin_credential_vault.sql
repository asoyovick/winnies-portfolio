-- Lets the administrator view and change their own password from the panel.
--
-- The password is never stored in plain text. It is encrypted with AES-256-GCM
-- using a key derived from SESSION_SECRET, so only the server can read it and
-- the database holds nothing but ciphertext.

ALTER TABLE admins ADD COLUMN password_ciphertext TEXT NOT NULL DEFAULT '';
ALTER TABLE admins ADD COLUMN password_updated_at TEXT;
