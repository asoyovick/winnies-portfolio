'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINKS = [
  { href: '#about', label: 'About' },
  { href: '#expertise', label: 'Services' },
  { href: '#experience', label: 'Experience' },
  { href: '#insights', label: 'Notes' },
];

type NavBarProps = {
  pictureUrl: string | null;
  children?: React.ReactNode;
};

export function NavBar({ pictureUrl, children }: NavBarProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);

  // The header floats over the full-screen hero picture as a dark glass on
  // the home page, and sinks into a solid paper bar in every other state, so
  // the links always read cleanly.
  const solid = pathname !== '/' || scrolled;

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    const handle = () => setScrolled(window.scrollY > 16);
    handle();
    window.addEventListener('scroll', handle, { passive: true });
    return () => window.removeEventListener('scroll', handle);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        close();
        toggleRef.current?.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = '';
    };
  }, [open, close]);

  return (
    <>
      <header
        className={`w-header${solid ? ' w-header__over' : ' w-header--glass'}`}
      >
        <div className="w-wrap w-header__bar">
          <Link href="/#top" className="w-brand" onClick={close}>
            {pictureUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={pictureUrl} alt="" width={36} height={36} className="w-brand__avatar" />
            ) : null}
            <span className="w-brand__name">winnie.</span>
            <span className="w-brand__rule" aria-hidden="true" />
            <span className="w-brand__role">Accounting, with care</span>
          </Link>

          <nav className="w-nav" aria-label="Main navigation">
            {LINKS.map((link) => (
              <Link key={link.href} href={`/${link.href}`} className="w-nav__link">
                {link.label}
              </Link>
            ))}
          </nav>

          <Link href="/#contact" className="w-btn w-btn--small w-header__cta">
            <span>Let&apos;s talk</span>
            <span className="w-btn__arrow" aria-hidden="true">
              ↗
            </span>
          </Link>

          <button
            ref={toggleRef}
            className="w-nav-toggle"
            aria-expanded={open}
            aria-controls="mobile-menu"
            onClick={() => setOpen((o) => !o)}
          >
            <span className="w-nav-toggle__bar" />
            <span className="w-nav-toggle__bar" />
            <span className="visually-hidden">{open ? 'Close' : 'Menu'}</span>
          </button>
        </div>
      </header>

      {children}

      {open ? (
        <div
          id="mobile-menu"
          className="w-sheet"
          role="dialog"
          aria-modal="true"
          aria-label="Site navigation"
        >
          <div className="w-sheet__inner">
            <div className="w-sheet__head">
              <span className="w-sheet__title">Navigation</span>
              <button
                type="button"
                className="w-sheet__close"
                onClick={close}
                aria-label="Close menu"
              >
                ✕
              </button>
            </div>
            <ul className="w-sheet__list">
              <li>
                <Link href="/#top" className="w-sheet__link" onClick={close}>
                  Home
                </Link>
              </li>
              {LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={`/${link.href}`}
                    className="w-sheet__link"
                    onClick={close}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="w-sheet__actions">
              <Link
                href="/#contact"
                className="w-btn w-btn--cream"
                onClick={close}
              >
                <span>Let&apos;s talk</span>
                <span className="w-btn__arrow" aria-hidden="true">
                  ↗
                </span>
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
