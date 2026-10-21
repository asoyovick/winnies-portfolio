import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { spawn, type ChildProcess } from 'child_process';
import { existsSync, mkdirSync, readdirSync, rmSync } from 'fs';
import { createServer } from 'node:net';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import { sealCredential } from '@/lib/credential-vault';
import { run } from '@/lib/db';

/**
 * End-to-end tests against a real Next.js server and a real PostgreSQL
 * database.
 *
 * The test file gets its own database (created and migrated by the test
 * setup) and starts its own server on a free port with that database, so it
 * never touches development or production data.
 */
const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..', '..');

const DATABASE_URL = process.env.DATABASE_URL as string;
const MEDIA_DIR = join(PROJECT_ROOT, 'data', 'test-uploads');

const ADMIN_EMAIL = 'admin@winnie-otieno.example';
const ADMIN_PASSWORD = 'WinnieSecurePass2026!';

let server: ChildProcess | null = null;
let BASE = '';

function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const probe = createServer();
    probe.unref();
    probe.on('error', reject);
    probe.listen(0, '127.0.0.1', () => {
      const address = probe.address();
      const port = typeof address === 'object' && address ? address.port : 0;
      probe.close(() => resolve(port));
    });
  });
}

async function waitForReady(timeoutMs = 120000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`${BASE}/api/profile`);
      if (res.status === 200) return;
    } catch {
      // the server is not up yet
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  throw new Error(`Server did not become ready at ${BASE}`);
}

/**
 * Reads one cookie from a response. A response can set several cookies, and
 * they arrive joined in a single header, so each set-cookie header is checked
 * on its own.
 */
function cookieValue(response: Response, name: string): string | null {
  const headers =
    typeof response.headers.getSetCookie === 'function'
      ? response.headers.getSetCookie()
      : [response.headers.get('set-cookie') ?? ''];
  for (const header of headers) {
    const part = header
      .split(';')
      .map((p) => p.trim())
      .find((p) => p.startsWith(`${name}=`));
    if (part) return part.slice(name.length + 1);
  }
  return null;
}

beforeAll(async () => {
  if (!DATABASE_URL) {
    throw new Error('The test setup did not provide a database.');
  }

  // The administrator the tests sign in with.
  await run('DELETE FROM sessions');
  await run('DELETE FROM admins');
  await run(
    `INSERT INTO admins (email, password_hash, password_ciphertext, password_updated_at, created_at, updated_at)
     VALUES ($1, $2, $3, now(), now(), now())`,
    [
      ADMIN_EMAIL,
      await bcrypt.hash(ADMIN_PASSWORD, 12),
      sealCredential(ADMIN_PASSWORD),
    ]
  );

  if (existsSync(MEDIA_DIR)) rmSync(MEDIA_DIR, { recursive: true });
  mkdirSync(MEDIA_DIR, { recursive: true });

  const port = await freePort();
  BASE = `http://127.0.0.1:${port}`;

  server = spawn(
    process.execPath,
    [
      join(PROJECT_ROOT, 'node_modules', 'next', 'dist', 'bin', 'next'),
      'dev',
      '--port',
      String(port),
    ],
    {
      cwd: PROJECT_ROOT,
      env: {
        ...process.env,
        DATABASE_URL,
        // The same secret the test process uses, so the sealed credential can
        // be opened by the server under test.
        SESSION_SECRET: process.env.SESSION_SECRET,
        MEDIA_DIR,
        MEDIA_BASE_URL: '/api/media',
        NEXT_DIST_DIR: '.next-test',
        LOGIN_RATE_LIMIT: '50',
        NEXT_TELEMETRY_DISABLED: '1',
      },
      stdio: 'ignore',
    }
  );

  await waitForReady();
}, 180000);

afterAll(async () => {
  if (server) {
    server.kill('SIGTERM');
    await new Promise((r) => setTimeout(r, 500));
    if (!server.killed) server.kill('SIGKILL');
  }
  if (existsSync(MEDIA_DIR)) rmSync(MEDIA_DIR, { recursive: true });
});

