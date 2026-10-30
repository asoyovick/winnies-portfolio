'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINKS = [
  { href: '#about', label: 'About' },
  { href: '#expertise', label: 'Expertise' },
  { href: '#experience', label: 'Experience' },
  { href: '#insights', label: 'Insights' },
  { href: '#contact', label: 'Contact' },
];

export function NavBar({ pictureUrl }: { pictureUrl: string | null }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);

  // The hero sits on a dark field, so the bar is transparent and light while
  // the page is at the top of the homepage. Everywhere else — and after the
  // first scroll — it becomes a solid bar in the page colour.
  const overHero = pathname === '/' && !scrolled;

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    const handle = () => setScrolled(window.scrollY > 24);
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

  const mark = pictureUrl ? (
    <div className="nav__avatar-wrap">
      <Image
        src={pictureUrl}
        alt="Winnie Awuor Otieno"
        width={80}
        height={80}
        sizes="44px"
        className="nav__picture"
        priority
      />
      <span className="nav__status-dot" title="Available for advisory" />
    </div>
  ) : (
    <div className="nav__avatar-wrap">
      <span className="nav__mark" role="img" aria-label="Winnie Awuor Otieno">
        WA
      </span>
      <span className="nav__status-dot" title="Available for advisory" />
    </div>
  );

  return (
    <>
      <header
        className={`site-header${overHero ? ' site-header--over-hero' : ''}${
          scrolled ? ' site-header--solid' : ''
        }`}
      >
        <div className="wrap nav-inner">
          <Link href="/#home" className="wordmark" onClick={close}>
            {mark}
            <div className="wordmark__text">
              <span className="wordmark__name">Winnie Awuor Otieno</span>
              <span className="wordmark__role">Audit · Tax · Advisory</span>
            </div>
          </Link>
          <nav className="nav-links" aria-label="Main navigation">
            {LINKS.map((link) => (
              <Link key={link.href} href={`/${link.href}`} className="nav-link">
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="nav-actions">
            <Link href="/#contact" className="btn btn--nav">
              Get in touch
            </Link>
          </div>
          <button
            ref={toggleRef}
            className="nav-toggle"
            aria-expanded={open}
            aria-controls="mobile-menu"
            onClick={() => setOpen((o) => !o)}
          >
            <span className="nav-toggle__bar" />
            <span className="nav-toggle__bar" />
            <span className="visually-hidden">{open ? 'Close' : 'Menu'}</span>
          </button>
        </div>
      </header>

      {open ? (
        <div
          id="mobile-menu"
          className="mobile-sheet"
          role="dialog"
          aria-modal="true"
          aria-label="Site navigation"
        >
          <div className="mobile-sheet__inner">
            <div className="mobile-sheet__head">
              <span className="mobile-sheet__title">Navigation</span>
              <button
                type="button"
                className="mobile-sheet__close"
                onClick={close}
                aria-label="Close menu"
              >
                ✕
              </button>
            </div>
            <ul className="mobile-sheet__list">
              <li>
                <Link href="/#home" className="mobile-link" onClick={close}>
                  Home
                </Link>
              </li>
              {LINKS.map((link) => (
                <li key={link.href}>
                  <Link href={`/${link.href}`} className="mobile-link" onClick={close}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="mobile-sheet__actions">
              <Link href="/#contact" className="btn btn--primary btn--mobile" onClick={close}>
                Schedule a Consultation
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
