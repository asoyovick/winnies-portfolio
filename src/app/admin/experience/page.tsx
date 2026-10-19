'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type ExpItem = {
  id: number;
  position: string;
  organization: string;
  start_date: string;
  end_date: string | null;
  is_current: number;
  description: string;
  responsibilities: string[];
  display_order: number;
};

export default function ExperiencePage() {
  const [items, setItems] = useState<ExpItem[]>([]);
  const [editing, setEditing] = useState<number | null>(null);
  const [values, setValues] = useState({
    position: '', organization: '', start_date: '', end_date: '', is_current: false, description: '', responsibilities: '', display_order: 0,
  });
  const [error, setError] = useState('');
  const [csrf, setCsrf] = useState('');

  useEffect(() => {
    fetch('/api/experience').then(async (r) => setItems(await r.json()));
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
      ? await api('POST', '/api/experience', { ...values, responsibilities: values.responsibilities.split('\n').filter(Boolean) })
      : await api('PUT', '/api/experience', { id: editing, ...values, responsibilities: values.responsibilities.split('\n').filter(Boolean) });
    if (!resp.ok) { setError((await resp.json()).error || 'Save failed.'); return; }
    setEditing(null);
    setValues({ position: '', organization: '', start_date: '', end_date: '', is_current: false, description: '', responsibilities: '', display_order: 0 });
    const fresh = await (await fetch('/api/experience')).json();
    setItems(fresh);
  }

  async function handleDelete(id: number) {
    if (!window.confirm('Delete this experience entry?')) return;
    const resp = await api('DELETE', `/api/experience?id=${id}&confirm=delete`);
    if (resp.ok) {
      const fresh = await (await fetch('/api/experience')).json();
      setItems(fresh);
    } else {
      setError('Delete failed.');
    }
  }

  return (
    <div className="admin-canvas">
      <div className="admin-canvas__head">
        <h1 className="admin-canvas__title">Experience</h1>
        <p className="admin-canvas__sub">
          Manage employment history shown on the public site.
        </p>
      </div>
      {error && <p className="admin-login__error" role="alert">{error}</p>}
      <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '300px' }}>
          <form onSubmit={handleSave} noValidate className="admin-form">
            <h3 style={{ fontSize: '1rem', marginBottom: '0.75rem', color: 'var(--ink)' }}>
              {editing === null ? 'Add experience' : 'Edit experience'}
            </h3>
            <div className="field">
              <label>Position</label>
              <input value={values.position} onChange={(e) => setValues({ ...values, position: e.target.value })} />
            </div>
            <div className="field">
              <label>Organization</label>
              <input value={values.organization} onChange={(e) => setValues({ ...values, organization: e.target.value })} />
            </div>
            <div className="field">
              <label>Start date</label>
              <input type="month" value={values.start_date ? values.start_date + '-01' : ''} onChange={(e) => setValues({ ...values, start_date: e.target.value.slice(0, 7) })} />
            </div>
            <div className="field" style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <input type="checkbox" checked={values.is_current} onChange={(e) => setValues({ ...values, is_current: e.target.checked })} />
              <label style={{ marginBottom: 0, fontSize: '0.85rem' }}>Current position</label>
            </div>
            <div className="field" style={{ marginTop: '0.4rem' }}>
              <label>End date</label>
              <input type="month" disabled={values.is_current} value={values.end_date ? values.end_date + '-01' : ''} onChange={(e) => setValues({ ...values, end_date: e.target.value.slice(0, 7) })} />
            </div>
            <div className="field">
              <label>Description</label>
              <textarea value={values.description} onChange={(e) => setValues({ ...values, description: e.target.value })} />
            </div>
            <div className="field">
              <label>Responsibilities (one per line)</label>
              <textarea value={values.responsibilities} onChange={(e) => setValues({ ...values, responsibilities: e.target.value })} />
            </div>
            <div className="field">
              <label>Display order</label>
              <input type="number" value={values.display_order} onChange={(e) => setValues({ ...values, display_order: Number(e.target.value) || 0 })} />
            </div>
            <button type="submit" className="btn">
              {editing === null ? 'Add entry' : 'Save changes'}
            </button>
            {editing !== null && (
              <button type="button" onClick={() => { setEditing(null); setValues({ position: '', organization: '', start_date: '', end_date: '', is_current: false, description: '', responsibilities: '', display_order: 0 }); }} className="btn btn--text" style={{ marginLeft: '0.5rem' }}>Cancel</button>
            )}
          </form>
        </div>
        <div style={{ width: '520px' }}>
          <h3 style={{ fontSize: '1rem', marginBottom: '0.75rem', color: 'var(--ink)' }}>Existing entries</h3>
          <table className="admin-table">
            <thead>
              <tr><th style={{ width: '220px' }}>Organization</th><th>Position</th><th style={{ width: '150px' }}>Period</th><th style={{ width: '170px' }}>Actions</th></tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td><strong>{item.organization}</strong></td>
                  <td>{item.position}</td>
                  <td>{item.start_date} – {item.is_current ? 'Present' : item.end_date}</td>
                  <td>
                    <button onClick={() => { setValues({ position: item.position, organization: item.organization, start_date: item.start_date, end_date: item.end_date || '', is_current: Boolean(item.is_current), description: item.description, responsibilities: item.responsibilities.join('\n'), display_order: item.display_order }); setEditing(item.id); }} className="btn btn--text" style={{ padding: '0.2rem 0.5rem', fontSize: '0.8rem' }}>Edit</button>
                    <button onClick={() => handleDelete(item.id)} style={{ marginLeft: '0.4rem', padding: '0.2rem 0.5rem', fontSize: '0.8rem', color: '#7a2e1e', border: '1px solid var(--surface)', background: 'transparent' }}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {items.length === 0 && <p className="admin-empty">No experience entries yet.</p>}
        </div>
      </div>
      <div style={{ marginTop: '2rem' }}>
        <Link href="/admin" className="btn btn--text">← Back to dashboard</Link>
      </div>
    </div>
  );
}
