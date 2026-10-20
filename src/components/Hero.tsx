import { getExperience, getExpertise, getMediaAsset, getProfile } from '@/lib/content';

/**
 * Homepage hero.
 *
 * Composition follows reference 2: a strong headline on the left, the person
 * on the right, and a lower band that introduces the main themes of the work.
 * The headline, the supporting line and the portrait are all editable from the
 * admin panel, so nothing here is hard-coded copy.
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

  const allExpertise = getExpertise();
  const featured = allExpertise.filter((item) => Boolean(item.is_featured));
  const themes = (featured.length > 0 ? featured : allExpertise).slice(0, 5);

  let portraitSrc: string | null = null;
  if (profile?.profile_image_id) {
    const asset = getMediaAsset(profile.profile_image_id);
    if (asset) {
      portraitSrc = `/api/media/${encodeURIComponent(asset.storage_name)}`;
    }
  }

  return (
    <section id="home" className="hero" aria-labelledby="hero-heading">
      <div className="wrap hero__grid">
        <div className="hero__statement">
          <h1 id="hero-heading" className="hero__title">
            {headingLines.map((line, index) => (
              <span className="hero__title-line" key={index}>
                {line}
              </span>
            ))}
          </h1>
          {subheading ? <p className="hero__lead">{subheading}</p> : null}
          <div className="hero__actions">
            <a href="#contact" className="btn">
              Get in touch
            </a>
            <a href="#experience" className="hero__secondary">
              Explore my experience <span aria-hidden="true">→</span>
            </a>
          </div>
        </div>

        <div className="hero__aside">
          {portraitSrc ? (
            <figure className="hero__portrait">
              <img
                src={portraitSrc}
                alt={`${profile?.display_name ?? 'Winnie Awuor Otieno'}, ${profile?.professional_title ?? 'accounting, audit and tax professional'}`}
                width={720}
                height={900}
                loading="eager"
                decoding="async"
              />
            </figure>
          ) : (
            <div className="hero__panel">
              <p className="hero__panel-name">{profile?.display_name}</p>
              <p className="hero__panel-title">{profile?.professional_title}</p>
              <dl className="hero__panel-facts">
                <div className="hero__fact">
                  <dt>Based in</dt>
                  <dd>{profile?.location}</dd>
                </div>
                {currentRole ? (
                  <div className="hero__fact">
                    <dt>Current role</dt>
                    <dd>
                      {currentRole.position}, {currentRole.organization}
                    </dd>
                  </div>
                ) : null}
                <div className="hero__fact">
                  <dt>Works with</dt>
                  <dd>NGOs, SACCOs and corporate businesses</dd>
                </div>
              </dl>
            </div>
          )}
        </div>
      </div>

      {themes.length > 0 ? (
        <div className="wrap">
          <ul className="hero__themes">
            {themes.map((area, index) => (
              <li key={area.id}>
                {index > 0 ? (
                  <span aria-hidden="true" className="hero__themes-sep">
                    ·
                  </span>
                ) : null}
                <a href="#expertise">{area.title}</a>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
