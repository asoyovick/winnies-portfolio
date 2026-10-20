'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';

const LINKS = [
  { href: '#about', label: 'About' },
  { href: '#expertise', label: 'Expertise' },
  { href: '#experience', label: 'Experience' },
  { href: '#insights', label: 'Insights' },
  { href: '#contact', label: 'Contact' },
];

export function Nav() {
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

  return (
    <>
      <header
        className={`site-header${overHero ? ' site-header--over-hero' : ''}${
          scrolled ? ' site-header--solid' : ''
        }`}
      >
        <div className="wrap nav-inner">
          <a href="/#home" className="wordmark" onClick={close}>
            Winnie Awuor Otieno
          </a>
          <nav className="nav-links" aria-label="Main navigation">
            {LINKS.map((link) => (
              <a key={link.href} href={`/${link.href}`} className="nav-link">
                {link.label}
              </a>
            ))}
          </nav>
          <a href="/#contact" className="btn btn--nav">
            Get in touch
          </a>
          <button
            ref={toggleRef}
            className="nav-toggle"
            aria-expanded={open}
            aria-controls="mobile-menu"
            onClick={() => setOpen((o) => !o)}
          >
            {open ? 'Close' : 'Menu'}
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
            <ul className="mobile-sheet__list">
              <li>
                <a href="/#home" className="mobile-link" onClick={close}>
                  Home
                </a>
              </li>
              {LINKS.map((link) => (
                <li key={link.href}>
                  <a href={`/${link.href}`} className="mobile-link" onClick={close}>
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
            <button type="button" className="mobile-link mobile-link--close" onClick={close}>
              Close menu
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
