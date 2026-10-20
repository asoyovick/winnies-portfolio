'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { adminRequest, refreshCsrfToken } from '@/lib/admin-client';
import { formatDateTime } from '@/lib/format';

type Article = {
  id: number;
  title: string;
  slug: string;
  status: string;
  published_at: string | null;
  updated_at: string;
};

export default function ArticlesPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const result = await adminRequest<Article[]>('/api/articles');
    if (result.ok && result.data) setArticles(result.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    void (async () => {
      await refreshCsrfToken();
      await load();
    })();
  }, [load]);

  async function toggle(item: Article) {
    setError('');
    const next = item.status === 'published' ? 'draft' : 'published';
    const result = await adminRequest('/api/articles', {
      method: 'PUT',
      body: { id: item.id, status: next },
    });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    await load();
  }

  async function remove(item: Article) {
    if (!window.confirm(`Delete “${item.title}”? This cannot be undone.`)) return;
    setError('');
    const result = await adminRequest(`/api/articles?id=${item.id}&confirm=delete`, {
      method: 'DELETE',
    });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    await load();
  }

  return (
    <div>
      <div className="admin-canvas__head">
        <div>
          <h1 className="admin-canvas__title">Insights</h1>
          <p className="admin-canvas__sub">
            Articles published under Professional insights. Drafts stay private
            until you publish them.
          </p>
        </div>
        <Link href="/admin/articles/new" className="btn">
          New article
        </Link>
      </div>

      {error ? (
        <p className="admin-login__error" role="alert">
          {error}
        </p>
      ) : null}

      <section className="admin-section">
        {loading ? (
          <p className="admin-note">Loading…</p>
        ) : articles.length === 0 ? (
          <p className="admin-empty">
            No articles yet. Start one when you are ready to publish a note.
          </p>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Status</th>
                <th>Updated</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {articles.map((item) => (
                <tr key={item.id}>
                  <td>
                    <strong>{item.title}</strong>
                    <br />
                    <span style={{ color: 'var(--muted)', fontSize: '0.78rem' }}>
                      /insights/{item.slug}
                    </span>
                  </td>
                  <td>
                    <span
                      className={`admin-badge${
                        item.status === 'published' ? ' admin-badge--ongoing' : ''
                      }`}
                    >
                      {item.status === 'published' ? 'Published' : 'Draft'}
                    </span>
                    {item.published_at ? (
                      <div style={{ color: 'var(--muted)', fontSize: '0.72rem', marginTop: '0.25rem' }}>
                        Since {formatDateTime(item.published_at)}
                      </div>
                    ) : null}
                  </td>
                  <td>{formatDateTime(item.updated_at)}</td>
                  <td>
                    <Link href={`/admin/articles/${item.slug}/edit`}>Edit</Link>
                    {item.status === 'published' ? (
                      <Link
                        href={`/insights/${item.slug}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{ marginLeft: '0.6rem' }}
                      >
                        View
                      </Link>
                    ) : null}
                    <button
                      type="button"
                      className="btn btn--text"
                      onClick={() => toggle(item)}
                      style={{ marginLeft: '0.6rem' }}
                    >
                      {item.status === 'published' ? 'Unpublish' : 'Publish'}
                    </button>
                    <button
                      type="button"
                      className="btn btn--text"
                      onClick={() => remove(item)}
                      style={{ marginLeft: '0.4rem', color: '#7a2e1e' }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <div className="admin-actions-row">
        <Link href="/admin" className="btn btn--text">
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
