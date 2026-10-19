# Winnie Awuor Otieno — Professional Accounting Portfolio

A production-ready portfolio website and secure administrative content management
system for Winnie Awuor Otieno, an accounting, audit and tax professional based in
Kisumu, Kenya.

## Architecture

- **Frontend:** React 19 + Next.js 16 (App Router), server-rendered public pages,
  Tailwind CSS.
- **Backend:** Next.js route handlers (Node.js runtime) over SQLite
  (`better-sqlite3`). Same process serves the public site and the admin API.
- **Database:** SQLite file (`data/app.db` by default). WAL mode.
- **Media storage:** Local filesystem (`data/uploads` by default) or an S3-compatible
  bucket when `S3_*` environment variables are provided. Credentials stay on the
  server only.
- **Authentication:** Cookie-based sessions (`better-sqlite3` sessions table),
  bcrypt password hashing (cost 12), CSRF double-submit protection, login rate
  limiting, `HttpOnly`/`SameSite`/`Secure` session cookies.
- **Tests:** Vitest (unit + integration against a running dev server).

## Content source

All professional content (profile, experience, education, expertise) is drawn from
Winnie Awuor Otieno's supplied CV and is editable through the admin panel. No
qualifications, employers, clients, or financial figures are invented. The Certified
Public Accountant qualification is clearly marked as ongoing.

## Design

The public design follows the `taste-skill` "Type and nothing else" direction
(seed 594339630, sector finance), adapted with a restrained accounting palette
(warm stone ground, deep charcoal ink, forest green accent). The dealt bubblegum/lime
colour scheme was redrawn because it conflicts with the accounting subject. The
admin panel follows the `taste-skill` app-screen rules (quiet chrome, colour on data
only, flat surfaces, honest empty states).

## Prerequisites

- Node.js 22+
- npm
- Google Chrome/Chromium (only required to run the `taste-skill` design inspector,
  not to run the site)

## Installation

```bash
cd /home/victorouma7/myprojects/winnies-portfolio
npm install
```

## Configuration

Copy `.env.example` to `.env` and fill in the values. Secrets must never be
committed to version control.

```bash
cp .env.example .env
```

Key variables:

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | Public URL of the deployed site (used for sitemap) |
| `NEXT_PUBLIC_SITE_NAME` | Site name shown in metadata |
| `MEDIA_DIR` | Local upload directory (default `data/uploads`) |
| `MEDIA_BASE_URL` | URL path for media (default `/api/media`) |
| `SESSION_SECRET` | At least 32 random characters; signs/encrypts sessions |
| `SESSION_MAX_AGE` | Session lifetime in seconds (default 604800 = 7 days) |
| `ADMIN_SETUP_TOKEN` | Token guarding the one-time HTTP admin setup endpoint |
| `S3_ENDPOINT`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_REGION` | Optional: S3-compatible production media storage |
| `S3_PUBLIC_BASE_URL` | Public base URL for S3 assets |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` | Optional: email notifications for contact inquiries |
| `CONTACT_EMAIL` | Email address contact inquiries are forwarded to (optional) |

## Database setup

Run the migrations:

```bash
npm run migrate
```

This creates `data/app.db` and all tables. It is idempotent and safe to re-run.

## Create the first administrator

There is no default administrator account and no known credentials are ever seeded.
Create the first administrator through the protected setup process:

**Option A — setup script (recommended for direct server access):**

```bash
DATABASE_URL="data/app.db" ADMIN_EMAIL="winnie@example.com" \
  ADMIN_PASSWORD="a-strong-password-at-least-10-chars" \
  node scripts/setup-admin.js
```

**Option B — HTTP setup endpoint (only when no administrator exists yet):**

```bash
curl -X POST http://localhost:3000/api/admin/setup \
  -H "Content-Type: application/json" \
  -H "x-admin-setup-token: <ADMIN_SETUP_TOKEN>" \
  -d '{"email":"winnie@example.com","password":"a-strong-password-at-least-10-chars"}'
```

