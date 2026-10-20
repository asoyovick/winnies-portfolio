'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { MediaPicker } from '@/components/admin/MediaPicker';
import { adminRequest, refreshCsrfToken } from '@/lib/admin-client';

type SocialLink = { label: string; url: string };

type Profile = {
  id: number;
  display_name: string;
  professional_title: string;
  biography: string;
  location: string;
  public_email: string;
  public_phone: string;
  hero_heading: string;
  hero_subheading: string;
  cv_media_id: number | null;
  profile_image_id: number | null;
  social_links: SocialLink[];
  updated_at: string;
};

const EMPTY = {
  display_name: '',
  professional_title: '',
  biography: '',
  location: '',
  public_email: '',
  public_phone: '',
  hero_heading: '',
  hero_subheading: '',
};

export default function ProfilePage() {
  const [values, setValues] = useState(EMPTY);
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([]);
  const [photoId, setPhotoId] = useState<number | null>(null);
  const [cvId, setCvId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      await refreshCsrfToken();
      const result = await adminRequest<Profile>('/api/profile');
      if (!active) return;
      if (result.ok && result.data) {
        setValues({
          display_name: result.data.display_name ?? '',
          professional_title: result.data.professional_title ?? '',
          biography: result.data.biography ?? '',
          location: result.data.location ?? '',
          public_email: result.data.public_email ?? '',
          public_phone: result.data.public_phone ?? '',
          hero_heading: result.data.hero_heading ?? '',
          hero_subheading: result.data.hero_subheading ?? '',
        });
        setSocialLinks(
          Array.isArray(result.data.social_links) ? result.data.social_links : []
        );
        setPhotoId(result.data.profile_image_id ?? null);
        setCvId(result.data.cv_media_id ?? null);
      } else {
        setError(result.error);
      }
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    setSaved(false);
    setSaving(true);

    const result = await adminRequest('/api/profile', {
      method: 'PUT',
      body: {
        ...values,
        profile_image_id: photoId,
        cv_media_id: cvId,
        social_links: socialLinks.filter((link) => link.label.trim() || link.url.trim()),
      },
    });

    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setSaved(true);
  }

  if (loading) {
    return (
      <div>
        <h1 className="admin-canvas__title">Profile</h1>
        <p className="admin-canvas__sub">Loading…</p>
      </div>
    );
  }

  return (
    <div>
      <div className="admin-canvas__head">
        <div>
          <h1 className="admin-canvas__title">Profile</h1>
          <p className="admin-canvas__sub">
            Everything the public website shows about you. Changes appear on the
            site as soon as you save.
          </p>
        </div>
      </div>

      {error ? (
        <p className="admin-login__error" role="alert">
          {error}
        </p>
      ) : null}
      {saved ? (
        <p className="admin-login__error" role="status" style={{ color: 'var(--accent)' }}>
          Saved. The public site is updated.
        </p>
      ) : null}

      <form className="admin-form" onSubmit={handleSubmit} noValidate>
        <fieldset className="admin-group">
          <legend className="admin-group__legend">Identity</legend>

          <div className="field">
            <label htmlFor="pf-display-name">Display name</label>
            <input
              id="pf-display-name"
              name="display_name"
              value={values.display_name}
              onChange={(e) => setValues({ ...values, display_name: e.target.value })}
            />
          </div>

          <div className="field">
            <label htmlFor="pf-title">Professional title</label>
            <input
              id="pf-title"
              name="professional_title"
              value={values.professional_title}
              onChange={(e) => setValues({ ...values, professional_title: e.target.value })}
            />
            <p className="admin-form__help">
              Shown under your name in the hero and in the footer.
            </p>
          </div>

          <div className="field">
            <label htmlFor="pf-location">Location</label>
            <input
              id="pf-location"
              name="location"
              value={values.location}
              onChange={(e) => setValues({ ...values, location: e.target.value })}
            />
          </div>
        </fieldset>

        <fieldset className="admin-group">
          <legend className="admin-group__legend">Hero</legend>

          <div className="field">
            <label htmlFor="pf-hero-heading">Hero heading</label>
            <textarea
              id="pf-hero-heading"
              name="hero_heading"
              rows={2}
              value={values.hero_heading}
              onChange={(e) => setValues({ ...values, hero_heading: e.target.value })}
            />
            <p className="admin-form__help">
              One line per row. Each row becomes one line of the headline.
            </p>
          </div>

          <div className="field">
            <label htmlFor="pf-hero-subheading">Hero description</label>
            <textarea
              id="pf-hero-subheading"
              name="hero_subheading"
              rows={3}
              value={values.hero_subheading}
              onChange={(e) => setValues({ ...values, hero_subheading: e.target.value })}
            />
            <p className="admin-form__help">
              The single supporting sentence under the headline. Keep it to two
              or three lines.
            </p>
          </div>

          <MediaPicker
            label="Profile photograph"
            help="Shown on the right of the hero. Leave empty to use the positioning panel instead."
            kind="image"
            value={photoId}
            onChange={setPhotoId}
          />
        </fieldset>

        <fieldset className="admin-group">
          <legend className="admin-group__legend">About</legend>
          <div className="field">
            <label htmlFor="pf-biography">Biography</label>
            <textarea
              id="pf-biography"
              name="biography"
              rows={10}
              value={values.biography}
              onChange={(e) => setValues({ ...values, biography: e.target.value })}
            />
            <p className="admin-form__help">
              Separate paragraphs with a blank line. Shown in the About section.
            </p>
          </div>
        </fieldset>

        <fieldset className="admin-group">
          <legend className="admin-group__legend">Contact details</legend>
          <p className="admin-form__help">
            Only publish details you are happy to show publicly. Leave a field
            empty to hide it.
          </p>

          <div className="field">
            <label htmlFor="pf-email">Public email</label>
            <input
              id="pf-email"
              name="public_email"
              type="email"
              value={values.public_email}
              onChange={(e) => setValues({ ...values, public_email: e.target.value })}
            />
          </div>

          <div className="field">
            <label htmlFor="pf-phone">Public phone</label>
            <input
              id="pf-phone"
              name="public_phone"
              value={values.public_phone}
              onChange={(e) => setValues({ ...values, public_phone: e.target.value })}
            />
          </div>

          <MediaPicker
            label="Public CV"
            help="The document visitors can download. Upload a replacement and select it here — other uploaded documents stay private."
            kind="document"
            value={cvId}
            onChange={setCvId}
          />
        </fieldset>

        <fieldset className="admin-group">
          <legend className="admin-group__legend">Professional links</legend>
          <p className="admin-form__help">
            For example a LinkedIn profile. Add only links that exist.
          </p>

          {socialLinks.length === 0 ? (
            <p className="admin-note">No professional links added.</p>
          ) : null}

          {socialLinks.map((link, index) => (
            <div key={index} className="admin-repeat">
              <div className="field">
                <label htmlFor={`pf-social-label-${index}`}>Label</label>
                <input
                  id={`pf-social-label-${index}`}
                  value={link.label}
                  placeholder="LinkedIn"
                  onChange={(e) => {
                    const next = [...socialLinks];
                    next[index] = { ...link, label: e.target.value };
                    setSocialLinks(next);
                  }}
                />
              </div>
              <div className="field">
                <label htmlFor={`pf-social-url-${index}`}>Address</label>
                <input
                  id={`pf-social-url-${index}`}
                  value={link.url}
                  placeholder="https://www.linkedin.com/in/…"
                  onChange={(e) => {
                    const next = [...socialLinks];
                    next[index] = { ...link, url: e.target.value };
                    setSocialLinks(next);
                  }}
                />
              </div>
              <button
                type="button"
                className="btn btn--text"
                onClick={() => setSocialLinks(socialLinks.filter((_, i) => i !== index))}
              >
                Remove link
              </button>
            </div>
          ))}

          <button
            type="button"
            className="btn btn--text"
            onClick={() => setSocialLinks([...socialLinks, { label: '', url: '' }])}
          >
            Add a link
          </button>
        </fieldset>

        <div className="admin-actions-row">
          <button type="submit" className="btn" disabled={saving}>
            {saving ? 'Saving…' : 'Save profile'}
          </button>
          <Link href="/admin" className="btn btn--text">
            Back to dashboard
          </Link>
        </div>
      </form>
    </div>
  );
}
