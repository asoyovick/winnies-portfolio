import Link from 'next/link';
import { getProfile, getMediaAsset } from '@/lib/content';

export default function Hero() {
  const profile = getProfile() ?? undefined;
  let portraitSrc: string | null = null;
  if (profile?.profile_image_id) {
    const asset = getMediaAsset(profile.profile_image_id);
    if (asset) {
      portraitSrc = `/api/media/${encodeURIComponent(asset.storage_name)}`;
    }
  }

  return (
    <section id="home" className="hero" aria-labelledby="hero-heading">
      <div className="hero__pad">
        <div className="hero__grid">
          {portraitSrc ? (
            <figure className="hero__portrait">
              <img
                src={portraitSrc}
                alt={`Portrait of ${profile?.display_name ?? ''}`}
                width={400}
                height={400}
                loading="eager"
              />
            </figure>
          ) : null}
          <div className="hero__statement">
            <h1 id="hero-heading" className="hero__name">
              <span className="hero__line masked" data-line="1">
                {profile?.display_name ?? 'Winnie Awuor Otieno'}
              </span>
              <br />
              <span className="hero__line masked" data-line="2">
                Accounting, audit &amp; tax
              </span>
            </h1>
            <p className="hero__statement-text hero__reveal" style={{ transitionDelay: '1100ms' }}>
              {profile?.hero_text ?? 'Tax compliance, financial audit and bookkeeping for NGOs, SACCOs and corporate clients in Kisumu, Kenya.'}
            </p>
            <div className="hero__actions">
              <a href="#contact" className="btn hero__reveal" style={{ transitionDelay: '1200ms' }}>
                Discuss a Service
              </a>
              <Link href="#experience" className="btn btn--text hero__reveal" style={{ transitionDelay: '1200ms' }}>
                View Experience
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