After the first administrator exists, the setup endpoint always rejects requests.

## Seed public content from the CV

```bash
npm run seed
```

This seeds profile, experience, education and expertise from Winnie's CV. It is safe
to re-run (it updates existing rows by unique key and never duplicates). It never
creates an administrator account and never publishes referee contact details.

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

Set the `DATABASE_URL`, `SESSION_SECRET` and other production variables in the
hosting environment before starting.

## Admin panel

- Sign in: `http://localhost:3000/admin/login`
- Dashboard: `http://localhost:3000/admin`
- Protected routes: `/admin/*` (except `/admin/login`)
- All admin writes are CSRF-protected and require a valid session.

From the admin panel Winnie can:

- Edit her public profile (name, title, biography, location, email, hero text)
- Upload/replace her profile photograph and downloadable CV
- Add, edit, reorder and remove employment entries
- Add, edit and remove education/qualification entries (ongoing vs completed)
- Add, edit and remove expertise areas
- Create, edit, publish, unpublish and delete insights/articles
- Upload, list, replace and delete media assets (images and PDFs)
- View and mark read contact inquiries

## Media storage

Uploads are stored persistently in `MEDIA_DIR` (`data/uploads` by default), which
survives application restarts and redeploys. Do not rely on a temporary directory.

For production object storage, set the `S3_*` variables. Uploads then go to an
S3-compatible bucket instead of the local filesystem. Storage credentials are read
only on the server and are never exposed to the browser.

## Upload a new CV

1. Sign in to `/admin/login`.
2. Go to Profile.
3. Upload the new PDF under "Downloadable CV".
4. Save. The public "Download CV" link (contact section) now serves the new file.
   Uploading a new CV does not automatically replace the public file until saved
   through the profile form.

## Contact form

Public visitors can send inquiries via `/api/contact-inquiries`. Inquiries are stored
in the database (protected from public access) and, when `SMTP_*` and `CONTACT_EMAIL`
are configured, forwarded by email. The form is rate-limited per IP and protected by
a honeypot field.

## Tests

Unit tests (auth, validation, storage, rate limiting) plus an integration test
against a running dev server:

```bash
npm test
```

The integration test targets `http://localhost:3000` and requires a freshly started
dev server (in-memory rate-limit counters reset on restart).

Run with a dev server:

```bash
DATABASE_URL="data/app.db" SESSION_SECRET="..." npm run dev
# in another terminal:
npm test
```

## Linting and type checks

```bash
npm run lint      # oxlint on src/
npx tsc --noEmit  # TypeScript check
npm run build     # production build
```

## Deployment

1. Set all production environment variables (see `Configuration`).
2. Run `npm run migrate` on the target database.
3. Create the first administrator (see `Create the first administrator`).
4. Run `npm run seed` to populate public content.
5. Build and start: `npm run build && npm run start`.
6. Configure persistent media storage (`MEDIA_DIR` on a persistent volume, or S3).

## Backups

- **Database:** copy `data/app.db` (and `-wal`/`-shm` if present) to a backup
  location, e.g. `cp data/app.db backups/app.db-$(date +%F).sqlite`.
- **Uploaded assets:** back up the `MEDIA_DIR` directory (`data/uploads` by default,
  or the S3 bucket).
- Restore by copying the database and assets back and restarting the application.

## Security notes

- No administrator account or credentials are seeded. The first administrator must be
  created explicitly.
- Passwords are hashed with bcrypt (cost 12); never stored plaintext.
- Session and CSRF secrets must be provided via environment variables, never
  committed.
- Uploads are validated by MIME-type magic bytes on the server; HTML, scripts and
  executables are rejected. Files are stored under unguessable names.
- Referenced assets cannot be deleted without explicit confirmation.
- Contact inquiries are never exposed through public APIs.
- No referee phone numbers, email addresses, or confidential client data are
  published.
