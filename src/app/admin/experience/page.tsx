'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { adminRequest, refreshCsrfToken } from '@/lib/admin-client';

type ExpItem = {
  id: number;
  position: string;
  organization: string;
  start_date: string;
  end_date: string | null;
  is_current: boolean;
  description: string;
  responsibilities: string[];
  achievements: string[];
  display_order: number;
};

const EMPTY = {
  position: '',
  organization: '',
  start_date: '',
  end_date: '',
  is_current: false,
  description: '',
  responsibilities: '',
  achievements: '',
};

export default function ExperiencePage() {
  const [items, setItems] = useState<ExpItem[]>([]);
  const [editing, setEditing] = useState<number | null>(null);
  const [values, setValues] = useState(EMPTY);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const result = await adminRequest<ExpItem[]>('/api/experience');
    if (result.ok && result.data) setItems(result.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    void (async () => {
      await refreshCsrfToken();
      await load();
    })();
  }, [load]);

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    setNotice('');

    const payload = {
      ...values,
      responsibilities: values.responsibilities.split('\n').filter(Boolean),
      achievements: values.achievements.split('\n').filter(Boolean),
      end_date: values.is_current ? null : values.end_date || null,
    };

    const result =
      editing === null
        ? await adminRequest('/api/experience', { method: 'POST', body: payload })
        : await adminRequest('/api/experience', { method: 'PUT', body: { id: editing, ...payload } });

    if (!result.ok) {
      setError(result.error);
      return;
    }
    setEditing(null);
    setValues(EMPTY);
    setNotice('Saved.');
    await load();
  }

  async function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= items.length) return;
    const current = items[index];
    const other = items[target];
    if (!current || !other) return;

    const first = await adminRequest('/api/experience', {
      method: 'PUT',
      body: { id: current.id, display_order: other.display_order },
    });
    const second = await adminRequest('/api/experience', {
      method: 'PUT',
      body: { id: other.id, display_order: current.display_order },
    });
    if (!first.ok || !second.ok) {
      setError(first.ok ? second.error : first.error);
      return;
    }
    await load();
  }

  async function handleDelete(item: ExpItem) {
    if (!window.confirm(`Delete “${item.position} at ${item.organization}”?`)) return;
    setError('');
    const result = await adminRequest(`/api/experience?id=${item.id}&confirm=delete`, {
      method: 'DELETE',
    });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    if (editing === item.id) {
      setEditing(null);
      setValues(EMPTY);
    }
    await load();
  }

  function editItem(item: ExpItem) {
    setEditing(item.id);
    setError('');
    setNotice('');
    setValues({
      position: item.position,
      organization: item.organization,
      start_date: item.start_date ? item.start_date.slice(0, 7) : '',
      end_date: item.end_date ? item.end_date.slice(0, 7) : '',
      is_current: Boolean(item.is_current),
      description: item.description,
      responsibilities: item.responsibilities.join('\n'),
      achievements: item.achievements.join('\n'),
    });
  }

  return (
    <div>
      <div className="admin-canvas__head">
        <div>
          <h1 className="admin-canvas__title">Experience</h1>
          <p className="admin-canvas__sub">
            Employment history, newest first. Move entries up or down to change
            the order on the public site.
          </p>
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

      <section className="admin-section">
        <h2 className="admin-section__title">
          {editing === null ? 'Add an entry' : 'Edit entry'}
        </h2>
        <form className="admin-form" onSubmit={handleSave} noValidate>
          <div className="field">
            <label htmlFor="exp-position">Position</label>
            <input
              id="exp-position"
              value={values.position}
              onChange={(e) => setValues({ ...values, position: e.target.value })}
            />
          </div>
          <div className="field">
            <label htmlFor="exp-organization">Organisation</label>
            <input
              id="exp-organization"
              value={values.organization}
              onChange={(e) => setValues({ ...values, organization: e.target.value })}
            />
          </div>
          <div className="admin-repeat">
            <div className="field">
              <label htmlFor="exp-start">Start</label>
              <input
                id="exp-start"
                type="month"
                value={values.start_date}
                onChange={(e) => setValues({ ...values, start_date: e.target.value })}
              />
            </div>
            <div className="field">
              <label htmlFor="exp-end">End</label>
              <input
                id="exp-end"
                type="month"
                disabled={values.is_current}
                value={values.end_date}
                onChange={(e) => setValues({ ...values, end_date: e.target.value })}
              />
            </div>
            <div className="field" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <input
                id="exp-current"
                type="checkbox"
                checked={values.is_current}
                onChange={(e) => setValues({ ...values, is_current: e.target.checked })}
              />
              <label htmlFor="exp-current" style={{ marginBottom: 0 }}>
                Current role
              </label>
            </div>
          </div>
          <div className="field">
            <label htmlFor="exp-description">Description</label>
            <textarea
              id="exp-description"
              rows={4}
              value={values.description}
              onChange={(e) => setValues({ ...values, description: e.target.value })}
            />
            <p className="admin-form__help">One or two sentences on the role.</p>
          </div>
          <div className="field">
            <label htmlFor="exp-responsibilities">Responsibilities</label>
            <textarea
              id="exp-responsibilities"
              rows={5}
              value={values.responsibilities}
              onChange={(e) => setValues({ ...values, responsibilities: e.target.value })}
            />
            <p className="admin-form__help">One per line.</p>
          </div>
          <div className="field">
            <label htmlFor="exp-achievements">Verified achievements</label>
            <textarea
              id="exp-achievements"
              rows={3}
              value={values.achievements}
              onChange={(e) => setValues({ ...values, achievements: e.target.value })}
            />
            <p className="admin-form__help">
              One per line. Only record achievements that are confirmed.
            </p>
          </div>
          <div className="admin-actions-row">
            <button type="submit" className="btn">
              {editing === null ? 'Add entry' : 'Save changes'}
            </button>
            {editing !== null ? (
              <button
                type="button"
                className="btn btn--text"
                onClick={() => {
                  setEditing(null);
                  setValues(EMPTY);
                }}
              >
                Cancel
              </button>
            ) : null}
          </div>
        </form>
      </section>

      <section className="admin-section">
        <h2 className="admin-section__title">Entries</h2>
        {loading ? (
          <p className="admin-note">Loading…</p>
        ) : items.length === 0 ? (
          <p className="admin-empty">No experience entries yet.</p>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Organisation</th>
                <th>Position</th>
                <th>Period</th>
                <th>Order</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={item.id}>
                  <td>
                    <strong>{item.organization}</strong>
                  </td>
                  <td>{item.position}</td>
                  <td>
                    {item.start_date?.slice(0, 7) ?? '—'}
                    {item.is_current ? ' – present' : item.end_date ? ` – ${item.end_date.slice(0, 7)}` : ''}
                  </td>
                  <td>
                    <button
                      type="button"
                      className="btn btn--text"
                      onClick={() => move(index, -1)}
                      disabled={index === 0}
                      aria-label={`Move ${item.position} up`}
                    >
                      Up
                    </button>
                    <button
                      type="button"
                      className="btn btn--text"
                      onClick={() => move(index, 1)}
                      disabled={index === items.length - 1}
                      aria-label={`Move ${item.position} down`}
                    >
                      Down
                    </button>
                  </td>
                  <td>
                    <button type="button" className="btn btn--text" onClick={() => editItem(item)}>
                      Edit
                    </button>
                    <button
                      type="button"
                      className="btn btn--text"
                      onClick={() => handleDelete(item)}
                      style={{ color: '#7a2e1e' }}
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
