import { describe, it, expect, beforeAll } from 'vitest';

/**
 * Integration tests against a real running Next.js dev server.
 *
 * Start the server first (separate terminal or background):
 *   DATABASE_URL=data/app.db SESSION_SECRET=... npm run dev
 * with the database migrated and seeded (scripts/migrate.js, scripts/seed.js,
 * scripts/setup-admin.js).
 *
 * These tests verify end-to-end persistence: public content loads from the
 * database, login/logout works, and unauthenticated writes are rejected.
 */
const BASE = process.env.INTEGRATION_BASE_URL || 'http://localhost:3000';

const ADMIN_EMAIL = 'admin@winnie-otieno.example';
const ADMIN_PASSWORD = 'WinnieSecurePass2026!';

async function waitForReady(maxMs = 30000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    try {
      const res = await fetch(`${BASE}/api/profile`);
      if (res.status === 200) return;
    } catch {
      // not ready yet
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error(`Server did not become ready at ${BASE}`);
}

function cookieValue(setCookieHeader: string | null, name: string): string | null {
  if (!setCookieHeader) return null;
  const part = setCookieHeader
    .split(';')
    .map((p) => p.trim())
    .find((p) => p.startsWith(`${name}=`));
  return part ? part.slice(name.length + 1) : null;
}

describe('portfolio API integration', () => {
  beforeAll(async () => {
    await waitForReady();
  });

  it('serves public profile content from the database', async () => {
    const res = await fetch(`${BASE}/api/profile`);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.display_name).toBe('Winnie Awuor Otieno');
    expect(json.professional_title).toBe('Accounting, Audit & Tax Professional');
  });

  it('lists seeded experience entries', async () => {
    const res = await fetch(`${BASE}/api/experience`);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(Array.isArray(json)).toBe(true);
    expect(json.length).toBeGreaterThan(0);
    expect(json[0].organization).toBe('Ronalds LLP');
    // Reverse chronological: Ronalds LLP (current) first.
    expect(json[0].is_current).toBe(true);
  });

  it('lists seeded education with ongoing CPA flagged', async () => {
    const res = await fetch(`${BASE}/api/education`);
    expect(res.status).toBe(200);
    const json = await res.json();
    const cpa = json.find(
      (e: { qualification: string }) => e.qualification === 'Certified Public Accountant'
    );
    expect(cpa).toBeDefined();
    expect(cpa.status).toBe('ongoing');
  });

  it('lists expertise areas', async () => {
    const res = await fetch(`${BASE}/api/expertise`);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.some((e: { title: string }) => e.title === 'Tax compliance and planning')).toBe(true);
  });

  it('rejects login with invalid credentials', async () => {
    const csrfRes = await fetch(`${BASE}/api/auth/csrf`);
    const csrfCookie = cookieValue(csrfRes.headers.get('set-cookie'), 'portfolio_csrf');
    const res = await fetch(`${BASE}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `portfolio_csrf=${csrfCookie}`,
        'X-CSRF-Token': csrfCookie!,
      },
      body: JSON.stringify({ email: ADMIN_EMAIL, password: 'wrong-password' }),
    });
    expect(res.status).toBe(401);
  });

  it('logs in, reads session, and logs out', async () => {
    // Bootstrap CSRF cookie.
    const csrfRes = await fetch(`${BASE}/api/auth/csrf`);
    expect(csrfRes.status).toBe(200);
    const csrfCookie = cookieValue(csrfRes.headers.get('set-cookie'), 'portfolio_csrf');
    expect(csrfCookie).toBeDefined();

    const loginRes = await fetch(`${BASE}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `portfolio_csrf=${csrfCookie}`,
        'X-CSRF-Token': csrfCookie!,
      },
      body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
    });
    expect(loginRes.status).toBe(200);
    const sessionCookie = cookieValue(
      loginRes.headers.get('set-cookie'),
      'portfolio_session'
    );
    expect(sessionCookie).toBeDefined();

    const sessionRes = await fetch(`${BASE}/api/auth/session`, {
      headers: { Cookie: `portfolio_session=${sessionCookie}` },
    });
    expect(sessionRes.status).toBe(200);
    const sessionJson = await sessionRes.json();
    expect(sessionJson.authenticated).toBe(true);
    expect(sessionJson.admin.email).toBe(ADMIN_EMAIL);

    const logoutRes = await fetch(`${BASE}/api/auth/logout`, {
      method: 'POST',
      headers: { Cookie: `portfolio_session=${sessionCookie}` },
    });
    expect(logoutRes.status).toBe(200);

    const afterRes = await fetch(`${BASE}/api/auth/session`, {
      headers: { Cookie: `portfolio_session=${sessionCookie}` },
    });
    expect(afterRes.status).toBe(401);
  });

  it('rejects unauthenticated media upload', async () => {
    const res = await fetch(`${BASE}/api/media`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(401);
  });
});
