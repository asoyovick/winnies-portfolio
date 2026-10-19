'use client';

import React, { useEffect, useRef, useState } from 'react';

/**
 * Reveals children once the section enters the viewport. Heading, text and
 * media are staggered. Without JavaScript the content stays visible (no
 * content is hidden behind an animation).
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
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true);
            observer.disconnect();
          }
        }
      },
      { threshold: 0.12 }
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const reducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  return (
    <div ref={ref} className="reveal-wrapper">
      {React.Children.map(children, (child, index) => {
        if (!React.isValidElement(child)) return child;
        return (
          <div
            key={index}
            className={`reveal-item ${
              visible || reducedMotion ? 'reveal-item--visible' : ''
            }`}
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
