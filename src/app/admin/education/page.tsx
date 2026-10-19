'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type EduItem = {
  id: number;
  institution: string;
  qualification: string;
  field_of_study: string;
  start_date: string | null;
  end_date: string | null;
  status: string;
  description: string;
  display_order: number;
};

export default function EducationPage() {
  const [items, setItems] = useState<EduItem[]>([]);
  const [editing, setEditing] = useState<number | null>(null);
  const [values, setValues] = useState({
    institution: '', qualification: '', field_of_study: '', start_date: '', end_date: '', status: 'completed', description: '', display_order: 0,
  });
  const [error, setError] = useState('');
  const [csrf, setCsrf] = useState('');

  useEffect(() => {
    fetch('/api/education').then(async (r) => setItems(await r.json()));
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
    const isOngoing = values.status === 'ongoing';
    const resp = editing === null
      ? await api('POST', '/api/education', { ...values, end_date: isOngoing ? null : values.end_date || null })
      : await api('PUT', '/api/education', { id: editing, ...values, end_date: isOngoing ? null : values.end_date || null });
    if (!resp.ok) { setError((await resp.json()).error || 'Save failed.'); return; }
    setEditing(null);
    setValues({ institution: '', qualification: '', field_of_study: '', start_date: '', end_date: '', status: 'completed', description: '', display_order: 0 });
    const fresh = await (await fetch('/api/education')).json();
    setItems(fresh);
  }

  async function handleDelete(id: number) {
    if (!window.confirm('Delete this entry?')) return;
    const resp = await api('DELETE', `/api/education?id=${id}&confirm=delete`);
    if (resp.ok) {
      const fresh = await (await fetch('/api/education')).json();
      setItems(fresh);
    } else {
      setError('Delete failed.');
    }
  }

  return (
    <div className="admin-canvas">
      <div className="admin-canvas__head">
        <h1 className="admin-canvas__title">Education &amp; qualifications</h1>
        <p className="admin-canvas__sub">
          Manage education and professional qualifications. Ongoing
          qualifications are shown without a completion date.
        </p>
      </div>
      {error && <p className="admin-login__error" role="alert">{error}</p>}
      <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '300px' }}>
          <form onSubmit={handleSave} noValidate className="admin-form">
            <h3 style={{ fontSize: '1rem', marginBottom: '0.75rem', color: 'var(--ink)' }}>
              {editing === null ? 'Add qualification' : 'Edit qualification'}
            </h3>
            <div className="field">
              <label>Institution</label>
              <input value={values.institution} onChange={(e) => setValues({ ...values, institution: e.target.value })} />
            </div>
            <div className="field">
              <label>Qualification</label>
              <input value={values.qualification} onChange={(e) => setValues({ ...values, qualification: e.target.value })} />
            </div>
            <div className="field">
              <label>Field of study</label>
              <input value={values.field_of_study} onChange={(e) => setValues({ ...values, field_of_study: e.target.value })} />
            </div>
            <div className="field">
              <label>Status</label>
              <select value={values.status} onChange={(e) => setValues({ ...values, status: e.target.value })} style={{ width: '100%', padding: '0.6rem 0.75rem', font: 'inherit', background: 'var(--surface)', border: 0, color: 'var(--ink)' }}>
                <option value="completed">Completed</option>
                <option value="ongoing">Ongoing</option>
              </select>
            </div>
            <div className="field">
              <label>Start date</label>
              <input type="month" value={values.start_date ? values.start_date + '-01' : ''} onChange={(e) => setValues({ ...values, start_date: e.target.value.slice(0, 7) })} />
            </div>
            <div className="field">
              <label>End date (not required when ongoing)</label>
              <input type="month" disabled={values.status === 'ongoing'} value={values.end_date ? values.end_date + '-01' : ''} onChange={(e) => setValues({ ...values, end_date: e.target.value.slice(0, 7) })} />
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
              {editing === null ? 'Add qualification' : 'Save changes'}
            </button>
            {editing !== null && (
              <button type="button" onClick={() => setEditing(null)} className="btn btn--text" style={{ marginLeft: '0.5rem' }}>Cancel</button>
            )}
          </form>
        </div>
        <div style={{ width: '520px' }}>
          <h3 style={{ fontSize: '1rem', marginBottom: '0.75rem', color: 'var(--ink)' }}>Existing qualifications</h3>
          <table className="admin-table">
            <thead>
              <tr><th>Qualification</th><th>Institution</th><th>Status</th><th style={{ width: '140px' }}>Actions</th></tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td><strong>{item.qualification}</strong></td>
                  <td>{item.institution}</td>
                  <td><span className={`admin-badge ${item.status === 'ongoing' ? 'admin-badge--ongoing' : ''}`}>{item.status}</span></td>
                  <td>
                    <button onClick={() => { setValues({ institution: item.institution, qualification: item.qualification, field_of_study: item.field_of_study, start_date: item.start_date || '', end_date: item.end_date || '', status: item.status, description: item.description, display_order: item.display_order }); setEditing(item.id); }} className="btn btn--text" style={{ padding: '0.2rem 0.5rem', fontSize: '0.8rem' }}>Edit</button>
                    <button onClick={() => handleDelete(item.id)} style={{ marginLeft: '0.4rem', padding: '0.2rem 0.5rem', fontSize: '0.8rem', color: '#7a2e1e', border: '1px solid var(--surface)', background: 'transparent' }}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {items.length === 0 && <p className="admin-empty">No qualifications yet.</p>}
        </div>
      </div>
      <div style={{ marginTop: '2rem' }}>
        <Link href="/admin" className="btn btn--text">← Back to dashboard</Link>
      </div>
    </div>
  );
}
