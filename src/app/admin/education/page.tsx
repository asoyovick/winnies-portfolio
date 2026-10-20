'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { adminRequest, refreshCsrfToken } from '@/lib/admin-client';

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

const EMPTY = {
  institution: '',
  qualification: '',
  field_of_study: '',
  start_date: '',
  end_date: '',
  status: 'completed',
  description: '',
};

export default function EducationPage() {
  const [items, setItems] = useState<EduItem[]>([]);
  const [editing, setEditing] = useState<number | null>(null);
  const [values, setValues] = useState(EMPTY);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const result = await adminRequest<EduItem[]>('/api/education');
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
      end_date: values.status === 'ongoing' ? null : values.end_date || null,
    };

    const result =
      editing === null
        ? await adminRequest('/api/education', { method: 'POST', body: payload })
        : await adminRequest('/api/education', { method: 'PUT', body: { id: editing, ...payload } });

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

    const first = await adminRequest('/api/education', {
      method: 'PUT',
      body: { id: current.id, display_order: other.display_order },
    });
    const second = await adminRequest('/api/education', {
      method: 'PUT',
      body: { id: other.id, display_order: current.display_order },
    });
    if (!first.ok || !second.ok) {
      setError(first.ok ? second.error : first.error);
      return;
    }
    await load();
  }

  async function handleDelete(item: EduItem) {
    if (!window.confirm(`Delete “${item.qualification}”?`)) return;
    setError('');
    const result = await adminRequest(`/api/education?id=${item.id}&confirm=delete`, {
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

  function editItem(item: EduItem) {
    setEditing(item.id);
    setError('');
    setNotice('');
    setValues({
      institution: item.institution,
      qualification: item.qualification,
      field_of_study: item.field_of_study,
      start_date: item.start_date ? item.start_date.slice(0, 7) : '',
      end_date: item.end_date ? item.end_date.slice(0, 7) : '',
      status: item.status,
      description: item.description,
    });
  }

  return (
    <div>
      <div className="admin-canvas__head">
        <div>
          <h1 className="admin-canvas__title">Education &amp; qualifications</h1>
          <p className="admin-canvas__sub">
            Qualifications and ongoing study. A qualification still in progress
            is shown as “In progress” on the public site.
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
          {editing === null ? 'Add a qualification' : 'Edit qualification'}
        </h2>
        <form className="admin-form" onSubmit={handleSave} noValidate>
          <div className="field">
            <label htmlFor="edu-qualification">Qualification</label>
            <input
              id="edu-qualification"
              value={values.qualification}
              onChange={(e) => setValues({ ...values, qualification: e.target.value })}
            />
          </div>
          <div className="field">
            <label htmlFor="edu-institution">Institution</label>
            <input
              id="edu-institution"
              value={values.institution}
              onChange={(e) => setValues({ ...values, institution: e.target.value })}
            />
          </div>
          <div className="field">
            <label htmlFor="edu-field">Field of study</label>
            <input
              id="edu-field"
              value={values.field_of_study}
              onChange={(e) => setValues({ ...values, field_of_study: e.target.value })}
            />
          </div>
          <div className="admin-repeat">
            <div className="field">
              <label htmlFor="edu-start">Start</label>
              <input
                id="edu-start"
                type="month"
                value={values.start_date}
                onChange={(e) => setValues({ ...values, start_date: e.target.value })}
              />
            </div>
            <div className="field">
              <label htmlFor="edu-end">End</label>
              <input
                id="edu-end"
                type="month"
                disabled={values.status === 'ongoing'}
                value={values.end_date}
                onChange={(e) => setValues({ ...values, end_date: e.target.value })}
              />
            </div>
            <div className="field">
              <label htmlFor="edu-status">Status</label>
              <select
                id="edu-status"
                value={values.status}
                onChange={(e) => setValues({ ...values, status: e.target.value })}
                style={{ width: '100%', padding: '0.6rem 0.75rem', font: 'inherit', background: 'var(--surface)', border: 0, color: 'var(--ink)' }}
              >
                <option value="completed">Completed</option>
                <option value="ongoing">Ongoing</option>
              </select>
            </div>
          </div>
          <div className="field">
            <label htmlFor="edu-description">Note</label>
            <textarea
              id="edu-description"
              rows={3}
              value={values.description}
              onChange={(e) => setValues({ ...values, description: e.target.value })}
            />
          </div>
          <div className="admin-actions-row">
            <button type="submit" className="btn">
              {editing === null ? 'Add qualification' : 'Save changes'}
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
        <h2 className="admin-section__title">Qualifications</h2>
        {loading ? (
          <p className="admin-note">Loading…</p>
        ) : items.length === 0 ? (
          <p className="admin-empty">No qualifications yet.</p>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Qualification</th>
                <th>Institution</th>
                <th>Status</th>
                <th>Order</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={item.id}>
                  <td>
                    <strong>{item.qualification}</strong>
                  </td>
                  <td>{item.institution}</td>
                  <td>
                    <span
                      className={`admin-badge${
                        item.status === 'ongoing' ? ' admin-badge--ongoing' : ''
                      }`}
                    >
                      {item.status === 'ongoing' ? 'Ongoing' : 'Completed'}
                    </span>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="btn btn--text"
                      onClick={() => move(index, -1)}
                      disabled={index === 0}
                      aria-label={`Move ${item.qualification} up`}
                    >
                      Up
                    </button>
                    <button
                      type="button"
                      className="btn btn--text"
                      onClick={() => move(index, 1)}
                      disabled={index === items.length - 1}
                      aria-label={`Move ${item.qualification} down`}
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
