'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type ExpItem = {
  id: number;
  title: string;
  description: string;
  category: string;
  display_order: number;
};

export default function ExpertisePage() {
  const [items, setItems] = useState<ExpItem[]>([]);
  const [editing, setEditing] = useState<number | null>(null);
  const [values, setValues] = useState({ title: '', description: '', category: '', display_order: 0 });
  const [error, setError] = useState('');
  const [csrf, setCsrf] = useState('');

  useEffect(() => {
    fetch('/api/expertise').then(async (r) => setItems(await r.json()));
    fetch('/api/auth/csrf').then(async (r) => {
      const json = await r.json();
      if (json.ok) {
        const m = document.cookie.match(/(?:^|; )portfolio_csrf=([^;]+)/);
        setCsrf((m && m[1]) || '');
      }
    });
  }, []);

  async function api(method: string, path: string, body?: any) {
    const token = csrf;
    const headers: Record<string, string> = { 'X-CSRF-Token': token, Cookie: `portfolio_csrf=${token}` };
    if (body) headers['Content-Type'] = 'application/json';
    return fetch(path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const resp = editing === null
      ? await api('POST', '/api/expertise', values)
      : await api('PUT', '/api/expertise', { id: editing, ...values });
    if (!resp.ok) { setError((await resp.json()).error || 'Save failed.'); return; }
    setEditing(null);
    const fresh = await (await fetch('/api/expertise')).json();
    setItems(fresh);
  }

  async function handleDelete(id: number) {
    if (!window.confirm('Delete this entry?')) return;
    const resp = await api('DELETE', `/api/expertise?id=${id}&confirm=delete`);
    if (resp.ok) {
      const fresh = await (await fetch('/api/expertise')).json();
      setItems(fresh);
    } else {
      setError('Delete failed.');
    }
  }

  return (
    <div className="admin-canvas">
      <div className="admin-canvas__head">
        <h1 className="admin-canvas__title">Expertise</h1>
        <p className="admin-canvas__sub">
          Manage areas of expertise shown on the public site.
        </p>
      </div>
      {error && <p className="admin-login__error" role="alert">{error}</p>}
      <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '300px' }}>
          <form onSubmit={handleSave} noValidate className="admin-form">
            <h3 style={{ fontSize: '1rem', marginBottom: '0.75rem', color: 'var(--ink)' }}>
              {editing === null ? 'Add expertise area' : 'Edit expertise area'}
            </h3>
            <div className="field">
              <label>Title</label>
              <input value={values.title} onChange={(e) => setValues({ ...values, title: e.target.value })} />
            </div>
            <div className="field">
              <label>Category</label>
              <input value={values.category} onChange={(e) => setValues({ ...values, category: e.target.value })} />
            </div>
            <div className="field">
              <label>Description</label>
              <textarea value={values.description} onChange={(e) => setValues({ ...values, description: e.target.value })} />
            </div>
            <div className="field">
              <label>Display order</label>
              <input type="number" value={values.display_order} onChange={(e) => setValues({ ...values, display_order: Number(e.target.value) || 0 })} />
            </div>
            <button type="submit" className="btn">
              {editing === null ? 'Add area' : 'Save changes'}
            </button>
            {editing !== null && (
              <button type="button" onClick={() => setEditing(null)} className="btn btn--text" style={{ marginLeft: '0.5rem' }}>Cancel</button>
            )}
          </form>
        </div>
        <div style={{ width: '520px' }}>
          <h3 style={{ fontSize: '1rem', marginBottom: '0.75rem', color: 'var(--ink)' }}>Existing areas</h3>
          <table className="admin-table">
            <thead>
              <tr><th>Title</th><th>Category</th><th style={{ width: '140px' }}>Actions</th></tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td><strong>{item.title}</strong></td>
                  <td>{item.category}</td>
                  <td>
                    <button onClick={() => { setValues({ title: item.title, description: item.description, category: item.category, display_order: item.display_order }); setEditing(item.id); }} className="btn btn--text" style={{ padding: '0.2rem 0.5rem', fontSize: '0.8rem' }}>Edit</button>
                    <button onClick={() => handleDelete(item.id)} style={{ marginLeft: '0.4rem', padding: '0.2rem 0.5rem', fontSize: '0.8rem', color: '#7a2e1e', border: '1px solid var(--surface)', background: 'transparent' }}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {items.length === 0 && <p className="admin-empty">No expertise areas yet.</p>}
        </div>
      </div>
      <div style={{ marginTop: '2rem' }}>
        <Link href="/admin" className="btn btn--text">← Back to dashboard</Link>
      </div>
    </div>
  );
}
