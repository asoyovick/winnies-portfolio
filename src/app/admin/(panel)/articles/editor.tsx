'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { MediaPicker } from '@/components/admin/MediaPicker';
import { adminRequest, refreshCsrfToken } from '@/lib/admin-client';

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
    title: initial?.title ?? '',
    slug: initial?.slug ?? '',
    summary: initial?.summary ?? '',
    body: initial?.body ?? '',
  });
  const [coverId, setCoverId] = useState<number | null>(initial?.featured_image_id ?? null);
  const [status, setStatus] = useState(initial?.status ?? 'draft');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void refreshCsrfToken();
  }, []);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    setNotice('');
    setSaving(true);

    const body: Record<string, unknown> = {
      title: values.title,
      slug: values.slug,
      summary: values.summary,
      body: values.body,
      featured_image_id: coverId,
      status,
    };
    if (!isNew && initial) body.id = initial.id;
    if (status === 'published' && !initial?.published_at) {
      body.published_at = new Date().toISOString();
    }

    const result = isNew
      ? await adminRequest('/api/articles', { method: 'POST', body })
      : await adminRequest('/api/articles', { method: 'PUT', body });

    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setNotice(status === 'published' ? 'Published.' : 'Saved as a draft.');
    if (isNew) {
      router.push('/admin/articles');
      router.refresh();
    }
  }

  const preview = values.body
    .split(/\n{2,}/)
    .filter(Boolean)
    .slice(0, 6)
    .map((block, index) => (
      <p key={index}>{block.replace(/<[^>]+>/g, '')}</p>
    ));

  return (
    <div>
      <div className="admin-canvas__head">
        <div>
          <h1 className="admin-canvas__title">
            {isNew ? 'New article' : 'Edit article'}
          </h1>
          <p className="admin-canvas__sub">
            Write in plain text. Paragraphs are separated by a blank line.
          </p>
        </div>
        <div className="admin-actions-row" style={{ marginTop: 0 }}>
          <Link href="/admin/articles" className="btn btn--text">
            All articles
          </Link>
        </div>
      </div>

      {error ? (
        <p className="admin-login__error" role="alert">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p className="admin-login__error" role="status" style={{ color: 'var(--accent)' }}>
          {notice}
        </p>
      ) : null}

      <form className="admin-form" onSubmit={handleSubmit} noValidate>
        <div className="field">
          <label htmlFor="article-title">Title</label>
          <input
            id="article-title"
            value={values.title}
            onChange={(e) => setValues({ ...values, title: e.target.value })}
          />
        </div>

        <div className="field">
          <label htmlFor="article-slug">Address</label>
          <input
            id="article-slug"
            value={values.slug}
            placeholder="how-to-read-a-reconciliation"
            onChange={(e) => setValues({ ...values, slug: e.target.value })}
          />
          <p className="admin-form__help">
            The article is published at /insights/ followed by this text. Leave
            empty to build it from the title.
          </p>
        </div>

        <div className="field">
          <label htmlFor="article-summary">Summary</label>
          <textarea
            id="article-summary"
            rows={2}
            value={values.summary}
            onChange={(e) => setValues({ ...values, summary: e.target.value })}
          />
          <p className="admin-form__help">One or two sentences shown in the list.</p>
        </div>

        <div className="field">
          <label htmlFor="article-body">Article</label>
          <textarea
            id="article-body"
            rows={14}
            value={values.body}
            onChange={(e) => setValues({ ...values, body: e.target.value })}
          />
        </div>

        <MediaPicker
          label="Cover image"
          help="Optional. Shown at the top of the published article."
          kind="image"
          value={coverId}
          onChange={setCoverId}
        />

        <div className="field" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <input
            id="article-status"
            type="checkbox"
            checked={status === 'published'}
            onChange={(e) => setStatus(e.target.checked ? 'published' : 'draft')}
          />
          <label htmlFor="article-status" style={{ marginBottom: 0 }}>
            Published on the public site
          </label>
        </div>

        <div className="admin-actions-row">
          <button type="submit" className="btn" disabled={saving}>
            {saving ? 'Saving…' : status === 'published' ? 'Save and publish' : 'Save draft'}
          </button>
          {initial?.status === 'published' ? (
            <Link href={`/insights/${initial.slug}`} target="_blank" className="btn btn--text">
              Preview
            </Link>
          ) : null}
        </div>
      </form>

      {values.title || values.body ? (
        <section className="admin-section">
          <h2 className="admin-section__title">Preview</h2>
          <article className="article-preview">
            <h3 className="article-preview__title">{values.title || 'Untitled'}</h3>
            {values.summary ? <p className="article-preview__summary">{values.summary}</p> : null}
            <div className="article-preview__body">{preview}</div>
          </article>
        </section>
      ) : null}
    </div>
  );
}
