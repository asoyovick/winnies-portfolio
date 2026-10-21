# Deploying Winnie's portfolio to Render and Supabase

This guide takes the portfolio from the repository to a live site on
[Render](https://render.com), with [Supabase](https://supabase.com) providing
PostgreSQL and object storage.

The application runs entirely on the server: the public pages, the
administration panel and the API routes are all part of one Next.js service.

```
Visitor ──► Render (Next.js: pages, admin panel, API) ──► Supabase PostgreSQL
                                             └───────► Supabase Storage
```

**The two things that are easy to get wrong**

1. **Connect with the pooler, not the direct connection.** Render runs on
   IPv4. The direct connection address (`db.<ref>.supabase.co`) is IPv6-only
   and will fail. Use the pooled address
   (`aws-0-<region>.pooler.supabase.com:6543`).
2. **The uploads must not live on Render's disk.** Render's filesystem is
   ephemeral: a redeploy wipes it. Uploads go to Supabase Storage; the
   application serves them from there.

---

## PHASE A — SUPABASE

### A1. Create the project

1. Sign in at <https://supabase.com> and create a project.
2. Note the **project reference** — it is in the project URL and in the
   project settings. It appears in every address below as `<ref>`.
3. Wait for the database to finish provisioning (a minute or two).

### A2. Find the PostgreSQL connection details

**Dashboard → Project Settings → Database → Connection string.** Choose the
**URI** format. It looks like this:

```
postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres?sslmode=require
```

Copy it, replace `<password>` with the database password you set, and keep it
for phase D. It is a credential: it never goes into the repository.

### A3. Choose the connection method

| Method | Address | Use it for |
|---|---|---|
| **Session pooler** (port 5432) | `aws-0-<region>.pooler.supabase.com:5432` | A long-running service with few connections |
| **Transaction pooler** (port 6543) | `aws-0-<region>.pooler.supabase.com:6543` | **Recommended here.** Short transactions, many clients |
| Direct connection | `db.<ref>.supabase.co:5432` | Only from an IPv6 network — **not** from Render |

The application uses one pooled connection per process
(`DATABASE_POOL_SIZE`, default 5) and parameterised queries, so it fits
comfortably inside the pooler's limits. Every query is short, so the
transaction pooler is the right choice.

### A4. Apply the PostgreSQL migrations

The schema lives in the repository, in `db/migrations/`. Apply it either from
your machine (needs Node 22 and the connection string):

```bash
DATABASE_URL="postgresql://…" npm run migrate
```

or from the **Supabase SQL editor** (**Dashboard → SQL Editor**), by pasting
the contents of each file in `db/migrations/` in order:

1. `db/migrations/001_initial.sql`
2. `db/migrations/002_supabase_hardening.sql`

The migration runner records what it has applied in `schema_migrations`, so
running it again is safe and never applies a file twice.

### A5. Create the Storage buckets

Run the contents of **`db/supabase/storage.sql`** in the Supabase SQL editor.
It creates two buckets:

| Bucket | Public | Holds |
|---|---|---|
| `portfolio-public` | yes | the profile photograph, hero images, published article covers, and the CV that has been published |
| `portfolio-private` | no | every other uploaded file; these are only ever handed to a signed-in administrator |

The same file sets the access policies: anonymous visitors can read the public
bucket, and nothing can be written or deleted except with the service-role
key.

> The bucket names can be changed with `SUPABASE_PUBLIC_BUCKET` and
> `SUPABASE_PRIVATE_BUCKET`. If you rename them, update the SQL file too.

### A6. Note the server-side credentials

**Dashboard → Project Settings → API.** Copy:

- **Project URL** — `https://<ref>.supabase.co` → `SUPABASE_URL`
- **service_role key** → `SUPABASE_SERVICE_ROLE_KEY`

> The service-role key bypasses Row Level Security and can read and write
> everything. It is a server-side secret. It never goes into a
> `NEXT_PUBLIC_` variable, never into the browser bundle, and never into the
> repository.

### A7. Prepare the database connection string

Keep the pooled connection string from A2. That is `DATABASE_URL`.

---

## PHASE B — APPLICATION PREPARATION

### B1. Install and check the application

```bash
npm ci
npm run lint
npm run typecheck
npm test          # needs a PostgreSQL server; see "Running the tests" below
npm run build
```

### B2. Configure the environment locally

```bash
cp .env.example .env
```

Fill in `DATABASE_URL`, `SESSION_SECRET` (32+ random characters) and
`SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY`.

### B3. Verify the migrations and the seed

```bash
DATABASE_URL="postgresql://…" npm run migrate
DATABASE_URL="postgresql://…" npm run seed
```

The seed only inserts what is missing. Anything Winnie has already edited in
the admin panel is left untouched, so it is safe to run again.

### B4. Create the first administrator

```bash
DATABASE_URL="postgresql://…" SESSION_SECRET="…" \
  ADMIN_EMAIL="winnie@example.com" \
  ADMIN_PASSWORD="a-strong-password-of-at-least-12-characters" \
  npm run setup-admin
```

There is no default account and no public registration. The script refuses to
create a second administrator unless you ask for a reset with
`RESET_ADMIN=1`.

---

## PHASE C — GIT

```bash
git status            # the tree should be clean
git log --oneline -5  # the commits you want to deploy
```

Push only when you are ready:

```bash
git push origin main
```

Nothing is pushed automatically by this guide.

---

## PHASE D — RENDER

### D1. Create the web service

1. Sign in at <https://render.com> and choose **New → Web Service**.
2. Connect the repository and pick the branch you want to deploy.
   - Or use the Blueprint: put `render.yaml` in the repository root and run
     `render blueprint launch` from the Render dashboard.

### D2. The commands

| Setting | Value |
|---|---|
| Build command | `npm ci && npm run build` |
| Start command | `npm run start` |
| Node version | `22.16.0` (or any 22.x) |
| Health check path | `/api/health` |

`next start` listens on `PORT`, which Render sets for you. The application is
not a static export: it needs the server for the admin panel, the API and the
database.

### D3. The environment variables

Set these in **Render → the service → Environment**. Keep the service role key
server-side — Render stores environment variables encrypted and only exposes
the `NEXT_PUBLIC_` ones to the browser.

| Variable | Value | Notes |
|---|---|---|
| `NODE_ENV` | `production` | Render sets this already |
| `NODE_VERSION` | `22.16.0` | |
| `NEXT_PUBLIC_SITE_URL` | `https://<your-service>.onrender.com` | Used for the sitemap and the social metadata |
| `NEXT_PUBLIC_SITE_NAME` | `Winnie Awuor Otieno — Accounting & Tax` | |
| `DATABASE_URL` | the pooled Supabase connection string | From A2/A7 |
| `DATABASE_POOL_SIZE` | `5` | |
| `SESSION_SECRET` | 32+ random characters | `openssl rand -base64 48` |
| `SESSION_MAX_AGE` | `604800` | 7 days |
| `ADMIN_SETUP_TOKEN` | a one-time random string | Only used by the one-time setup endpoint |
| `SUPABASE_URL` | `https://<ref>.supabase.co` | |
| `SUPABASE_SERVICE_ROLE_KEY` | the service-role key | Server-side only |
| `SUPABASE_PUBLIC_BUCKET` | `portfolio-public` | |
| `SUPABASE_PRIVATE_BUCKET` | `portfolio-private` | |
| `CONTACT_EMAIL` | the address inquiries go to | Optional |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` | the mail server | Optional; without it inquiries are stored but not emailed |

### D4. Deploy

Press **Create Web Service**. Watch the build log: the health check must
return `{"status":"ok"}` before Render marks the service live.

> The first request after a deploy can be slow while the database pool opens.
> The health check retries.

---

## PHASE E — INITIALIZATION

Run these once, from a machine that can reach the database (your laptop is
fine). They are **not** run at application start-up, so a deploy can never
change the schema behind your back.

```bash
# 1. Apply any migrations the deployed version needs
DATABASE_URL="postgresql://…" npm run migrate

# 2. Seed the public content (only if the database is empty)
DATABASE_URL="postgresql://…" npm run seed

# 3. Create the first administrator
DATABASE_URL="postgresql://…" SESSION_SECRET="…" \
  ADMIN_EMAIL="winnie@example.com" \
  ADMIN_PASSWORD="…" \
  npm run setup-admin
```

After the administrator exists, the one-time setup endpoint
(`/api/admin/setup`) refuses every request.

---

## PHASE F — VERIFICATION

1. Open `https://<your-service>.onrender.com`. The hero, the sections and the
   footer render.
2. Open `https://<your-service>.onrender.com/api/health`. It answers
   `{"status":"ok","database":"postgresql","storage":"supabase", …}`.
3. Sign in at `/admin/login`.
4. **Profile** — edit the biography and save; reload the public page and the
   change is there.
5. **Profile picture** — upload a JPEG. Check that the picture appears in the
   navigation, and that the file is in the `portfolio-public` bucket in the
   Supabase dashboard (Storage → `portfolio-public`).
6. **Media library** — upload the CV. It lands in the private bucket. Select
   it as the public CV and check it moves to `portfolio-public` and appears
   in the footer's download link.
7. **Insights** — write an article, publish it, and check it appears on the
   public site. Unpublish it and check that it is no longer reachable (the URL
   returns 404, not a draft).
8. **Contact form** — send a message from the public contact form. It appears
   under **Inquiries** in the admin panel, and it is not readable through any
   public API.
9. **Verify the records** — in the Supabase SQL editor:
   ```sql
   select count(*) from experience;
   select count(*) from education;
   select count(*) from media;
   select count(*) from contact_inquiries;
   select id, email from admins;
   ```
10. **Redeploy and re-check** — trigger a new deploy, then confirm the
    picture, the CV and the articles are still there and the uploaded files
    are still in Supabase Storage. Nothing should have been lost: the
    database and the uploads are both outside Render.

---

## Moving the existing site (SQLite) to Supabase

If the portfolio is already running with the SQLite database and files on
disk, move them in this order. **The SQLite file is never deleted.**

### 1. Back up the SQLite database

```bash
mkdir -p backups
cp data/app.db "backups/app.db-$(date +%F).sqlite"
cp -r data/uploads "backups/uploads-$(date +%F)"
```

### 2. Create the PostgreSQL schema

```bash
DATABASE_URL="postgresql://…" npm run migrate
```

### 3. Copy the records

```bash
DATABASE_URL="postgresql://…" npm run migrate:from-sqlite
```

It copies every table, keeps the identifiers and the relationships, and then
prints a verification: the record counts of each table and a check that every
reference points at a copied row. It refuses to touch a database that already
holds content unless `MIGRATION_FORCE=1` is set.

### 4. Move the files to Supabase Storage

```bash
DATABASE_URL="postgresql://…" \
SUPABASE_URL="…" SUPABASE_SERVICE_ROLE_KEY="…" \
npm run migrate:media
```

The profile photograph, the published CV and the article covers go to the
public bucket; everything else stays private. The files on disk are left in
place so the move can be repeated.

### 5. Seed what is missing

```bash
DATABASE_URL="postgresql://…" npm run seed
```

### 6. Point the application at the new database and check it

```bash
DATABASE_URL="postgresql://…" npm run dev
```

Open the site, sign in, and check that the profile, the experience, the
education, the picture and the CV are all there.

---

## Running the tests

The suite needs a real PostgreSQL server, because the application speaks
PostgreSQL SQL and the behaviour of the queries has to be the same in the
tests as in production.

```bash
npm test
```

- With Docker installed, a PostgreSQL 16 container is started for the run and
  stopped again at the end.
- To use a database you already have, set `TEST_DATABASE_URL`:

  ```bash
  TEST_DATABASE_URL="postgresql://postgres:password@localhost:5432/postgres?sslmode=disable" npm test
  ```

Each test file gets a database of its own, created and migrated by the test
setup, so the tests never touch development or production data.

---

## Troubleshooting

### `the database could not be reached`

- The address is wrong: use the **pooler** address
  (`aws-0-<region>.pooler.supabase.com:6543`), not `db.<ref>.supabase.co`.
- `sslmode=require` is missing from the connection string.
- The password was rotated in the Supabase dashboard: update `DATABASE_URL`.
- The Supabase project is paused: free projects pause after a week of
  inactivity. Resume it, or move to a paid plan.

### `the database could not be reached (…ECONNREFUSED)`

The connection is being made over IPv6. Supabase's direct connection is
IPv6-only; Render is IPv4. Switch to the pooler.

### `relation "profile_settings" does not exist`

The migrations have not been applied. Run `npm run migrate` with the production
`DATABASE_URL`.

### `too many connections`

Lower `DATABASE_POOL_SIZE` (5 is plenty) and make sure the pooler is being
used. The pooler queues connections instead of refusing them.

### `Supabase Storage is not configured`

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are not both set. The
application falls back to the local filesystem, which is fine for
development but loses uploads on redeploy.

### Uploads disappear after a redeploy

The application is writing to `MEDIA_DIR` on Render's disk, which is
ephemeral. Set the Supabase variables so the storage driver becomes
`supabase`; check with `/api/health`, which reports the driver in use.

### `the stored copy of this password cannot be opened`

`SESSION_SECRET` changed. The sealed password cannot be decrypted with the new
secret. Set a new password from the admin panel, or reset it on the server
with `RESET_ADMIN=1 … npm run setup-admin`.

### `Too many login attempts`

The rate limit is five attempts per fifteen minutes per address. Wait, or
raise `LOGIN_RATE_LIMIT` for the first sign-in after a deploy.

### The administrator panel redirects to the sign-in page in a loop

The session cookie is not being kept. Check that the site is served over
HTTPS (Render does this) and that `SESSION_SECRET` is the same value on every
instance.

### A picture or a document is missing

Check the Supabase dashboard: Storage → the bucket → the file. If the file is
there but the site shows a broken image, the media row in PostgreSQL may point
at the old key. `npm run migrate:media` fixes the keys.

### The build fails on a native module

`better-sqlite3` is only needed by the SQLite migration scripts. It is built
during `npm ci`. Render's Node images include the toolchain; if your plan
does not, build the image in a Docker step instead, or move
`better-sqlite3` to `devDependencies` and run the migration from your own
machine.
