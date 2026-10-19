import { NextResponse } from 'next/server';
import { rateLimit, rateLimitKey } from '@/lib/rate-limit';
import { validateContactForm } from '@/lib/validation';
import { db } from '@/lib/db';

export const runtime = 'nodejs';

const INQUIRY_LIMIT = { limit: 10, windowMs: 60 * 60 * 1000 }; // 10 per hour per IP

export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? undefined;
  const rl = rateLimit(rateLimitKey(ip, 'contact'), INQUIRY_LIMIT);
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many messages. Try again later.' }, { status: 429 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const errors = validateContactForm(body);
  if (Object.keys(errors).length > 0) {
    return NextResponse.json({ error: 'Please correct the form.', errors }, { status: 400 });
  }

  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO contact_inquiries (name, email, subject, message, is_read, created_at)
     VALUES (?, ?, ?, ?, 0, ?)`
  ).run(
    String(body.name).trim(),
    String(body.email).trim(),
    String(body.subject ?? '').trim(),
    String(body.message).trim(),
    now
  );

  // Optional email notification when SMTP is configured.
  const contactEmail = process.env.CONTACT_EMAIL;
  const smtpHost = process.env.SMTP_HOST;
  if (contactEmail && smtpHost) {
    // Best-effort: never fail the submission because email delivery failed.
    void import('@/lib/email').then((mod) => {
      if (mod.sendInquiryNotification) {
        mod.sendInquiryNotification({
          to: contactEmail,
          name: body.name,
          email: body.email,
          subject: body.subject,
          message: body.message,
        }).catch(() => {});
      }
    });
  }

  return NextResponse.json({
    ok: true,
    message: 'Thank you. Your message has been received.',
  });
}