async function login(): Promise<{ session: string; csrf: string }> {
  const csrfRes = await fetch(`${BASE}/api/auth/csrf`);
  const csrf = cookieValue(csrfRes, 'portfolio_csrf') ?? '';
  const loginRes = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: `portfolio_csrf=${csrf}`,
      'X-CSRF-Token': csrf,
    },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  });
  if (!loginRes.ok) {
    throw new Error(`Login failed with ${loginRes.status}`);
  }
  const session = cookieValue(loginRes, 'portfolio_session') ?? '';
  const sessionCsrf = cookieValue(loginRes, 'portfolio_csrf') ?? csrf;
  return { session, csrf: sessionCsrf };
}

function authHeaders(session: string, csrf: string) {
  return {
    'Content-Type': 'application/json',
    Cookie: `portfolio_session=${session}; portfolio_csrf=${csrf}`,
    'X-CSRF-Token': csrf,
  };
}

/** Sign in with a given password and return the raw response. */
async function loginWithPassword(password: string): Promise<Response> {
  const csrfRes = await fetch(`${BASE}/api/auth/csrf`);
  const csrf = cookieValue(csrfRes, 'portfolio_csrf') ?? '';
  return fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: `portfolio_csrf=${csrf}`,
      'X-CSRF-Token': csrf,
    },
    body: JSON.stringify({ email: ADMIN_EMAIL, password }),
  });
}

