'use client';

import React, { useEffect, useRef, useState } from 'react';

/**
 * Reveals children once the section reaches the viewport.
 *
 * The check runs on every scroll event, not only through an IntersectionObserver:
 * when a page is scrolled in jumps, sections can be passed over without ever
 * intersecting the viewport, and they would otherwise stay invisible. Without
 * JavaScript the content stays visible.
 */
export function Reveal({
  children,
  stagger = 80,
}: {
  children: React.ReactNode;
  stagger?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    // With reduced motion the stylesheet keeps the content visible, so nothing
    // needs to be switched on here.
    let done = false;

    const reveal = () => {
      if (done) return;
      done = true;
      setVisible(true);
      window.removeEventListener('scroll', check);
      window.removeEventListener('resize', check);
      observer?.disconnect();
    };

    const check = () => {
      const rect = element.getBoundingClientRect();
      const distance = rect.top - window.innerHeight;

      // It has come into view, or it has been scrolled past in one jump.
      if (distance < window.innerHeight * 0.92) {
        reveal();
        return;
      }

      // Too far down to animate honestly. Show it now rather than leaving a
      // hole in the page for content the reader has not reached yet.
      if (distance > window.innerHeight * 2.5) {
        reveal();
      }
    };

    const observer =
      typeof IntersectionObserver !== 'undefined'
        ? new IntersectionObserver(
            (entries) => {
              if (entries.some((entry) => entry.isIntersecting)) reveal();
            },
            { threshold: 0 }
          )
        : null;

    observer?.observe(element);
    window.addEventListener('scroll', check, { passive: true });
    window.addEventListener('resize', check);
    check();

    return () => {
      window.removeEventListener('scroll', check);
      window.removeEventListener('resize', check);
      observer?.disconnect();
    };
  }, []);

  return (
    <div ref={ref} className="reveal-wrapper">
      {React.Children.map(children, (child, index) => {
        if (!React.isValidElement(child)) return child;
        return (
          <div
            key={index}
            className={`reveal-item${visible ? ' reveal-item--visible' : ''}`}
            style={{
              transitionDelay: `${index * stagger}ms`,
            }}
          >
            {child}
          </div>
        );
      })}
    </div>
  );
}
