# Winnie Awuor Otieno — Professional Accounting Portfolio

A production-ready portfolio website and secure administration panel for
Winnie Awuor Otieno, an accounting, audit and tax professional based in
Kisumu, Kenya.

The public site is a single editorial page with a full set of sections
(hero, about, Kisumu, expertise, experience, education, tools, insights,
contact) plus published insight articles. Everything Winnie publishes is
edited from the administration panel — no code changes are needed to update
the site.

**Deployment:** Render runs the application, Supabase provides PostgreSQL and
object storage. The full guide is in **[DEPLOYMENT.md](DEPLOYMENT.md)**.

## Architecture

- **Frontend:** React 19 + Next.js 16 (App Router), server-rendered public
  pages, Tailwind CSS v4 for the reset plus a hand-written token layer.
- **Backend:** Next.js route handlers (Node.js runtime) over PostgreSQL.
  The same process serves the public site and the admin API.
- **Database:** Supabase PostgreSQL, reached through a pooled `pg` client.
  The schema and its migrations live in `db/migrations/`.
- **Media storage:** Supabase Storage in production (two buckets: a public
  one and a private one), the local filesystem in development, or any
  S3-compatible store. Files are never stored in the database.
- **Authentication:** cookie-based sessions in the database, bcrypt password
  hashing (cost 12), CSRF double-submit protection, login rate limiting kept
  in the database, `HttpOnly`/`SameSite`/`Secure` session cookies.
- **Route protection:** `src/proxy.ts` (the Next 16 name for middleware)
  redirects signed-out visitors away from `/admin/*`.
- **Tests:** Vitest — unit tests plus an end-to-end suite that starts its own
  Next.js server against a real PostgreSQL database.

## Content source

All professional content (profile, experience, education, expertise) comes
from Winnie Awuor Otieno's supplied CV and is editable from the admin panel.
No qualifications, employers, clients or financial figures are invented. The
Certified Public Accountant qualification is clearly marked as ongoing.

The photographs of Kisumu are real pictures from Wikimedia Commons, published
under CC BY-SA licences. They show the town the practice is based in, never
Winnie's premises. The credit for each one sits under the picture and in the
footer; the full list is in `assets/credits.json`.

## Design

The public design follows the `taste-skill` "Type and nothing else" direction
(seed 594339630, sector finance), with the palette redrawn for the subject:
a low-chroma stone ground, charcoal ink, a deep green accent and one dark
field for the hero and the experience timeline. On the dark hero ground the
accent switches to a muted gold (`--accent-bright`) so the one primary action
carries the colour. The admin panel follows the `taste-skill` app-screen
rules: quiet chrome, colour only on data and the one primary action, flat
surfaces, honest empty states, no emoji.

## The homepage hero

The hero is a full-bleed picture that fills the screen: the statement sits
over it at the top left, one primary action and a round arrow button follow,
and a band across the foot of the screen carries the tagline, Winnie's
position and the three main areas of work.

The picture is **Winnie's own photograph** as soon as she uploads one in
**Profile → Profile picture** — it is then used in the navigation and as the
background of the hero, positioned so she sits to the right of the statement.
Until then the hero uses a photograph of Kisumu, the town her practice is
based in, credited in the footer. No photograph of Winnie is invented, and no
unrelated stock photography is used.

House rules applied throughout: the headline never runs past two lines at any
width, one type family, one accent, no gradients, no decorative rules, no
stock imagery of calculators or handshakes, and motion that respects
`prefers-reduced-motion`.

## Prerequisites

- Node.js 22+
- npm
- Google Chrome/Chromium is only needed to run the `taste-skill` design
  inspector, not to run the site.

## Installation

```bash
cd /home/victorouma7/myprojects/winnies-portfolio
npm install
```

## Configuration

Copy `.env.example` to `.env` and fill in the values. Secrets must never be
committed to version control. The full list, with the values Render and
Supabase expect, is in [DEPLOYMENT.md](DEPLOYMENT.md).

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | Public URL of the deployed site (used for the sitemap) |
| `NEXT_PUBLIC_SITE_NAME` | Site name shown in metadata |
| `DATABASE_URL` | PostgreSQL connection string (use the Supabase **pooler**) |
| `DATABASE_POOL_SIZE` | Connections in the pool (default 5) |
| `SUPABASE_URL` | Supabase project URL, for Storage |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service-role key, server-side only |
| `SUPABASE_PUBLIC_BUCKET` / `SUPABASE_PRIVATE_BUCKET` | Bucket names (default `portfolio-public` / `portfolio-private`) |
| `MEDIA_DIR` | Local upload directory, used when Supabase is not configured |
| `MEDIA_BASE_URL` | URL path for media (default `/api/media`) |
| `SESSION_SECRET` | At least 32 random characters; signs the session cookies |
| `SESSION_MAX_AGE` | Session lifetime in seconds (default 604800 = 7 days) |
| `ADMIN_SETUP_TOKEN` | Token guarding the one-time HTTP admin setup endpoint |
| `LOGIN_RATE_LIMIT` / `LOGIN_RATE_WINDOW_MS` | Login attempts allowed per address |
| `S3_ENDPOINT`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_REGION` | Optional: S3-compatible storage instead of Supabase Storage |
| `S3_PUBLIC_BASE_URL` | Public base URL for S3 assets |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` | Optional: email notifications for contact inquiries |
| `CONTACT_EMAIL` | Email address contact inquiries are forwarded to (optional) |

