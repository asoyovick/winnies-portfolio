'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type Asset = {
  id: number;
  original_name: string;
  storage_name: string;
  mime_type: string;
  size: number;
  created_at: string;
  public_url: string;
};

export default function MediaPage() {
  const [items, setItems] = useState<Asset[]>([]);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [loading, setLoading] = useState(false);
  const [csrf, setCsrf] = useState('');

  useEffect(() => {
    fetch('/api/media').then(async (r) => setItems(await r.json()));
    fetch('/api/auth/csrf').then(async (r) => {
      const json = await r.json();
      if (json.ok) {
        const m = document.cookie.match(/(?:^|; )portfolio_csrf=([^;]+)/);
        setCsrf((m && m[1]) || '');
      }
    });
  }, []);

  async function api(method: string, path: string, body?: any, headers?: Record<string, string>) {
    const token = csrf;
    const h: Record<string, string> = { 'X-CSRF-Token': token, Cookie: `portfolio_csrf=${token}` };
    if (headers) Object.assign(h, headers);
    if (body && !(body instanceof FormData)) h['Content-Type'] = 'application/json';
    return fetch(path, { method, headers: h, body: body && !(body instanceof FormData) ? JSON.stringify(body) : body });
  }

  async function handleUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setOk('');
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const file = form.get('file') as File;
    if (!file) { setError('Choose a file.'); setLoading(false); return; }
    const resp = await api('POST', '/api/media', form);
    if (!resp.ok) { const json = await resp.json(); setError(json.error || 'Upload failed.'); setLoading(false); return; }
    setOk('Uploaded.');
    setLoading(false);
    e.currentTarget.reset();
    const fresh = await (await fetch('/api/media')).json();
    setItems(fresh);
  }

  async function handleDelete(id: number) {
    if (!window.confirm('Delete this asset?')) return;
    const resp = await api('DELETE', `/api/media?id=${id}&confirm=force`);
    if (!resp.ok) { const json = await resp.json(); setError(json.error || 'Delete failed.'); return; }
    const fresh = await (await fetch('/api/media')).json();
    setItems(fresh);
  }

  const isImage = (m: string) => m.startsWith('image/');

  return (
    <div className="admin-canvas">
      <div className="admin-canvas__head">
        <h1 className="admin-canvas__title">Media library</h1>
        <p className="admin-canvas__sub">
          Upload and manage images and documents used on the portfolio.
        </p>
      </div>
      {error && <p className="admin-login__error" role="alert">{error}</p>}
      {ok && <p className="admin-login__error" role="status" style={{ color: 'var(--accent)' }}>{ok}</p>}
      <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '340px' }}>
          <form onSubmit={handleUpload} noValidate className="admin-form">
            <h3 style={{ fontSize: '1rem', marginBottom: '0.75rem', color: 'var(--ink)' }}>Upload asset</h3>
            <div className="field">
              <label>File</label>
              <input type="file" name="file" required />
              <p className="admin-form__help">JPEG, PNG, WebP images and PDF documents (max 10 MB).</p>
            </div>
            <button type="submit" className="btn" disabled={loading}>
              {loading ? 'Uploading…' : 'Upload'}
            </button>
          </form>
        </div>
        <div style={{ width: '560px' }}>
          <h3 style={{ fontSize: '1rem', marginBottom: '0.75rem', color: 'var(--ink)' }}>{items.length} asset(s)</h3>
          <div className="media-grid">
            {items.map((item) => (
              <div key={item.id} className="media-item">
                {isImage(item.mime_type) ? (
                  <img src={item.public_url} alt={item.original_name} loading="lazy" />
                ) : (
                  <div style={{ width: '100%', height: 120, background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem' }}>📄</div>
                )}
                <div className="media-item__name">{item.original_name}</div>
                <div className="media-item__meta">{item.mime_type} · {(item.size / 1024).toFixed(1)} KB</div>
                <div className="media-item__actions">
                  <a href={item.public_url} target="_blank" rel="noreferrer" style={{ fontSize: '0.7rem', color: 'var(--accent)', textDecoration: 'none' }}>View</a>
                  <button onClick={() => handleDelete(item.id)} style={{ fontSize: '0.7rem', color: '#7a2e1e', border: '1px solid var(--surface)', background: 'transparent', cursor: 'pointer', marginLeft: '0.2rem' }}>Delete</button>
                </div>
              </div>
            ))}
            {items.length === 0 && <p className="admin-empty">No media uploaded yet.</p>}
          </div>
        </div>
      </div>
      <div style={{ marginTop: '2rem' }}>
        <Link href="/admin" className="btn btn--text">← Back to dashboard</Link>
      </div>
    </div>
  );
}
