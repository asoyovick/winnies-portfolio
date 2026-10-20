# Winnie Awuor Otieno — Professional Accounting Portfolio

A production-ready portfolio website and secure administration panel for
Winnie Awuor Otieno, an accounting, audit and tax professional based in
Kisumu, Kenya.

The public site is a single editorial page with a full set of sections
(hero, about, Kisumu, expertise, experience, education, tools, insights,
contact) plus published insight articles. Everything Winnie publishes is
edited from the administration panel — no code changes are needed to update
the site.

## Architecture

- **Frontend:** React 19 + Next.js 16 (App Router), server-rendered public
  pages, Tailwind CSS v4 for the reset plus a hand-written token layer.
- **Backend:** Next.js route handlers (Node.js runtime) over SQLite
  (`better-sqlite3`). The same process serves the public site and the admin
  API.
- **Database:** SQLite file (`data/app.db` by default), WAL mode, schema in
  `data/migrations/*.sql`.
- **Media storage:** local filesystem (`data/uploads` by default) or an
  S3-compatible bucket when the `S3_*` variables are set. Credentials stay on
  the server only.
- **Authentication:** cookie-based sessions in the database, bcrypt password
  hashing (cost 12), CSRF double-submit protection, login rate limiting,
  `HttpOnly`/`SameSite`/`Secure` session cookies.
- **Route protection:** `src/proxy.ts` (the Next 16 name for middleware)
  redirects every `/admin/*` page to the sign-in page without a valid session.
- **Tests:** Vitest — unit tests plus an end-to-end suite that starts its own
  Next.js server with its own database.

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
field for the hero and the experience timeline. The admin panel follows the
`taste-skill` app-screen rules: quiet chrome, colour only on data and the one
primary action, flat surfaces, honest empty states, no emoji.

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
committed to version control.

```bash
cp .env.example .env
```

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | Public URL of the deployed site (used for the sitemap) |
| `NEXT_PUBLIC_SITE_NAME` | Site name shown in metadata |
| `DATABASE_URL` | Path to the SQLite file (default `data/app.db`) |
| `MEDIA_DIR` | Local upload directory (default `data/uploads`) |
| `MEDIA_BASE_URL` | URL path for media (default `/api/media`) |
| `SESSION_SECRET` | At least 32 random characters; signs the session cookies |
| `SESSION_MAX_AGE` | Session lifetime in seconds (default 604800 = 7 days) |
| `ADMIN_SETUP_TOKEN` | Token guarding the one-time HTTP admin setup endpoint |
| `LOGIN_RATE_LIMIT` / `LOGIN_RATE_WINDOW_MS` | Login attempts allowed per IP (default 5 per 15 minutes) |
| `S3_ENDPOINT`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_REGION` | Optional: S3-compatible production media storage |
| `S3_PUBLIC_BASE_URL` | Public base URL for S3 assets |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` | Optional: email notifications for contact inquiries |
| `CONTACT_EMAIL` | Email address contact inquiries are forwarded to (optional) |

## Database setup

```bash
npm run migrate
```

This creates `data/app.db` and all tables. It is idempotent and safe to
re-run.

## Create the first administrator

There is no default administrator account and no known credentials are ever
seeded. Create the first administrator through the protected setup process.

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

After the first administrator exists, the setup endpoint always rejects
requests.

## Seed public content from the CV

```bash
npm run seed
```

This seeds the profile, experience, education and expertise from Winnie's CV.
It is safe to re-run (it updates existing rows by unique key and never
duplicates). It never creates an administrator account and never publishes
referee contact details.

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

Set `DATABASE_URL`, `SESSION_SECRET` and the other production variables in the
hosting environment before starting.

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
- View her own password and change it

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

Uploads are stored persistently in `MEDIA_DIR` (`data/uploads` by default),
which survives application restarts and redeploys. Do not rely on a temporary
directory.

For production object storage, set the `S3_*` variables. Uploads then go to
an S3-compatible bucket instead of the local filesystem. Storage credentials
are read only on the server and are never exposed to the browser.

Uploads are validated by file signature, not by extension: JPEG, PNG, WebP
images and PDF documents up to 10 MB are accepted, and everything else —
scripts, HTML, executables, mislabelled files — is rejected. Stored files get
an unguessable name.

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

`npm test` starts its own Next.js server on a free port with its own database
and upload directory, so it runs on its own and never touches the development
data. It covers the public pages, login and logout, unauthorised access, CSRF,
draft privacy, script stripping in article bodies, upload validation,
reference-protected assets, entry deletion confirmations and the contact form.

## Design inspection

The `taste-skill` inspector measures the built page in a real browser:

```bash
node ~/taste-skill/skills/taste-skill/scripts/inspect.mjs http://localhost:3000/ --out .taste-skill/after
```

The final build reports 0 failures and one warning (no video), which is
defended: there is no honest clip of an accounting practice's work, and the
brief asks for motion used sparingly.

## Deployment

1. Set all production environment variables (see `Configuration`).
2. Run `npm run migrate` on the target database.
3. Create the first administrator (see `Create the first administrator`).
4. Run `npm run seed` to populate public content.
5. Build and start: `npm run build && npm run start`.
6. Configure persistent media storage (`MEDIA_DIR` on a persistent volume,
   or an S3 bucket).

## Backups

- **Database:** copy `data/app.db` (and `-wal`/`-shm` if present) to a backup
  location, e.g. `cp data/app.db backups/app.db-$(date +%F).sqlite`.
- **Uploaded assets:** back up the `MEDIA_DIR` directory (`data/uploads` by
  default, or the S3 bucket).
- Restore by copying the database and assets back and restarting the
  application.

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
