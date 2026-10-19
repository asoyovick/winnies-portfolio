'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type Article = {
  id: number;
  title: string;
  slug: string;
  status: string;
  updated_at: string;
};

export default function ArticlesPage() {
  const [articles, setArticles] = useState<Article[]>([]);

  function getCsrf(): string {
    const m = document.cookie.match(/(?:^|; )portfolio_csrf=([^;]+)/);
    return (m && m[1]) || '';
  }

  useEffect(() => {
    fetch('/api/articles').then(async (r) => setItems(await r.json()));
  }, []);

  async function toggle(item: Article) {
    const token = getCsrf();
    const res = await fetch('/api/articles', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': token,
        Cookie: `portfolio_csrf=${token}`,
      },
      body: JSON.stringify({ id: item.id, status: item.status === 'published' ? 'draft' : 'published' }),
    });
    if (res.ok) setItems(articles.map((a) => (a.id === item.id ? { ...a, status: a.status === 'published' ? 'draft' : 'published' } : a)));
  }

  async function deleteItem(id: number) {
    if (!window.confirm('Delete this article?')) return;
    const token = getCsrf();
    const res = await fetch(`/api/articles?id=${id}&confirm=delete`, {
      method: 'DELETE',
      headers: { 'X-CSRF-Token': token, Cookie: `portfolio_csrf=${token}` },
    });
    if (res.ok) setItems(articles.filter((a) => a.id !== id));
  }

  async function setItems(json: any) {
    setArticles(json);
  }

  return (
    <div className="admin-canvas">
      <div className="admin-canvas__head">
        <h1 className="admin-canvas__title">Insights &amp; articles</h1>
        <p className="admin-canvas__sub">
          Manage articles and professional insights shown on the public site.
        </p>
      </div>
      <div className="admin-actions-row" style={{ marginBottom: '1rem' }}>
        <Link href="/admin/articles/new" className="btn">New article</Link>
      </div>
      <table className="admin-table">
        <thead>
          <tr>
            <th style={{ width: '260px' }}>Title</th>
            <th style={{ width: '170px' }}>Slug</th>
            <th style={{ width: '120px' }}>Status</th>
            <th style={{ width: '170px' }}>Updated</th>
            <th style={{ width: '220px' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {articles.map((item) => (
            <tr key={item.id}>
              <td>{item.title}</td>
              <td><code style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>{item.slug}</code></td>
              <td>
                <button
                  onClick={() => toggle(item)}
                  className="btn btn--text"
                  style={{ padding: '0.2rem 0.6rem', fontSize: '0.8rem', background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer' }}
                >
                  {item.status === 'published' ? 'Unpublish' : 'Publish'}
                </button>
              </td>
              <td>{new Date(item.updated_at).toLocaleDateString('en-GB')}</td>
              <td>
                <Link href={`/admin/articles/${item.slug}/edit`} className="btn btn--text" style={{ padding: '0.2rem 0.5rem', fontSize: '0.8rem', marginRight: '0.3rem' }}>Edit</Link>
                <button onClick={() => deleteItem(item.id)} style={{ padding: '0.2rem 0.5rem', fontSize: '0.8rem', color: '#7a2e1e', border: '1px solid var(--surface)', background: 'transparent', cursor: 'pointer' }}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {articles.length === 0 && <p className="admin-empty">No articles yet.</p>}
      <div style={{ marginTop: '2rem' }}>
        <Link href="/admin" className="btn btn--text">← Back to dashboard</Link>
      </div>
    </div>
  );
}
