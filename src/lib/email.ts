/**
 * Optional email notification for new contact inquiries.
 *
 * Only used when SMTP_HOST and CONTACT_EMAIL are configured. Delivery failure
 * must never fail the contact submission.
 */
import nodemailer from 'nodemailer';

export interface InquiryNotification {
  to: string;
  name: string;
  email: string;
  subject: string;
  message: string;
}

export async function sendInquiryNotification(inquiry: InquiryNotification): Promise<void> {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) return;

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  await transporter.sendMail({
    from: `Portfolio <${user}>`,
    to: inquiry.to,
    subject: `New contact inquiry: ${inquiry.subject || '(no subject)'}`,
    text: `
From: ${inquiry.name} <${inquiry.email}>
Subject: ${inquiry.subject || '(no subject)'}

${inquiry.message}
    `.trim(),
  });
}
