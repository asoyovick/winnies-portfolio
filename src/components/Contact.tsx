'use client';

import Image from 'next/image';
import { useState } from 'react';
import type { ProfileSettings } from '@/lib/db';
import { parseJson } from '@/lib/validation';

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
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
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

  const hasDetails = Boolean(profile?.public_email || profile?.public_phone);

  return (
    <section id="contact" className="section" aria-labelledby="contact-heading">
      <div className="wrap">
        <div className="contact__wrap">
          <div className="contact__columns">
            <div className="contact__form-card">
              <span className="section-badge">Consultation &amp; Inquiries</span>
              <h2 id="contact-heading" className="section__head">
                Contact
              </h2>
              <p className="contact__intro">
                Tell me what you need help with — a return to file, a reconciliation
                that will not balance, or an audit that needs a tax view.
              </p>
              <form onSubmit={handleSubmit} noValidate>
                <div className="field">
                  <label htmlFor="contact-name">Full name</label>
                  <input
                    id="contact-name"
                    name="name"
                    placeholder="e.g. Jane Doe"
                    value={values.name}
                    onChange={handleChange('name')}
                    aria-invalid={Boolean(errors.name)}
                    aria-describedby={errors.name ? 'contact-name-error' : undefined}
                  />
                  {errors.name && (
                    <p id="contact-name-error" className="field__error" role="alert">
                      {errors.name}
                    </p>
                  )}
                </div>
                <div className="field">
                  <label htmlFor="contact-email">Email address</label>
                  <input
                    id="contact-email"
                    name="email"
                    type="email"
                    placeholder="e.g. jane@organization.co.ke"
                    value={values.email}
                    onChange={handleChange('email')}
                    aria-invalid={Boolean(errors.email)}
                    aria-describedby={errors.email ? 'contact-email-error' : undefined}
                  />
                  {errors.email && (
                    <p id="contact-email-error" className="field__error" role="alert">
                      {errors.email}
                    </p>
                  )}
                </div>
                <div className="field">
                  <label htmlFor="contact-subject">Subject / Scope</label>
                  <input
                    id="contact-subject"
                    name="subject"
                    placeholder="e.g. KRA VAT compliance & advisory"
                    value={values.subject}
                    onChange={handleChange('subject')}
                  />
                </div>
                <div className="field">
                  <label htmlFor="contact-message">Message</label>
                  <textarea
                    id="contact-message"
                    name="message"
                    placeholder="Describe your accounting, audit or tax needs..."
                    value={values.message}
                    onChange={handleChange('message')}
                    rows={5}
                    aria-invalid={Boolean(errors.message)}
                    aria-describedby={errors.message ? 'contact-message-error' : undefined}
                  />
                  {errors.message && (
                    <p id="contact-message-error" className="field__error" role="alert">
                      {errors.message}
                    </p>
                  )}
                </div>
                <div className="field" hidden>
                  <label htmlFor="contact-website">Website</label>
                  <input id="contact-website" name="website" tabIndex={-1} autoComplete="off" />
                </div>
                <button type="submit" className="btn btn--primary btn--submit" disabled={status === 'sending'}>
                  {status === 'sending' ? 'Sending inquiry…' : 'Send message'}
                </button>
                {status === 'ok' && (
                  <p className="contact__success" role="status">
                    Thank you. Your message has been received. I will be in touch shortly.
                  </p>
                )}
                {status === 'error' && (
                  <p className="field__error" role="alert">
                    {serverMessage || 'Could not send your message. Try again.'}
                  </p>
                )}
              </form>
            </div>

            <div className="contact__details-col">
              <div className="contact__info-card">
                <figure className="contact__place">
                  <Image
                    src="/images/lake-victoria-dunga-hill.jpg"
                    alt="The sun setting over Lake Victoria, seen from Dunga Hill camp on the edge of Kisumu."
                    width={1920}
                    height={1080}
                    sizes="(max-width: 768px) 92vw, 32vw"
                    className="contact__place-image"
                  />
                  <figcaption className="place__caption">
                    Lake Victoria from Dunga Hill, Kisumu. Ggobanga, CC BY-SA 4.0.
                  </figcaption>
                </figure>

                <div className="contact__info-section">
                  <h3 className="contact__details-heading">Direct Channels</h3>
                  <ul className="contact__details">
                    {profile?.location ? (
                      <li className="contact__detail">
                        <span className="contact__detail-label">Practice Base</span>
                        <span className="contact__detail-value">{profile.location}</span>
                      </li>
                    ) : null}
                    {profile?.public_email ? (
                      <li className="contact__detail">
                        <span className="contact__detail-label">Email</span>
                        <a className="contact__detail-value contact__link-accent" href={`mailto:${profile.public_email}`}>
                          {profile.public_email}
                        </a>
                      </li>
                    ) : null}
                    {profile?.public_phone ? (
                      <li className="contact__detail">
                        <span className="contact__detail-label">Telephone</span>
                        <a
                          className="contact__detail-value contact__link-accent"
                          href={`tel:${profile.public_phone.replace(/\s+/g, '')}`}
                        >
                          {profile.public_phone}
                        </a>
                      </li>
                    ) : null}
                  </ul>
                  {!hasDetails ? (
                    <p className="contact__note">
                      Direct contact details shared upon mutual consultation.
                    </p>
                  ) : null}
                </div>

                {cvUrl ? (
                  <div className="contact__cv-section">
                    <h3 className="contact__details-heading">Curriculum Vitae</h3>
                    <a className="contact__download-btn" href={cvUrl} download>
                      <svg viewBox="0 0 20 20" fill="currentColor" className="contact__download-icon" aria-hidden="true">
                        <path d="M10.75 2.75a.75.75 0 0 0-1.5 0v8.614L6.295 8.235a.75.75 0 1 0-1.09 1.03l4.25 4.5a.75.75 0 0 0 1.09 0l4.25-4.5a.75.75 0 0 0-1.09-1.03l-2.955 3.129V2.75Z" />
                        <path d="M3.5 12.75a.75.75 0 0 0-1.5 0v2.5A2.75 2.75 0 0 0 4.75 18h10.5A2.75 2.75 0 0 0 18 15.25v-2.5a.75.75 0 0 0-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5Z" />
                      </svg>
                      <span>Download Full CV (PDF)</span>
                    </a>
                  </div>
                ) : null}

                {socialLinks.length > 0 ? (
                  <div className="contact__social">
                    <h3 className="contact__social-heading">Professional Networks</h3>
                    <ul className="contact__social-list">
                      {socialLinks.map((link, index) => (
                        <li key={`${link.label}-${index}`}>
                          <a
                            href={link.url}
                            className="contact__social-pill"
                            rel="noopener noreferrer"
                            target="_blank"
                          >
                            {link.label}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
