import Image from 'next/image';
import { getExperience, getMediaAsset, getProfile } from '@/lib/content';

const PILLARS = [
  {
    title: 'Tax compliance',
    note: 'VAT, PAYE, withholding tax and corporation tax',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
        <path d="M7 3.5h7l4 4V20a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1Z" />
        <path d="M14 3.5V8h4" />
        <path d="M9 12h6M9 16h4" />
      </svg>
    ),
  },
  {
    title: 'Financial audit',
    note: 'Audits with a tax focus',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
        <circle cx="10.5" cy="10.5" r="5.5" />
        <path d="m14.5 14.5 4.5 4.5" />
      </svg>
    ),
  },
  {
    title: 'Accounting and reporting',
    note: 'Bookkeeping, reconciliation and reporting',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
        <path d="M4 20V9M10 20V4M16 20v-7M22 20H2" />
      </svg>
    ),
  },
];

/**
 * Homepage hero.
 *
 * A full-bleed picture with the statement laid over it, the way the reference
 * does: headline and supporting line at the top left, one primary action, and
 * a band at the foot of the screen with the three main areas of work.
 *
 * The picture is Winnie's own photograph when she has uploaded one, and a
 * photograph of Kisumu — the town her practice is based in — until then.
 */
export default function Hero() {
  const profile = getProfile();

  const heading = (
    profile?.hero_heading || 'Clear thinking.\nConfident decisions.'
  ).trim();
  const headingLines = heading
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const subheading = (
    profile?.hero_subheading ||
    'I work across tax compliance, financial audits and accounting so businesses meet their obligations and understand their finances.'
  ).trim();

  const currentRole = getExperience().find((item) => Boolean(item.is_current));

  // Winnie's own photograph if there is one; otherwise the town she works in.
  let backgroundSrc = '/images/kisumu-city.jpg';
  let backgroundAlt = '';
  if (profile?.profile_image_id) {
    const asset = getMediaAsset(profile.profile_image_id);
    if (asset) {
      backgroundSrc = `/api/media/${encodeURIComponent(asset.storage_name)}`;
      backgroundAlt = '';
    }
  }

  return (
    <section id="home" className="hero" aria-labelledby="hero-heading">
      <div className="hero__media">
        <Image
          src={backgroundSrc}
          alt={backgroundAlt}
          fill
          priority
          sizes="100vw"
          className="hero__image"
        />
        <div className="hero__scrim" />
      </div>

      <div className="wrap hero__content">
        <h1 id="hero-heading" className="hero__title">
          {headingLines.map((line, index) => (
            <span className="hero__title-line" key={index}>
              {line}
            </span>
          ))}
        </h1>
        {subheading ? <p className="hero__lead">{subheading}</p> : null}
        <div className="hero__actions">
          <a href="#contact" className="btn btn--pill">
            Get in touch
          </a>
          <a
            href="#experience"
            className="hero__circle"
            aria-label="Explore my experience"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              aria-hidden="true"
            >
              <path d="M5 12h13M12 5l7 7-7 7" />
            </svg>
          </a>
        </div>
      </div>

      <div className="hero__foot">
        <div className="wrap">
          <div className="hero__foot-head">
            <p className="hero__tagline">Clear thinking. Focused on your numbers.</p>
            <p className="hero__identity">
              <span className="hero__identity-name">{profile?.display_name}</span>
              <span className="hero__identity-role">
                {currentRole
                  ? `${currentRole.position}, ${currentRole.organization}`
                  : profile?.professional_title}
                {profile?.location ? ` · ${profile.location}` : ''}
              </span>
            </p>
          </div>

          <ul className="hero__pillars">
            {PILLARS.map((pillar) => (
              <li key={pillar.title} className="hero__pillar">
                <span className="hero__pillar-mark">{pillar.icon}</span>
                <span className="hero__pillar-text">
                  <span className="hero__pillar-title">{pillar.title}</span>
                  <span className="hero__pillar-note">{pillar.note}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
