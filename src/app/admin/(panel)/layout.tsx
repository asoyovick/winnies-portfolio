import type { Metadata } from 'next';
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
  // Authentication is enforced by middleware; this layout simply renders the
  // admin shell for already-authenticated requests.
  await getServerAdmin();

  return (
    <div className="admin-shell">
      <AdminNav />
      <div className="admin-canvas">{children}</div>
    </div>
  );
}
