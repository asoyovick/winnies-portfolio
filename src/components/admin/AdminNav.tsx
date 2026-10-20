'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export const ADMIN_NAV = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/profile', label: 'Profile' },
  { href: '/admin/experience', label: 'Experience' },
  { href: '/admin/education', label: 'Education' },
  { href: '/admin/expertise', label: 'Expertise' },
  { href: '/admin/articles', label: 'Insights' },
  { href: '/admin/media', label: 'Media library' },
  { href: '/admin/inquiries', label: 'Inquiries' },
];

function isActive(pathname: string, href: string) {
  if (href === '/admin') return pathname === '/admin';
  return pathname.startsWith(href);
}

/**
 * Administration navigation.
 *
 * A labelled sidebar on the desktop; on a phone the same destinations fold
 * into a sheet behind one button.
 */
export function AdminNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open]);

  return (
    <>
      <div className="admin-topbar">
        <Link href="/admin" className="admin-topbar__brand">
          <span className="admin-sidebar__mark" aria-hidden="true">
            WA
          </span>
          <span className="admin-topbar__name">Portfolio admin</span>
        </Link>
        <button
          type="button"
          className="admin-topbar__toggle"
          aria-expanded={open}
          aria-controls="admin-menu"
          onClick={() => setOpen((o) => !o)}
        >
          {open ? 'Close' : 'Menu'}
        </button>
      </div>

      {open ? (
        <div
          id="admin-menu"
          className="admin-sheet"
          role="dialog"
          aria-modal="true"
          aria-label="Administration menu"
        >
          <ul className="admin-sheet__list">
            {ADMIN_NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`admin-sheet__link${
                    isActive(pathname, item.href) ? ' admin-sheet__link--active' : ''
                  }`}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
          <a href="/admin/login?action=logout" className="admin-sheet__link">
            Sign out
          </a>
        </div>
      ) : null}

      <aside className="admin-sidebar" aria-label="Main navigation">
        <div className="admin-sidebar__brand">
          <span className="admin-sidebar__mark" aria-hidden="true">
            WA
          </span>
          <span className="admin-sidebar__name">Winnie Awuor Otieno</span>
        </div>
        <nav className="admin-sidebar__nav">
          {ADMIN_NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`admin-sidebar__item${
                isActive(pathname, item.href) ? ' admin-sidebar__item--active' : ''
              }`}
              aria-current={isActive(pathname, item.href) ? 'page' : undefined}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="admin-sidebar__footer">
          <a href="/" className="admin-sidebar__logout">
            View website
          </a>
          <a href="/admin/login?action=logout" className="admin-sidebar__logout">
            Sign out
          </a>
        </div>
      </aside>
    </>
  );
}