## Database setup

```bash
DATABASE_URL="postgresql://…" npm run migrate
```

This applies every file in `db/migrations/` once, in order, and records what it
has applied in `schema_migrations`. It is idempotent and safe to re-run.

Migrations are never applied automatically when the application starts: run
them explicitly before deploying a release that depends on them.

## Create the first administrator

There is no default administrator account and no known credentials are ever
seeded. Create the first administrator through the protected setup process.

**Option A — setup script (recommended):**

```bash
DATABASE_URL="postgresql://…" SESSION_SECRET="…" \
  ADMIN_EMAIL="winnie@example.com" \
  ADMIN_PASSWORD="a-strong-password-of-at-least-12-characters" \
  npm run setup-admin
```

**Option B — HTTP setup endpoint (only when no administrator exists yet):**

```bash
curl -X POST http://localhost:3000/api/admin/setup \
  -H "Content-Type: application/json" \
  -H "x-admin-setup-token: <ADMIN_SETUP_TOKEN>" \
  -d '{"email":"winnie@example.com","password":"a-strong-password-of-at-least-12-characters"}'
```

After the first administrator exists, the setup endpoint always rejects
requests. A lost password is reset on the server with `RESET_ADMIN=1`.

## Seed public content from the CV

```bash
DATABASE_URL="postgresql://…" npm run seed
```

This seeds the profile, experience, education and expertise from Winnie's CV.
It is safe to re-run: **a row that already exists is left alone**, so anything
Winnie has edited in the admin panel is never overwritten. It never creates an
administrator account and never publishes referee contact details.

## Running the application

Development:

```bash
npm run dev       # http://localhost:3000
```

Production build:

```bash
npm run build
npm run start     # http://localhost:3000
```

`next start` listens on `PORT`, which is what Render sets. Set `DATABASE_URL`,
`SESSION_SECRET` and the Supabase variables in the hosting environment before
starting.

## Health check

`GET /api/health` reports whether the application can reach its database and
which storage driver is in use. It never exposes credentials, environment
variables, session data or contact inquiries. Render uses it as its health
check path.

## Admin panel

- Sign in: `http://localhost:3000/admin/login`
- Dashboard: `http://localhost:3000/admin`
- Protected routes: `/admin/*` (except `/admin/login`)

From the admin panel Winnie can:

- Edit her public profile: name, title, location, biography, hero heading,
  hero description, public email and phone, and professional links
- Upload and choose a profile photograph, and choose which uploaded PDF is
  the publicly downloadable CV
- Add, edit, reorder and remove employment entries, with responsibilities
  and verified achievements
- Add, edit, reorder and remove education and qualification entries, marking
  the ones still in progress
- Add, edit, reorder and remove areas of expertise, and choose which ones
  appear in the homepage summary
- Create, edit, preview, publish, unpublish and delete insights, with a
  cover image picked from the media library
- Upload, replace and delete media assets, with drag and drop, upload
  progress and a reference check before deletion
- Read, mark and delete contact inquiries
- View and change her own password
- Upload, replace and remove her profile picture, which appears in the
  navigation and behind the hero

Everything is saved to the database and appears on the public site
immediately: the public pages are rendered per request, not baked at build
time.

### Viewing and changing the administrator password

**Profile → Account and password** in the admin panel.

The password is never written to the database in plain text. It is hashed with
bcrypt for sign-in, and a second copy is *sealed* with AES-256-GCM under a key
derived from `SESSION_SECRET` — the same pattern a password manager uses for a
vault. That sealed copy is what the panel reads when you ask to see the
password, so:

- you have to confirm the current password before it is revealed;
- the database only ever holds ciphertext, and the key lives in the
  environment, not in the database;
- if `SESSION_SECRET` is ever rotated the sealed copy can no longer be opened —
  the panel says so and offers "set a new password" instead.

Changing the password re-hashes it, re-seals it, signs out every other session
and shows the new password once so it can be saved in a password manager.

If the password is lost and the panel cannot be used, reset it on the server:

```bash
RESET_ADMIN=1 ADMIN_EMAIL="winnie@example.com" ADMIN_PASSWORD="…" \
  node scripts/setup-admin.js
```

## Media storage

