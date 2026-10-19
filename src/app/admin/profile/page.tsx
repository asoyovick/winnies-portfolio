'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type ProfileSettings = {
  id: number;
  display_name: string;
  professional_title: string;
  biography: string;
  location: string;
  public_email: string;
  hero_text: string;
  cv_media_id: number | null;
  profile_image_id: number | null;
  social_links: string;
  updated_at: string;
};

export default function ProfilePage() {
  const [profile, setProfile] = useState<ProfileSettings | null>(null);
  const [values, setValues] = useState({
    display_name: '', professional_title: '', biography: '', location: '', public_email: '', hero_text: '',
  });
  const [error, setError] = useState('');
  const [ok, setOk] = useState(false);
  const [loading, setLoading] = useState(false);
  const [csrf, setCsrf] = useState('');

  useEffect(() => {
    fetch('/api/profile').then(async (r) => {
      if (r.ok) {
        const p = await r.json();
        setProfile(p);
        setValues({
          display_name: p.display_name, professional_title: p.professional_title, biography: p.biography, location: p.location, public_email: p.public_email, hero_text: p.hero_text,
        });
      }
    });
    fetch('/api/auth/csrf').then(async (r) => {
      const json = await r.json();
      if (json.ok) {
        const m = document.cookie.match(/(?:^|; )portfolio_csrf=([^;]+)/);
        setCsrf((m && m[1]) || '');
      }
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setOk(false);
    setLoading(true);
    const token = csrf;
    const res = await fetch('/api/profile', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': token,
        Cookie: `portfolio_csrf=${token}`,
      },
      body: JSON.stringify(values),
    });
    const json = await res.json();
    if (!res.ok) { setError(json.error || 'Could not save changes.'); setLoading(false); return; }
    setOk(true);
    setLoading(false);
    setTimeout(() => { window.location.href = '/admin'; }, 800);
  }

  if (!profile) {
    return (
      <div className="admin-canvas">
        <h1 className="admin-canvas__title">Profile</h1>
        <p>Loading…</p>
      </div>
    );
  }

  return (
    <div className="admin-canvas">
      <div className="admin-canvas__head">
        <h1 className="admin-canvas__title">Profile</h1>
        <p className="admin-canvas__sub">
          Manage the public profile shown on the website.
        </p>
      </div>
      {error && <p className="admin-login__error" role="alert">{error}</p>}
      {ok && <p className="admin-login__error" role="status" style={{ color: 'var(--accent)' }}>Saved. Changes appear on the public site.</p>}
      <form className="admin-form" onSubmit={handleSubmit} noValidate>
        <div className="field">
          <label htmlFor="pf-display-name">Display name</label>
          <input id="pf-display-name" name="display_name" value={values.display_name} onChange={(e) => setValues({ ...values, display_name: e.target.value })} />
        </div>
        <div className="field">
          <label htmlFor="pf-title">Professional title</label>
          <input id="pf-title" name="professional_title" value={values.professional_title} onChange={(e) => setValues({ ...values, professional_title: e.target.value })} />
        </div>
        <div className="field">
          <label htmlFor="pf-location">Location</label>
          <input id="pf-location" name="location" value={values.location} onChange={(e) => setValues({ ...values, location: e.target.value })} />
        </div>
        <div className="field">
          <label htmlFor="pf-email">Public email</label>
          <input id="pf-email" name="public_email" type="email" value={values.public_email} onChange={(e) => setValues({ ...values, public_email: e.target.value })} />
          <p className="admin-form__help">Shown publicly on the contact page. Leave blank to hide.</p>
        </div>
        <div className="field">
          <label htmlFor="pf-biography">Biography</label>
          <textarea id="pf-biography" name="biography" value={values.biography} onChange={(e) => setValues({ ...values, biography: e.target.value })} />
          <p className="admin-form__help">Shown on the About section.</p>
        </div>
        <div className="field">
          <label htmlFor="pf-hero">Hero text</label>
          <textarea id="pf-hero" name="hero_text" value={values.hero_text} onChange={(e) => setValues({ ...values, hero_text: e.target.value })} />
          <p className="admin-form__help">Short statement shown under the name in the hero section.</p>
        </div>
        <button type="submit" className="btn" disabled={loading}>
          {loading ? 'Saving…' : 'Save profile'}
        </button>
      </form>
      <div style={{ marginTop: '2rem' }}>
        <Link href="/admin" className="btn btn--text">← Back to dashboard</Link>
      </div>
    </div>
  );
}
