-- Supabase Storage: buckets and access policies.
--
-- Run this in the Supabase SQL editor (Dashboard -> SQL Editor -> New query).
-- It creates the two buckets the application uses and the policies that keep
-- them safe.
--
--   portfolio-public   profile photographs, hero images, published article
--                       covers and the CV that has been explicitly published
--   portfolio-private  every other uploaded file; these are only ever handed
--                       to a signed-in administrator
--
-- The application uploads with the service-role key, which bypasses Row Level
-- Security. The policies below therefore grant nothing to anonymous or
-- signed-in visitors: a bucket marked public is readable through its public
-- URL, and everything else stays closed.

-- ---------------------------------------------------------------- buckets
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'portfolio-public',
  'portfolio-public',
  true,
  10485760, -- 10 MB
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'portfolio-private',
  'portfolio-private',
  false,
  10485760, -- 10 MB
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- --------------------------------------------------------------- policies
-- The public bucket is readable by anyone: its objects are served from the
-- public URL the application hands to the browser.
drop policy if exists "portfolio public assets are readable" on storage.objects;
create policy "portfolio public assets are readable"
  on storage.objects for select
  using (bucket_id = 'portfolio-public');

-- Nothing in the private bucket is readable without the service role.
drop policy if exists "portfolio private assets are readable" on storage.objects;

-- No visitor may write or delete an object. The service role bypasses these
-- policies, so the application can still upload and remove files.
drop policy if exists "portfolio assets are written by the service role" on storage.objects;
create policy "portfolio assets are written by the service role"
  on storage.objects for insert
  with check (
    bucket_id in ('portfolio-public', 'portfolio-private')
    and auth.role() = 'service_role'
  );

drop policy if exists "portfolio assets are deleted by the service role" on storage.objects;
create policy "portfolio assets are deleted by the service role"
  on storage.objects for delete
  using (
    bucket_id in ('portfolio-public', 'portfolio-private')
    and auth.role() = 'service_role'
  );
