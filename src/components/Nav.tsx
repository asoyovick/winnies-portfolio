'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

const LINKS = [
  { href: '#home', label: 'Home' },
  { href: '#about', label: 'About' },
  { href: '#expertise', label: 'Expertise' },
  { href: '#experience', label: 'Experience' },
  { href: '#insights', label: 'Insights' },
  { href: '#contact', label: 'Contact' },
];

export function Nav() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handle = () => setOpen(false);
    window.addEventListener('scroll', handle);
    return () => window.removeEventListener('scroll', handle);
  }, []);

  return (
    <>
      <header className="site-header" role="banner">
        <div className="wrap nav-inner">
          <a href="#home" className="wordmark" aria-label="Winnie Awuor Otieno — Accounting, Audit & Tax">
            Winnie Awuor Otieno
          </a>
          <nav className="nav-links" aria-label="Main navigation">
            {LINKS.map((link) => (
              <Link key={link.href} href={link.href} className="nav-link" onClick={() => setOpen(false)}>
                {link.label}
              </Link>
            ))}
          </nav>
          <a href="#contact" className="btn btn--nav">
            Get in Touch
          </a>
          <button
            className="nav-toggle"
            aria-expanded={open}
            aria-controls="mobile-menu"
            onClick={() => setOpen((o) => !o)}
          >
            {open ? 'Close menu' : 'Menu'}
          </button>
        </div>
      </header>

      {open && (
        <div
          id="mobile-menu"
          className="mobile-sheet"
          role="dialog"
          aria-modal="true"
          aria-labelledby="mobile-menu-title"
        >
          <div className="mobile-sheet__inner">
            <h2 id="mobile-menu-title" className="visually-hidden">
              Navigation
            </h2>
            {LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="mobile-link"
                onClick={() => setOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <a href="#contact" className="mobile-link mobile-link--cta">
              Get in Touch
            </a>
            <button
              className="mobile-link mobile-link--close"
              onClick={() => setOpen(false)}
            >
              Close menu
            </button>
          </div>
        </div>
      )}
    </>
  );
}
