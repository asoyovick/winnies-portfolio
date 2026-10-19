export type ContactFormValues = {
  name: string;
  email: string;
  subject: string;
  message: string;
  // Honeypot field: must be left empty by real users.
  website?: string;
};

export type ContactFormErrors = Partial<Record<keyof ContactFormValues, string>>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateContactForm(
  values: ContactFormValues
): ContactFormErrors {
  const errors: ContactFormErrors = {};

  // Honeypot: any value means a bot filled the form.
  if (values.website && values.website.trim().length > 0) {
    errors.website = 'Invalid submission.';
    return errors;
  }

  const name = String(values.name ?? '').trim();
  if (!name) {
    errors.name = 'Please enter your name.';
  } else if (name.length < 2) {
    errors.name = 'Name must be at least 2 characters.';
  } else if (name.length > 100) {
    errors.name = 'Name must be at most 100 characters.';
  }

  const email = String(values.email ?? '').trim();
  if (!email) {
    errors.email = 'Please enter your email address.';
  } else if (!EMAIL_RE.test(email)) {
    errors.email = 'Please enter a valid email address.';
  } else if (email.length > 200) {
    errors.email = 'Email address is too long.';
  }

  const subject = String(values.subject ?? '').trim();
  if (subject.length > 200) {
    errors.subject = 'Subject must be at most 200 characters.';
  }

  const message = String(values.message ?? '').trim();
  if (!message) {
    errors.message = 'Please enter a message.';
  } else if (message.length < 10) {
    errors.message = 'Message must be at least 10 characters.';
  } else if (message.length > 5000) {
    errors.message = 'Message must be at most 5,000 characters.';
  }

  return errors;
}

export type RequiredFields = Record<string, unknown>;

export function requireFields(
  data: unknown,
  fields: string[]
): { ok: true; data: Record<string, unknown> } | { ok: false; missing: string[] } {
  const record = data as Record<string, unknown>;
  const missing = fields.filter((f) => record[f] === undefined || record[f] === null || record[f] === '');
  if (missing.length > 0) {
    return { ok: false, missing };
  }
  return { ok: true, data: record };
}

export function slugify(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function parseJson<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}
