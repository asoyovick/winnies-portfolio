import { describe, it, expect } from 'vitest';
import { validateContactForm } from './validation';

describe('validateContactForm', () => {
  it('accepts a valid submission', () => {
    const errors = validateContactForm({
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      subject: 'Tax question',
      message: 'This is a genuine inquiry about tax services.',
    });
    expect(errors).toEqual({});
  });

  it('rejects empty fields', () => {
    const errors = validateContactForm({
      name: '',
      email: '',
      subject: '',
      message: '',
    });
    expect(errors.name).toBe('Please enter your name.');
    expect(errors.email).toBe('Please enter your email address.');
    expect(errors.message).toBe('Please enter a message.');
  });

  it('rejects an invalid email', () => {
    const errors = validateContactForm({
      name: 'Ada',
      email: 'not-an-email',
      subject: 'x',
      message: 'A genuine message of sufficient length here.',
    });
    expect(errors.email).toBe('Please enter a valid email address.');
  });

  it('triggers the honeypot for bot submissions', () => {
    const errors = validateContactForm({
      name: 'Ada',
      email: 'ada@example.com',
      subject: 'x',
      message: 'A genuine message of sufficient length here.',
      website: 'http://spam.example.com',
    });
    expect(errors.website).toBe('Invalid submission.');
  });

  it('rejects a too-short message', () => {
    const errors = validateContactForm({
      name: 'Ada',
      email: 'ada@example.com',
      subject: 'x',
      message: 'short',
    });
    expect(errors.message).toBe('Message must be at least 10 characters.');
  });
});
