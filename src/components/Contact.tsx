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
          <div className="contact__form-col">
            <h2 id="contact-heading" className="section__head">
              Contact
            </h2>
            <p className="contact__intro">
              Tell me what you need help with — a return to file, a reconciliation
              that will not balance, or an audit that needs a tax view.
            </p>
            <form onSubmit={handleSubmit} noValidate>
              <div className="field">
                <label htmlFor="contact-name">Name</label>
                <input
                  id="contact-name"
                  name="name"
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
                <label htmlFor="contact-email">Email</label>
                <input
                  id="contact-email"
                  name="email"
                  type="email"
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
                <label htmlFor="contact-subject">Subject</label>
                <input
                  id="contact-subject"
                  name="subject"
                  value={values.subject}
                  onChange={handleChange('subject')}
                />
              </div>
              <div className="field">
                <label htmlFor="contact-message">Message</label>
                <textarea
                  id="contact-message"
                  name="message"
                  value={values.message}
                  onChange={handleChange('message')}
                  rows={6}
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
              <button type="submit" className="btn" disabled={status === 'sending'}>
                {status === 'sending' ? 'Sending…' : 'Send message'}
              </button>
              {status === 'ok' && (
                <p className="contact__success" role="status">
                  Thank you. Your message has been received.
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
                Lake Victoria from Dunga Hill, Kisumu. Photograph by Ggobanga,
                CC BY-SA 4.0, via Wikimedia Commons.
              </figcaption>
            </figure>

            <div>
              <h3 className="contact__details-heading">Details</h3>
              <ul className="contact__details">
                {profile?.location ? (
                  <li className="contact__detail">
                    <span className="contact__detail-label">Based in</span>
                    <span className="contact__detail-value">{profile.location}</span>
                  </li>
                ) : null}
                {profile?.public_email ? (
                  <li className="contact__detail">
                    <span className="contact__detail-label">Email</span>
                    <a className="contact__detail-value" href={`mailto:${profile.public_email}`}>
                      {profile.public_email}
                    </a>
                  </li>
                ) : null}
                {profile?.public_phone ? (
                  <li className="contact__detail">
                    <span className="contact__detail-label">Phone</span>
                    <a
                      className="contact__detail-value"
                      href={`tel:${profile.public_phone.replace(/\s+/g, '')}`}
                    >
                      {profile.public_phone}
                    </a>
                  </li>
                ) : null}
              </ul>
              {!hasDetails ? (
                <p className="contact__note">
                  Contact details are shared directly with enquirers.
                </p>
              ) : null}
            </div>

            {cvUrl ? (
              <div>
                <h3 className="contact__details-heading">Curriculum vitae</h3>
                <a className="contact__download" href={cvUrl} download>
                  Download CV <span aria-hidden="true">↓</span>
                </a>
              </div>
            ) : null}

            {socialLinks.length > 0 ? (
              <div className="contact__social">
                <h3 className="contact__social-heading">Elsewhere</h3>
                <ul className="contact__social-list">
                  {socialLinks.map((link, index) => (
                    <li key={`${link.label}-${index}`}>
                      <a
                        href={link.url}
                        className="contact__social-link"
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
    </section>
  );
}
