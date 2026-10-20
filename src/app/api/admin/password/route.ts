import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import {
  comparePassword,
  getSessionByToken,
  hashPassword,
  requireAdmin,
  validateCsrfToken,
} from '@/lib/auth';
import { db } from '@/lib/db';
import { isStrongEnough, openCredential, sealCredential } from '@/lib/credential-vault';

export const runtime = 'nodejs';

/**
 * The administrator's own credential.
 *
 * `reveal` returns the password the account signed up with, after the
 * administrator proves they know it. `change` replaces it: the password is
 * re-hashed with bcrypt, the sealed copy is updated, and every other session
 * is signed out.
 */
export async function POST(request: Request) {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('portfolio_session')?.value ?? null;
  const admin = requireAdmin(sessionToken);
  if ('error' in admin) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  const csrfCookie = cookieStore.get('portfolio_csrf')?.value ?? null;
  const csrfHeader = request.headers.get('x-csrf-token') ?? null;
  if (!validateCsrfToken(csrfHeader, csrfCookie)) {
    return NextResponse.json({ error: 'Invalid CSRF token.' }, { status: 403 });
  }

  let body: { action?: string; current_password?: string; new_password?: string };
  try {
    body = (await request.json()) as {
      action?: string;
      current_password?: string;
      new_password?: string;
    };
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const currentPassword = String(body.current_password ?? '');
  if (!currentPassword) {
    return NextResponse.json(
      { error: 'Enter your current password to continue.' },
      { status: 400 }
    );
  }

  const valid = await comparePassword(currentPassword, admin.admin.password_hash);
  if (!valid) {
    return NextResponse.json(
      { error: 'That is not your current password.' },
      { status: 401 }
    );
  }

  if (body.action === 'reveal') {
    const row = db
      .prepare('SELECT password_ciphertext FROM admins WHERE id = ?')
      .get(admin.admin.id) as { password_ciphertext: string } | undefined;
    const password = openCredential(row?.password_ciphertext ?? '');
    if (!password) {
      return NextResponse.json(
        {
          error:
            'The stored copy of this password cannot be opened. Set a new password instead.',
        },
        { status: 409 }
      );
    }
    return NextResponse.json({ ok: true, password });
  }

  if (body.action !== 'change') {
    return NextResponse.json({ error: 'Unknown action.' }, { status: 400 });
  }

  const newPassword = String(body.new_password ?? '');
  if (!isStrongEnough(newPassword)) {
    return NextResponse.json(
      {
        error:
          'Use at least 12 characters with a mix of upper case, lower case, numbers and a symbol.',
      },
      { status: 400 }
    );
  }
  if (newPassword === currentPassword) {
    return NextResponse.json(
      { error: 'Choose a password you have not used before.' },
      { status: 400 }
    );
  }

  const passwordHash = await hashPassword(newPassword);
  const now = new Date().toISOString();
  db.prepare(
    'UPDATE admins SET password_hash = ?, password_ciphertext = ?, password_updated_at = ? WHERE id = ?'
  ).run(passwordHash, sealCredential(newPassword), now, admin.admin.id);

  // Sign out every other session; the one in use stays signed in.
  const current = sessionToken ? getSessionByToken(sessionToken) : null;
  if (current) {
    db.prepare('DELETE FROM sessions WHERE admin_id = ? AND id != ?').run(
      admin.admin.id,
      current.id
    );
  }

  return NextResponse.json({
    ok: true,
    password: newPassword,
    message: 'Your password has been changed.',
  });
}
