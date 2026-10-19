import { getServerAdmin } from '@/lib/admin-helpers';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';

export default async function InquiriesPage() {
  const session = await getServerAdmin();
  if ('redirect' in session) redirect(session.redirect);
  const inquiries = db.prepare('SELECT * FROM contact_inquiries ORDER BY created_at DESC').all() as any[];
  return (
    <div className="admin-canvas">
      <h1 className="admin-canvas__title">Contact inquiries</h1>
      <p className="admin-canvas__sub">
        Messages sent through the public contact form. Not visible to the public.
      </p>
      {inquiries.length === 0 ? (
        <p className="admin-empty">No inquiries yet.</p>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th style={{ width: '170px' }}>Name</th>
              <th style={{ width: '220px' }}>Email</th>
              <th>Subject</th>
              <th style={{ width: '130px' }}>Received</th>
              <th style={{ width: '100px' }}>Status</th>
              <th style={{ width: '150px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {inquiries.map((item) => (
              <tr key={item.id}>
                <td>{item.name}</td>
                <td>{item.email}</td>
                <td>{item.subject}</td>
                <td>{new Date(item.created_at).toLocaleDateString('en-GB')}</td>
                <td>
                  <span className={`admin-badge ${item.is_read ? 'admin-badge--ongoing' : ''}`}>
                    {item.is_read ? 'Read' : 'Unread'}
                  </span>
                </td>
                <td>
                  <button
                    onClick={() => viewInquiry(item.id, item.name, item.email, item.subject, item.message)}
                    className="btn btn--text"
                    style={{ padding: '0.2rem 0.5rem', fontSize: '0.8rem' }}
                  >
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function viewInquiry(id: number, name: string, email: string, subject: string, message: string) {
  const detail = [
    `From: ${name} <${email}>`,
    `Subject: ${subject}`,
    '',
    message,
  ].join('\n');
  if (window.confirm(detail + '\n\nMark as read?')) {
    fetch(`/api/admin/inquiries/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': getCsrf(), Cookie: `portfolio_csrf=${getCsrf()}` },
      body: JSON.stringify({ is_read: true }),
    }).then(() => window.location.reload());
  }
}

function getCsrf(): string {
  const m = document.cookie.match(/(?:^|; )portfolio_csrf=([^;]+)/);
  return (m && m[1]) || '';
}
