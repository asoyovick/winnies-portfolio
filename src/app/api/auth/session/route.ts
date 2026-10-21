import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { authenticateRequest } from '@/lib/auth';

export const runtime = 'nodejs';

export async function GET() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('portfolio_session')?.value ?? null;
  const result = await authenticateRequest(sessionToken);

  if (!result.ok) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  return NextResponse.json({
    authenticated: true,
    admin: { id: result.admin.id, email: result.admin.email },
  });
}
