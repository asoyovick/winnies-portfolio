'use client';

import { useState } from 'react';
import type { ProfileSettings } from '@/lib/db';
import { parseJson } from '@/lib/validation';
import { Reveal } from './Reveal';

type FormValues = {
  name: string;
  email: string;
  subject: string;
  message: string;
};

type ContactProps = {
  profile: ProfileSettings | null;
  cvUrl: string | null;
};

const HELP_OPTIONS = [
  'Bookkeeping & reconciliation',
  'Management reporting',
  'Tax compliance & advisory',
  'Financial audit (with a tax focus)',
  'Not sure yet — help me define the scope',
];

/**
 * Let's begin.
 *
 * The enquiry form lives on the dark forest band that closes the page: the
 * invitation on the left, the form on the right. Enquiries are posted to the
 * contact-inquiries API exactly as before; the styling is all that changed.
 */
export default function Contact({ profile, cvUrl }: ContactProps) {
  const socialLinks: { label: string; url: string }[] = parseJson(
    profile?.social_links ?? null,
    [] as { label: string; url: string }[]
  );
  const [values, setValues] = useState<FormValues>({
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<'idle' | 'sending' | 'ok' | 'error'>('idle');
  const [serverMessage, setServerMessage] = useState('');

  const handleChange =
    (key: keyof FormValues) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      setValues({ ...values, [key]: e.target.value });
      if (errors[key]) setErrors({ ...errors, [key]: '' });
    };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('sending');
    setErrors({});
    setServerMessage('');

    const nextErrors: Record<string, string> = {};
    if (!values.name.trim()) nextErrors.name = 'Please enter your name.';
    else if (values.name.trim().length < 2) nextErrors.name = 'Name must be at least 2 characters.';
    if (!values.email.trim()) nextErrors.email = 'Please enter your email address.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim()))
      nextErrors.email = 'Please enter a valid email address.';
    if (!values.message.trim()) nextErrors.message = 'Please enter a message.';
    else if (values.message.trim().length < 10)
      nextErrors.message = 'Message must be at least 10 characters.';
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      setStatus('idle');
      return;
    }

    try {
      const res = await fetch('/api/contact-inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      const json = await res.json();
      if (!res.ok) {
        setStatus('error');
        setServerMessage(json.error || 'Could not send your message. Try again.');
      } else {
        setStatus('ok');
        setValues({ name: '', email: '', subject: '', message: '' });
      }
    } catch {
      setStatus('error');
      setServerMessage('Could not send your message. Try again.');
    }
  };

  return (
    <section id="contact" className="w-section w-dark" aria-labelledby="contact-heading">
      <div className="w-wrap w-contact__grid">
        <Reveal>
          <div>
            <p className="w-eyebrow">
              <span className="w-num">10</span>
              <span>Let&apos;s begin</span>
            </p>
            <h2 id="contact-heading" className="w-head w-contact__head">
              Your next chapter,
              <br />
              <em>with a little more clarity.</em>
            </h2>
            <p className="w-contact__pitch">
              Tell me a little about your business and what&apos;s on your
              mind. We&apos;ll start with the questions, not the jargon.
            </p>

            <ul className="w-contact__channels">
              {profile?.public_email ? (
                <li className="w-contact__channel">
                  <span className="w-contact__channel-label">Email</span>
                  <a className="w-contact__channel-link" href={`mailto:${profile.public_email}`}>
                    {profile.public_email}
                  </a>
                </li>
              ) : null}
              {profile?.public_phone ? (
                <li className="w-contact__channel">
                  <span className="w-contact__channel-label">Telephone</span>
                  <a
                    className="w-contact__channel-link"
                    href={`tel:${profile.public_phone.replace(/\s+/g, '')}`}
                  >
                    {profile.public_phone}
                  </a>
                </li>
              ) : null}
              {profile?.location ? (
                <li className="w-contact__channel">
                  <span className="w-contact__channel-label">Practice base</span>
                  <span className="w-contact__channel-value">{profile.location}</span>
                </li>
              ) : null}
              {socialLinks.map((link, index) => (
                <li key={`${link.label}-${index}`} className="w-contact__channel">
                  <span className="w-contact__channel-label">{link.label}</span>
                  <a
                    href={link.url}
                    className="w-contact__channel-link"
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
              {cvUrl ? (
                <li className="w-contact__channel">
                  <span className="w-contact__channel-label">Curriculum vitae</span>
                  <a
                    className="w-contact__channel-link"
                    href={cvUrl}
                    download
                  >
                    Download CV (PDF)
                  </a>
                </li>
              ) : null}
            </ul>
          </div>
        </Reveal>

        <Reveal>
          <form className="w-form" onSubmit={handleSubmit} noValidate>
            <div className="w-form__row">
              <div className="w-field">
                <label htmlFor="contact-name">Your name *</label>
                <input
                  id="contact-name"
                  name="name"
                  placeholder="How should I call you?"
                  value={values.name}
                  onChange={handleChange('name')}
                  aria-invalid={Boolean(errors.name)}
                  aria-describedby={errors.name ? 'contact-name-error' : undefined}
                />
                {errors.name && (
                  <p id="contact-name-error" className="w-field__error" role="alert">
                    {errors.name}
                  </p>
                )}
              </div>
              <div className="w-field">
                <label htmlFor="contact-email">Email address *</label>
                <input
                  id="contact-email"
                  name="email"
                  type="email"
                  placeholder="you@business.com"
                  value={values.email}
                  onChange={handleChange('email')}
                  aria-invalid={Boolean(errors.email)}
                  aria-describedby={errors.email ? 'contact-email-error' : undefined}
                />
                {errors.email && (
                  <p id="contact-email-error" className="w-field__error" role="alert">
                    {errors.email}
                  </p>
                )}
              </div>
            </div>

            <div className="w-field">
              <label htmlFor="contact-subject">What would you like help with?</label>
              <input
                id="contact-subject"
                name="subject"
                list="contact-help-options"
                placeholder="Select an area of support"
                value={values.subject}
                onChange={handleChange('subject')}
              />
              <datalist id="contact-help-options">
                {HELP_OPTIONS.map((option) => (
                  <option key={option} value={option} />
                ))}
              </datalist>
            </div>

            <div className="w-field">
              <label htmlFor="contact-message">What&apos;s on your mind? *</label>
              <textarea
                id="contact-message"
                name="message"
                placeholder="Your business, your questions, or where you'd like to begin…"
                value={values.message}
                onChange={handleChange('message')}
                rows={5}
                aria-invalid={Boolean(errors.message)}
                aria-describedby={errors.message ? 'contact-message-error' : undefined}
              />
              {errors.message && (
                <p id="contact-message-error" className="w-field__error" role="alert">
                  {errors.message}
                </p>
              )}
            </div>

            <div className="w-field" hidden>
              <label htmlFor="contact-website">Website</label>
              <input id="contact-website" name="website" tabIndex={-1} autoComplete="off" />
            </div>

            <div className="w-form__foot">
              <button
                type="submit"
                className="w-btn w-btn--cream"
                disabled={status === 'sending'}
              >
                <span>{status === 'sending' ? 'Sending enquiry…' : 'Send an enquiry'}</span>
                <span className="w-btn__arrow" aria-hidden="true">
                  ↗
                </span>
              </button>
              <p className="w-form__hint">
                Please don&apos;t include confidential financial information in
                your first message.
              </p>
            </div>

            {status === 'ok' && (
              <p className="w-form__success" role="status">
                Thank you. Your enquiry has been received. I will be in touch
                shortly.
              </p>
            )}
            {status === 'error' && (
              <p className="w-field__error" role="alert">
                {serverMessage || 'Could not send your message. Try again.'}
              </p>
            )}
          </form>
        </Reveal>
      </div>
    </section>
  );
}
