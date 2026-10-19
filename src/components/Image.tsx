'use client';

import Image from 'next/image';

/**
 * Optimized, responsive image with lazy loading and meaningful alt text.
 * Uses square corners per the design system (no rounded-card ornament).
 */
export function PortfolioImage({
  src,
  alt,
  width,
  height,
  className,
  priority = false,
}: {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
}) {
  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={className}
      priority={priority}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      sizes="(max-width: 768px) 88vw, 60vw"
      style={{ borderRadius: 0 }}
    />
  );
}
