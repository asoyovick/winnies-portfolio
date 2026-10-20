'use client';

import { Fragment, useState } from 'react';
import { adminRequest } from '@/lib/admin-client';
import { formatDateTime } from '@/lib/format';

type Inquiry = {
  id: number;
  name: string;
  email: string;
  subject: string;
  message: string;
  is_read: number;
  created_at: string;
};

export function InquiriesPanel({ inquiries }: { inquiries: Inquiry[] }) {
  const [items, setItems] = useState(inquiries);
  const [openId, setOpenId] = useState<number | null>(null);
  const [error, setError] = useState('');

  async function markRead(id: number, isRead: boolean) {
    setError('');
    const result = await adminRequest(`/api/admin/inquiries/${id}`, {
      method: 'PATCH',
      body: { is_read: isRead },
    });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setItems((current) =>
      current.map((item) => (item.id === id ? { ...item, is_read: isRead ? 1 : 0 } : item))
    );
  }

  async function remove(item: Inquiry) {
    if (!window.confirm(`Delete the inquiry from ${item.name}?`)) return;
    setError('');
    const result = await adminRequest(`/api/admin/inquiries/${item.id}?confirm=delete`, {
      method: 'DELETE',
    });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setItems((current) => current.filter((row) => row.id !== item.id));
  }

  if (items.length === 0) {
    return <p className="admin-empty">No inquiries yet.</p>;
  }

  return (
    <>
      {error ? (
        <p className="admin-login__error" role="alert">
          {error}
        </p>
      ) : null}
      <table className="admin-table">
        <thead>
          <tr>
            <th>From</th>
            <th>Subject</th>
            <th>Received</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <Fragment key={item.id}>
              <tr>
                <td>
                  <strong>{item.name}</strong>
                  <br />
                  <a href={`mailto:${item.email}`}>{item.email}</a>
                </td>
                <td>{item.subject || '—'}</td>
                <td>{formatDateTime(item.created_at)}</td>
                <td>
                  <span className={`admin-badge${item.is_read ? '' : ' admin-badge--ongoing'}`}>
                    {item.is_read ? 'Read' : 'Unread'}
                  </span>
                </td>
                <td>
                  <button
                    type="button"
                    className="btn btn--text"
                    onClick={() => setOpenId(openId === item.id ? null : item.id)}
                    aria-expanded={openId === item.id}
                  >
                    {openId === item.id ? 'Hide' : 'Read'}
                  </button>
                  <button
                    type="button"
                    className="btn btn--text"
                    onClick={() => markRead(item.id, !item.is_read)}
                  >
                    Mark {item.is_read ? 'unread' : 'read'}
                  </button>
                  <button
                    type="button"
                    className="btn btn--text"
                    onClick={() => remove(item)}
                    style={{ color: '#7a2e1e' }}
                  >
                    Delete
                  </button>
                </td>
              </tr>
              {openId === item.id ? (
                <tr>
                  <td colSpan={5} style={{ background: 'var(--surface)' }}>
                    <p style={{ whiteSpace: 'pre-wrap' }}>{item.message}</p>
                  </td>
                </tr>
              ) : null}
            </Fragment>
          ))}
        </tbody>
      </table>
    </>
  );
}
