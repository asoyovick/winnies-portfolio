import { getServerAdmin } from '@/lib/admin-helpers';

const NAV = [
  { href: '/admin', label: 'Dashboard', icon: '🏠' },
  { href: '/admin/profile', label: 'Profile', icon: '👤' },
  { href: '/admin/experience', label: 'Experience', icon: '💼' },
  { href: '/admin/education', label: 'Education', icon: '🎓' },
  { href: '/admin/expertise', label: 'Expertise', icon: '⚖️' },
  { href: '/admin/articles', label: 'Insights', icon: '📝' },
  { href: '/admin/media', label: 'Media library', icon: '🖼️' },
  { href: '/admin/inquiries', label: 'Inquiries', icon: '✉️' },
];

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
      <aside className="admin-sidebar" aria-label="Main navigation">
        <div className="admin-sidebar__brand">
          <div className="admin-sidebar__mark">WAO</div>
          <div className="admin-sidebar__name">Winnie Awuor Otieno</div>
        </div>
        <nav className="admin-sidebar__nav">
          {NAV.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="admin-sidebar__item"
            >
              <span className="admin-sidebar__icon">{item.icon}</span>
              {item.label}
            </a>
          ))}
        </nav>
        <div className="admin-sidebar__footer">
          <a href="/admin/login?action=logout" className="admin-sidebar__logout">
            Sign out
          </a>
        </div>
      </aside>
      <div className="admin-canvas">{children}</div>
    </div>
  );
}
