-- Supabase hardening.
--
-- The application connects to PostgreSQL directly (as the table owner) and
-- never uses the Supabase REST API for data, so Row Level Security is not
-- required for the application to work. Enabling it here means that if the
-- anon or authenticated key is ever used against these tables through the
-- Supabase API, nothing can be read or written: there are no policies for
-- those roles, so every statement is denied.
--
-- The table owner (the role the application connects as) is not affected.

ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE experience ENABLE ROW LEVEL SECURITY;
ALTER TABLE education ENABLE ROW LEVEL SECURITY;
ALTER TABLE expertise ENABLE ROW LEVEL SECURITY;
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE media ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;
