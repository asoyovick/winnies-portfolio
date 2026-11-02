import Image from 'next/image';
import { getMediaAsset, getProfile } from '@/lib/content';

/**
 * Homepage hero — full-screen picture format.
 *
 * One photograph fills the screen under a dark screen, hairline rules divide
 * the view into columns, and the statement, the lead and one action sit at the
 * centre. The picture is the practice's own working photograph — tax returns
 * and figures on the desk — until Winnie uploads a photograph of her own.
 */
export default async function Hero() {
  const profile = await getProfile();

  const heading = (
    profile?.hero_heading || 'Clear numbers.\nA calmer kind of business.'
  )
    .trim()
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const subheading = (
    profile?.hero_subheading ||
    'I work across tax compliance, financial audits and accounting so businesses meet their obligations and understand their finances.'
  ).trim();

  const eyebrow = profile?.professional_title || 'Accountant';

  // A working photograph of the practice: tax papers, figures and a
  // calculator. Upgraded to Winnie's own photograph when she uploads one.
  let heroSrc = '/images/accounting-tax.jpg';
  const heroAlt =
    'Printed tax returns, a calculator and a folder of figures spread across a working desk.';
  if (profile?.profile_image_id) {
    const asset = await getMediaAsset(profile.profile_image_id);
    if (asset) {
      heroSrc = `/api/media/${encodeURIComponent(asset.storage_name)}`;
    }
  }

  return (
    <section id="top" className="w-hero" aria-labelledby="hero-heading">
      <div className="w-hero__media">
        <Image
          src={heroSrc}
          alt={heroAlt}
          fill
          priority
          sizes="100vw"
          className="w-hero__photo"
        />
        <div className="w-hero__screen" aria-hidden="true" />
        {/* The hairline columns that hold the picture together. */}
        <div className="w-hero__columns" aria-hidden="true">
          <span />
          <span />
          <span />
          <span />
          <span />
        </div>
      </div>

      <div className="w-hero__content">
        <p className="w-hero__eyebrow">
          <span className="w-hero__eyebrow-name">Winnie</span>
          <span>{eyebrow}</span>
        </p>

        <h1 id="hero-heading" className="w-hero__title">
          {heading.map((line, index) => (
            <span key={index}>{line}</span>
          ))}
        </h1>

        <p className="w-hero__lead">{subheading}</p>

        <a href="#contact" className="w-hero__cta">
          <span className="w-hero__cta-label">Start a conversation</span>
          <span className="w-hero__cta-circle" aria-hidden="true">
            <svg
              className="w-hero__cta-arrow w-hero__cta-arrow--out"
              viewBox="0 0 16 16"
              width="15"
              height="15"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path d="M4 12 12 4M5.5 4H12v6.5" />
            </svg>
            <svg
              className="w-hero__cta-arrow w-hero__cta-arrow--in"
              viewBox="0 0 16 16"
              width="15"
              height="15"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path d="M4 12 12 4M5.5 4H12v6.5" />
            </svg>
          </span>
        </a>
      </div>

      <div className="w-hero__foot">
        <div className="w-wrap w-hero__foot-grid">
          <p className="w-hero__foot-note">
            Considered accounting. Human perspective.
          </p>
          <p className="w-hero__foot-tags">
            Bookkeeping / Reporting / Financial clarity
          </p>
          <a href="#note" className="w-hero__foot-scroll">
            <span>Scroll to explore</span>
            <svg
              viewBox="0 0 16 16"
              width="12"
              height="12"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              aria-hidden="true"
            >
              <path d="M8 2v11M3.5 9.5 8 14l4.5-4.5" />
            </svg>
          </a>
        </div>
      </div>
    </section>
  );
}
