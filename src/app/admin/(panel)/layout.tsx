import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getServerAdmin } from '@/lib/admin-helpers';
import { AdminNav } from '@/components/admin/AdminNav';

// The administration area must never appear in a search result.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // The session is verified here, where the database is already open. The
  // proxy only checks that a session cookie is present.
  const session = await getServerAdmin();
  if ('redirect' in session) {
    redirect('/admin/login');
  }

  return (
    <div className="admin-shell">
      <AdminNav />
      <div className="admin-canvas">{children}</div>
    </div>
  );
}