describe('portfolio API integration', () => {
  it('serves the public profile from the database', async () => {
    const res = await fetch(`${BASE}/api/profile`);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.display_name).toBe('Winnie Awuor Otieno');
    expect(json.professional_title).toBe('Accounting, Audit & Tax Professional');
    expect(json.hero_heading).toContain('Clear thinking.');
  });

  it('serves the public home page with the portfolio sections', async () => {
    const res = await fetch(`${BASE}/`);
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('Clear thinking.');
    expect(html).toContain('Experience');
    expect(html).toContain('Education');
    expect(html).toContain('Contact');
  });

  it('rejects a login with invalid credentials', async () => {
    const res = await loginWithPassword('wrong-password');
    expect(res.status).toBe(401);
  });

  it('logs in, reads the session and logs out', async () => {
    const { session } = await login();

    const sessionRes = await fetch(`${BASE}/api/auth/session`, {
      headers: { Cookie: `portfolio_session=${session}` },
    });
    expect(sessionRes.status).toBe(200);
    const sessionJson = await sessionRes.json();
    expect(sessionJson.authenticated).toBe(true);
    expect(sessionJson.admin.email).toBe(ADMIN_EMAIL);

    const logoutRes = await fetch(`${BASE}/api/auth/logout`, {
      method: 'POST',
      headers: { Cookie: `portfolio_session=${session}` },
    });
    expect(logoutRes.status).toBe(200);

    const afterRes = await fetch(`${BASE}/api/auth/session`, {
      headers: { Cookie: `portfolio_session=${session}` },
    });
    expect(afterRes.status).toBe(401);
  });

  it('protects the admin pages and the admin APIs', async () => {
    const page = await fetch(`${BASE}/admin`, { redirect: 'manual' });
    expect(page.status).toBe(307);

    const profile = await fetch(`${BASE}/api/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ display_name: 'Hacked' }),
    });
    expect(profile.status).toBe(401);

    const upload = await fetch(`${BASE}/api/media`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
    expect(upload.status).toBe(401);
  });

  it('rejects a write without a CSRF token', async () => {
    const { session } = await login();
    const res = await fetch(`${BASE}/api/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `portfolio_session=${session}`,
      },
      body: JSON.stringify({ display_name: 'Hacked' }),
    });
    expect(res.status).toBe(403);
  });

  it('updates the profile and shows it on the public site', async () => {
    const { session, csrf } = await login();
    const res = await fetch(`${BASE}/api/profile`, {
      method: 'PUT',
      headers: authHeaders(session, csrf),
      body: JSON.stringify({
        professional_title: 'Accounting, Audit & Tax Professional',
        public_email: 'winnie@example.com',
        hero_heading: 'Clear thinking.\nConfident decisions.',
      }),
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.public_email).toBe('winnie@example.com');

    const html = await fetch(`${BASE}/`).then((r) => r.text());
    expect(html).toContain('winnie@example.com');
  });

  it('creates, publishes and removes an insight', async () => {
    const { session, csrf } = await login();

    const create = await fetch(`${BASE}/api/articles`, {
      method: 'POST',
      headers: authHeaders(session, csrf),
      body: JSON.stringify({
        title: 'Reading a reconciliation',
        summary: 'A short note.',
        body: '<p>Start with the bank.</p>',
        status: 'draft',
      }),
    });
    expect(create.status).toBe(201);
    const article = await create.json();
    expect(article.status).toBe('draft');

    // A draft is private.
    const draftPage = await fetch(`${BASE}/insights/${article.slug}`);
    expect(draftPage.status).toBe(404);

    const publish = await fetch(`${BASE}/api/articles`, {
      method: 'PUT',
      headers: authHeaders(session, csrf),
      body: JSON.stringify({ id: article.id, status: 'published' }),
    });
    expect(publish.status).toBe(200);

    const livePage = await fetch(`${BASE}/insights/${article.slug}`);
    expect(livePage.status).toBe(200);
    const html = await livePage.text();
    expect(html).toContain('Start with the bank.');

    // Scripts are stripped from the body before it is rendered.
    const unsafe = await fetch(`${BASE}/api/articles`, {
      method: 'POST',
      headers: authHeaders(session, csrf),
      body: JSON.stringify({
        title: 'Unsafe body',
        body: '<p>Safe</p><script>alert(1)</script>',
        status: 'published',
      }),
    });
    const unsafeArticle = await unsafe.json();
    const unsafeHtml = await fetch(`${BASE}/insights/${unsafeArticle.slug}`).then((r) =>
      r.text()
    );
    expect(unsafeHtml).toContain('Safe');
    expect(unsafeHtml).not.toContain('alert(1)');

    const remove = await fetch(`${BASE}/api/articles?id=${article.id}&confirm=delete`, {
      method: 'DELETE',
      headers: authHeaders(session, csrf),
    });
    expect(remove.status).toBe(200);
  });

  it('requires confirmation before deleting an entry', async () => {
    const { session, csrf } = await login();
    const create = await fetch(`${BASE}/api/experience`, {
      method: 'POST',
      headers: authHeaders(session, csrf),
      body: JSON.stringify({
        position: 'Test Role',
        organization: 'Test Organisation',
        start_date: '2024-01-01',
        responsibilities: ['A duty'],
        achievements: ['A result'],
      }),
    });
    expect(create.status).toBe(201);
    const entry = await create.json();
    expect(entry.achievements).toEqual(['A result']);
    expect(entry.is_current).toBe(false);

    const unconfirmed = await fetch(`${BASE}/api/experience?id=${entry.id}`, {
      method: 'DELETE',
      headers: authHeaders(session, csrf),
    });
    expect(unconfirmed.status).toBe(400);

    const confirmed = await fetch(`${BASE}/api/experience?id=${entry.id}&confirm=delete`, {
      method: 'DELETE',
      headers: authHeaders(session, csrf),
    });
    expect(confirmed.status).toBe(200);
  });

  it('uploads, replaces and removes the profile picture', async () => {
    const { session, csrf } = await login();
    const headers = authHeaders(session, csrf);

    // A valid PNG.
    const png = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
      'base64'
    );

    const uploadForm = new FormData();
    uploadForm.append(
      'file',
      new Blob([png], { type: 'image/png' }),
      'winnie.png'
    );

    const uploaded = await fetch(`${BASE}/api/profile/picture`, {
      method: 'POST',
      headers: {
        Cookie: `portfolio_session=${session}; portfolio_csrf=${csrf}`,
        'X-CSRF-Token': csrf,
      },
      body: uploadForm,
    });
    expect(uploaded.status).toBe(200);
    const uploadedJson = await uploaded.json();
    expect(uploadedJson.asset.mime_type).toBe('image/png');
    expect(uploadedJson.profile.profile_image_id).toBe(uploadedJson.asset.id);

    // The file lives in the storage directory, not in the database.
    const stored = join(MEDIA_DIR, 'profile');
    const files = existsSync(stored) ? readdirSync(stored) : [];
    expect(files.length).toBe(1);
    expect(files[0]).toMatch(/\.png$/);

    // The database holds only the reference and the metadata.
    const profile = await fetch(`${BASE}/api/profile`, {
      headers: { Cookie: `portfolio_session=${session}` },
    }).then((r) => r.json());
    expect(profile.profile_image.public_url).toContain('/api/media/profile/');
    expect(JSON.stringify(profile)).not.toContain('base64');
    expect(JSON.stringify(profile)).not.toContain('data:image');

    // The public navigation shows it.
    const home = await fetch(`${BASE}/`).then((r) => r.text());
    expect(home).toContain('nav__picture');

    // The file is served.
    const served = await fetch(`${BASE}${profile.profile_image.public_url}`);
    expect(served.status).toBe(200);
    expect(served.headers.get('content-type')).toBe('image/png');

    // Replacing it leaves one file behind, not two.
    const secondForm = new FormData();
    secondForm.append(
      'file',
      new Blob([png], { type: 'image/png' }),
      'winnie-2.png'
    );
    const replaced = await fetch(`${BASE}/api/profile/picture`, {
      method: 'POST',
      headers: {
        Cookie: `portfolio_session=${session}; portfolio_csrf=${csrf}`,
        'X-CSRF-Token': csrf,
      },
      body: secondForm,
    });
    expect(replaced.status).toBe(200);
    expect(readdirSync(stored).length).toBe(1);

    // The new picture is the one on the public site, with no redeployment.
    const afterReplace = await fetch(`${BASE}/`).then((r) => r.text());
    const currentUrl = (
      await fetch(`${BASE}/api/profile`, {
        headers: { Cookie: `portfolio_session=${session}` },
      }).then((r) => r.json())
    ).profile_image.public_url;
    expect(afterReplace).toContain(encodeURIComponent(currentUrl));

    // Removing it clears the profile and deletes the file.
    const removed = await fetch(`${BASE}/api/profile/picture`, {
      method: 'DELETE',
      headers,
    });
    expect(removed.status).toBe(200);
    expect(readdirSync(stored).length).toBe(0);

    const afterRemove = await fetch(`${BASE}/api/profile`, {
      headers: { Cookie: `portfolio_session=${session}` },
    }).then((r) => r.json());
    expect(afterRemove.profile_image).toBeNull();
    expect(afterRemove.profile_image_id).toBeNull();

    // The navigation falls back to her initials.
    const homeAfter = await fetch(`${BASE}/`).then((r) => r.text());
    expect(homeAfter).toContain('nav__mark');
    expect(homeAfter).not.toContain('nav__picture');
  });

  it('refuses an unusable profile picture', async () => {
    const { session, csrf } = await login();

    // Not an image.
    const notAnImage = new FormData();
    notAnImage.append(
      'file',
      new Blob([Buffer.from('<html>not a picture</html>')], { type: 'image/png' }),
      'fake.png'
    );
    const rejected = await fetch(`${BASE}/api/profile/picture`, {
      method: 'POST',
      headers: {
        Cookie: `portfolio_session=${session}; portfolio_csrf=${csrf}`,
        'X-CSRF-Token': csrf,
      },
      body: notAnImage,
    });
    expect(rejected.status).toBe(400);

    // Too large.
    const tooBig = new FormData();
    tooBig.append(
      'file',
      new Blob([Buffer.alloc(6 * 1024 * 1024)], { type: 'image/png' }),
      'big.png'
    );
    const oversized = await fetch(`${BASE}/api/profile/picture`, {
      method: 'POST',
      headers: {
        Cookie: `portfolio_session=${session}; portfolio_csrf=${csrf}`,
        'X-CSRF-Token': csrf,
      },
      body: tooBig,
    });
    expect(oversized.status).toBe(400);

    // Signed out.
    const anonymous = await fetch(`${BASE}/api/profile/picture`, {
      method: 'POST',
      body: new FormData(),
    });
    expect(anonymous.status).toBe(401);

    // Nothing was stored by any of those attempts.
    const stored = join(MEDIA_DIR, 'profile');
    expect(existsSync(stored) ? readdirSync(stored).length : 0).toBe(0);
  });

  it('reveals and changes the administrator password', async () => {
    const { session, csrf } = await login();

    // The wrong current password is refused.
    const refused = await fetch(`${BASE}/api/admin/password`, {
      method: 'POST',
      headers: authHeaders(session, csrf),
      body: JSON.stringify({ action: 'reveal', current_password: 'not-the-password' }),
    });
    expect(refused.status).toBe(401);

    // The right one reveals the credential.
    const revealed = await fetch(`${BASE}/api/admin/password`, {
      method: 'POST',
      headers: authHeaders(session, csrf),
      body: JSON.stringify({ action: 'reveal', current_password: ADMIN_PASSWORD }),
    });
    expect(revealed.status).toBe(200);
    const revealedJson = await revealed.json();
    expect(revealedJson.password).toBe(ADMIN_PASSWORD);

    // A weak new password is refused.
    const weak = await fetch(`${BASE}/api/admin/password`, {
      method: 'POST',
      headers: authHeaders(session, csrf),
      body: JSON.stringify({
        action: 'change',
        current_password: ADMIN_PASSWORD,
        new_password: 'short1!',
      }),
    });
    expect(weak.status).toBe(400);

    // The password can be changed.
    const NEW_PASSWORD = 'WinniePortfolio2026!';
    const changed = await fetch(`${BASE}/api/admin/password`, {
      method: 'POST',
      headers: authHeaders(session, csrf),
      body: JSON.stringify({
        action: 'change',
        current_password: ADMIN_PASSWORD,
        new_password: NEW_PASSWORD,
      }),
    });
    expect(changed.status).toBe(200);
    const changedJson = await changed.json();
    expect(changedJson.password).toBe(NEW_PASSWORD);

    // The old password no longer signs in; the new one does.
    const oldLogin = await loginWithPassword(ADMIN_PASSWORD);
    expect(oldLogin.status).toBe(401);

    const newLogin = await loginWithPassword(NEW_PASSWORD);
    expect(newLogin.status).toBe(200);

    // The new password can be revealed with the new credential.
    const newSession = cookieValue(newLogin, 'portfolio_session') ?? '';
    const newCsrf = cookieValue(newLogin, 'portfolio_csrf') ?? '';
    const revealedAgain = await fetch(`${BASE}/api/admin/password`, {
      method: 'POST',
      headers: authHeaders(newSession, newCsrf),
      body: JSON.stringify({ action: 'reveal', current_password: NEW_PASSWORD }),
    });
    expect(revealedAgain.status).toBe(200);
    expect((await revealedAgain.json()).password).toBe(NEW_PASSWORD);

    // Put the original password back so the suite leaves no trace.
    await fetch(`${BASE}/api/admin/password`, {
      method: 'POST',
      headers: authHeaders(newSession, newCsrf),
      body: JSON.stringify({
        action: 'change',
        current_password: NEW_PASSWORD,
        new_password: ADMIN_PASSWORD,
      }),
    });
  });

  it('validates the contact form and stores the inquiry', async () => {
    const invalid = await fetch(`${BASE}/api/contact-inquiries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'x', email: 'not-an-email', message: 'short' }),
    });
    expect(invalid.status).toBe(400);
    const invalidJson = await invalid.json();
    expect(invalidJson.errors.email).toBeTruthy();
    expect(invalidJson.errors.message).toBeTruthy();

    const honeypot = await fetch(`${BASE}/api/contact-inquiries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Bot Name',
        email: 'bot@example.com',
        message: 'A message long enough to pass.',
        website: 'http://spam.example',
      }),
    });
    expect(honeypot.status).toBe(400);

    const valid = await fetch(`${BASE}/api/contact-inquiries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Grace Njeri',
        email: 'grace@example.com',
        subject: 'VAT return',
        message: 'I need help with our VAT return for the second quarter.',
      }),
    });
    expect(valid.status).toBe(200);

    // The inquiry is visible to the administrator and to nobody else.
    const { session } = await login();
    const inquiries = await fetch(`${BASE}/api/admin/inquiries`, {
      headers: { Cookie: `portfolio_session=${session}` },
    });
    expect(inquiries.status).toBe(200);
    const list = (await inquiries.json()) as { email: string }[];
    expect(list.some((item) => item.email === 'grace@example.com')).toBe(true);

    const anonymous = await fetch(`${BASE}/api/admin/inquiries`);
    expect(anonymous.status).toBe(401);
  });

  it('reports its health without exposing anything private', async () => {
    const res = await fetch(`${BASE}/api/health`);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe('ok');
    expect(json.database).toBe('postgresql');
    expect(JSON.stringify(json)).not.toContain('password');
    expect(JSON.stringify(json)).not.toContain(process.env.SESSION_SECRET ?? 'x');
  });
});
