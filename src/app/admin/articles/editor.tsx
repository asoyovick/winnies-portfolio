'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';

type Article = {
  id: number;
  title: string;
  slug: string;
  summary: string;
  body: string;
  featured_image_id: number | null;
  status: string;
  published_at: string | null;
};

export default function ArticleEditor({ initial }: { initial: Article | null }) {
  const router = useRouter();
  const params = useParams<{ slug: string }>();
  const isNew = !params.slug;
  const [values, setValues] = useState({
    title: initial?.title || '',
    slug: initial?.slug || '',
    summary: initial?.summary || '',
    body: initial?.body || '',
    featured_image_id: String(initial?.featured_image_id ?? ''),
    status: initial?.status || 'draft',
  });
  const [error, setError] = useState('');
  const [ok, setOk] = useState(false);
  const [loading, setLoading] = useState(false);
  const [csrf, setCsrf] = useState('');

  useEffect(() => {
    fetch('/api/auth/csrf').then(async (res) => {
      const json = await res.json();
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
    const isPublish = values.status === 'published';
    const body: any = {
      title: values.title,
      slug: values.slug,
      summary: values.summary,
      body: values.body,
      featured_image_id: values.featured_image_id ? Number(values.featured_image_id) : null,
      status: values.status,
    };
    if (!isNew) body.id = initial!.id;
    if (isPublish && !initial?.published_at) body.published_at = new Date().toISOString();

    const res = isNew
      ? await fetch('/api/articles', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': token, Cookie: `portfolio_csrf=${token}` }, body: JSON.stringify(body) })
      : await fetch('/api/articles', { method: 'PUT', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': token, Cookie: `portfolio_csrf=${token}` }, body: JSON.stringify(body) });
    const json = await res.json();
    if (!res.ok) { setError(json.error || 'Save failed.'); setLoading(false); return; }
    setOk(true);
    setLoading(false);
    if (isNew) setTimeout(() => router.push('/admin/articles'), 600);
  }

  return (
    <form className="admin-form" onSubmit={handleSubmit} noValidate>
      <h2 className="admin-canvas__title" style={{ fontSize: '1.15rem', marginBottom: '0.75rem' }}>
        {isNew ? 'New article' : 'Edit article'}
      </h2>
      {error && <p className="admin-login__error" role="alert">{error}</p>}
      {ok && <p className="admin-login__error" role="status" style={{ color: 'var(--accent)' }}>Saved.</p>}

      <div className="field">
        <label>Title</label>
        <input value={values.title} onChange={(e) => setValues({ ...values, title: e.target.value })} />
        {isNew && (
          <div className="field">
            <label>Slug</label>
            <input value={values.slug} onChange={(e) => setValues({ ...values, slug: e.target.value })} />
            <p className="admin-form__help">URL-friendly identifier.</p>
          </div>
        )}
      </div>

      <div className="field">
        <label>Summary</label>
        <textarea value={values.summary} onChange={(e) => setValues({ ...values, summary: e.target.value })} />
      </div>

      <div className="field">
        <label>Body (HTML)</label>
        <textarea value={values.body} onChange={(e) => setValues({ ...values, body: e.target.value })} style={{ minHeight: '300px', fontFamily: 'ui-monospace, SFMono-Regular, monospace' }} />
      </div>

      <div className="field">
        <label>Featured image (media ID)</label>
        <input value={values.featured_image_id} onChange={(e) => setValues({ ...values, featured_image_id: e.target.value })} />
        <p className="admin-form__help">Enter the ID of an uploaded media asset from the media library.</p>
      </div>

      <div className="field" style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
        <input type="checkbox" checked={values.status === 'published'} onChange={(e) => setValues({ ...values, status: e.target.checked ? 'published' : 'draft' })} />
        <label style={{ marginBottom: 0 }}>{isNew ? 'Publish immediately' : 'Published'}</label>
      </div>

      <button type="submit" className="btn" disabled={loading}>
        {loading ? 'Saving…' : isNew ? 'Create article' : 'Save article'}
      </button>
      <button type="button" onClick={() => router.push('/admin/articles')} className="btn btn--text" style={{ marginLeft: '0.5rem' }}>Cancel</button>
    </form>
  );
}
