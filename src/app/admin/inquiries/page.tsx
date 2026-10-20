import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getServerAdmin, getServerInquiries } from '@/lib/admin-helpers';
import { InquiriesPanel } from '@/components/admin/InquiriesPanel';

export default async function InquiriesPage() {
  const session = await getServerAdmin();
  if ('redirect' in session) redirect(session.redirect);
  const inquiries = await getServerInquiries();

  return (
    <div>
      <div className="admin-canvas__head">
        <div>
          <h1 className="admin-canvas__title">Contact inquiries</h1>
          <p className="admin-canvas__sub">
            Messages sent through the public contact form. They are never shown
            on the website.
          </p>
        </div>
      </div>

      <section className="admin-section">
        <InquiriesPanel inquiries={inquiries} />
      </section>

      <div className="admin-actions-row">
        <Link href="/admin" className="btn btn--text">
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
