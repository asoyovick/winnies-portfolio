'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { adminRequest, refreshCsrfToken } from '@/lib/admin-client';

type ExpItem = {
  id: number;
  title: string;
  description: string;
  category: string;
  display_order: number;
  is_featured: boolean;
};

const EMPTY = { title: '', description: '', category: '', display_order: 0, is_featured: false };

export default function ExpertisePage() {
  const [items, setItems] = useState<ExpItem[]>([]);
  const [editing, setEditing] = useState<number | null>(null);
  const [values, setValues] = useState(EMPTY);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const result = await adminRequest<ExpItem[]>('/api/expertise');
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

    const result =
      editing === null
        ? await adminRequest('/api/expertise', { method: 'POST', body: values })
        : await adminRequest('/api/expertise', { method: 'PUT', body: { id: editing, ...values } });

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

    const first = await adminRequest('/api/expertise', {
      method: 'PUT',
      body: { id: current.id, display_order: other.display_order },
    });
    const second = await adminRequest('/api/expertise', {
      method: 'PUT',
      body: { id: other.id, display_order: current.display_order },
    });
    if (!first.ok || !second.ok) {
      setError(first.ok ? second.error : first.error);
      return;
    }
    await load();
  }

  async function toggleFeatured(item: ExpItem) {
    setError('');
    const result = await adminRequest('/api/expertise', {
      method: 'PUT',
      body: { id: item.id, is_featured: !item.is_featured },
    });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    await load();
  }

  async function handleDelete(item: ExpItem) {
    if (!window.confirm(`Delete “${item.title}”?`)) return;
    setError('');
    const result = await adminRequest(`/api/expertise?id=${item.id}&confirm=delete`, {
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
      title: item.title,
      description: item.description,
      category: item.category,
      display_order: item.display_order,
      is_featured: item.is_featured,
    });
  }

  return (
    <div>
      <div className="admin-canvas__head">
        <div>
          <h1 className="admin-canvas__title">Expertise</h1>
          <p className="admin-canvas__sub">
            The areas of practice shown on the public site. Areas marked “on the
            homepage” appear in the summary band under the hero headline.
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
          {editing === null ? 'Add an area' : 'Edit area'}
        </h2>
        <form className="admin-form" onSubmit={handleSave} noValidate>
          <div className="field">
            <label htmlFor="exp-title">Title</label>
            <input
              id="exp-title"
              value={values.title}
              onChange={(e) => setValues({ ...values, title: e.target.value })}
            />
          </div>
          <div className="field">
            <label htmlFor="exp-category">Group</label>
            <input
              id="exp-category"
              value={values.category}
              placeholder="Tax, Audit, Advisory…"
              onChange={(e) => setValues({ ...values, category: e.target.value })}
            />
            <p className="admin-form__help">
              Areas in the same group sit together on the public site.
            </p>
          </div>
          <div className="field">
            <label htmlFor="exp-description">Description</label>
            <textarea
              id="exp-description"
              rows={4}
              value={values.description}
              onChange={(e) => setValues({ ...values, description: e.target.value })}
            />
          </div>
          <div className="field" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <input
              id="exp-featured"
              type="checkbox"
              checked={values.is_featured}
              onChange={(e) => setValues({ ...values, is_featured: e.target.checked })}
            />
            <label htmlFor="exp-featured" style={{ marginBottom: 0 }}>
              Show in the homepage summary
            </label>
          </div>
          <div className="admin-actions-row">
            <button type="submit" className="btn">
              {editing === null ? 'Add area' : 'Save changes'}
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
        <h2 className="admin-section__title">Areas</h2>
        {loading ? (
          <p className="admin-note">Loading…</p>
        ) : items.length === 0 ? (
          <p className="admin-empty">No expertise areas yet.</p>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Group</th>
                <th>Homepage</th>
                <th>Order</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={item.id}>
                  <td>
                    <strong>{item.title}</strong>
                  </td>
                  <td>{item.category || '—'}</td>
                  <td>
                    <button
                      type="button"
                      className="btn btn--text"
                      onClick={() => toggleFeatured(item)}
                    >
                      {item.is_featured ? 'Shown' : 'Hidden'}
                    </button>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="btn btn--text"
                      onClick={() => move(index, -1)}
                      disabled={index === 0}
                      aria-label={`Move ${item.title} up`}
                    >
                      Up
                    </button>
                    <button
                      type="button"
                      className="btn btn--text"
                      onClick={() => move(index, 1)}
                      disabled={index === items.length - 1}
                      aria-label={`Move ${item.title} down`}
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