Uploads are stored in Supabase Storage in production and on the local
filesystem in development. The storage driver is chosen by configuration:
Supabase when `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set, S3 when
the `S3_*` variables are set, and the filesystem otherwise.

Two buckets are used:

| Bucket | Public | Holds |
|---|---|---|
| `portfolio-public` | yes | the profile photograph, hero images, published article covers, and the CV that has been published |
| `portfolio-private` | no | every other uploaded file; only ever handed to a signed-in administrator |

The buckets and their access policies are in `db/supabase/storage.sql`. The
service-role key stays on the server and never reaches the browser.

Uploads are validated by file signature, not by extension: JPEG, PNG, WebP
images and PDF documents are accepted (profile pictures up to 5 MB, other
uploads up to 10 MB), and everything else — scripts, HTML, executables,
mislabelled files — is rejected. Stored files get an unguessable name, and
the storage key is checked before anything is read, so a request can never
reach outside the storage directory.

### The profile picture

Winnie manages her picture in **Profile → Profile picture** in the admin
panel: upload a new one, pick one already in the media library, replace it, or
remove it. The picture is then shown in the navigation of the website (and as
the background of the hero), with her initials as the fallback when there is
no picture.

The image file itself is never put in the database. The database holds the
asset's metadata — name, storage key, type, size, upload time — and the
profile holds the reference to it. The address shown to visitors is always
the public path (`/api/media/profile/…`), never a path on the server.


## Contact form

Public visitors can send inquiries via `/api/contact-inquiries`. Inquiries are
stored in the database (protected from public access) and, when `SMTP_*` and
`CONTACT_EMAIL` are configured, forwarded by email. The form is validated on
the server, rate-limited per IP and protected by a honeypot field.

## Tests

```bash
npm test          # unit tests and the end-to-end suite
npm run lint      # ESLint
npm run typecheck # tsc --noEmit
npm run build     # production build
```

`npm test` starts its own PostgreSQL server: a Docker container is started for
the run (or `TEST_DATABASE_URL` is used if it is set), and every test file
gets a database of its own with the migrations applied. The suite then starts
its own Next.js server against that database, so it never touches development
or production data. It covers the public pages, login and logout,
unauthorised access, CSRF, draft privacy, article publishing, script
stripping in article bodies, upload validation, reference-protected assets,
the profile picture, the password change, rate limiting, the contact form and
the health check.

## Moving an existing site

The portfolio was first built on SQLite with files on disk. To move it to
Supabase:

```bash
cp data/app.db "backups/app.db-$(date +%F).sqlite"     # back it up first
DATABASE_URL="postgresql://…" npm run migrate
DATABASE_URL="postgresql://…" npm run migrate:from-sqlite   # the records
DATABASE_URL="postgresql://…" SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… \
  npm run migrate:media                                    # the files
```

Both scripts are repeatable and never delete the SQLite database or the files
on disk. The full procedure, with the verification steps, is in
[DEPLOYMENT.md](DEPLOYMENT.md).

## Design inspection

The `taste-skill` inspector measures the built page in a real browser:

```bash
node ~/taste-skill/skills/taste-skill/scripts/inspect.mjs http://localhost:3000/ --out .taste-skill/after
```

The final build reports 0 failures and one warning (no video), which is
defended: there is no honest clip of an accounting practice's work, and the
brief asks for motion used sparingly.

## Deployment

See **[DEPLOYMENT.md](DEPLOYMENT.md)** for the whole process: Supabase
(project, pooled connection, migrations, buckets, policies), the application
checks, Render (build and start commands, environment variables), the one-off
initialisation and the verification checklist.

`render.yaml` is a Blueprint that describes the web service, with no secret
value in it.

### Notes for a hosted deployment

- **The database and the uploads must live outside Render.** The database is
  Supabase PostgreSQL and the uploads are Supabase Storage. Render's own disk
  is ephemeral, so nothing that has to survive a redeploy may be written
  there.
- **Use the pooled connection string.** Render is IPv4; Supabase's direct
  connection address is IPv6-only.
- **The service-role key is server-side.** It is used to reach Storage, and it
  never reaches the browser.
- **Migrations are applied explicitly**, never at application start-up.
- **The route guard does not open the database.** `src/proxy.ts` runs in its
  own isolate, so it only checks for the presence of a session cookie. The real
  check happens in the admin layout and in every admin API route.
- `next start` listens on `PORT`, which is what platforms such as Render
  expect.

## Backups

- **Database:** `pg_dump` from the Supabase dashboard, or
  `pg_dump "$DATABASE_URL" > backup.sql`, into your own storage.
- **Uploaded assets:** the Supabase buckets, exported from the dashboard.
- The old SQLite database and its uploads folder are worth keeping until the
  new setup has been verified.

## Security notes

- No administrator account or credentials are seeded. The first administrator
  must be created explicitly.
- Passwords are hashed with bcrypt (cost 12); never stored plaintext. A sealed
  copy (AES-256-GCM, key derived from `SESSION_SECRET`) exists only so the
  administrator can view her own password, and it is never exposed without the
  current password.
- Session and CSRF secrets must be provided via environment variables, never
  committed.
- Uploads are validated by MIME-type magic bytes on the server; HTML, scripts
  and executables are rejected. Files are stored under unguessable names.
- Referenced assets cannot be deleted without explicit confirmation.
- Article bodies are sanitised on the server before they are rendered.
- Contact inquiries are never exposed through public APIs.
- No referee phone numbers, email addresses, or confidential client data are
  published.
- The database tables have row level security enabled, so the Supabase
  anon and authenticated keys cannot read them through the Supabase API; the
  application connects as the table owner.
- Private files are never served to a visitor: the media route checks the
  session before it hands over an asset that is not public.
