import Image from 'next/image';
import { getProfile } from '@/lib/content';
import { Reveal } from './Reveal';

/**
 * A short editorial spread about the place the practice is based in.
 *
 * The photographs are real pictures of Kisumu taken by named photographers and
 * published under CC BY-SA licences; they show the town the practice works in,
 * never Winnie's own premises. Credits sit under each picture and in the
 * footer.
 */
export default async function Place() {
  const profile = await getProfile();

  return (
    <section id="place" className="section section--alt" aria-labelledby="place-heading">
      <div className="wrap">
        <Reveal>
          <div className="place__head">
            <span className="section-badge">Regional Presence</span>
            <h2 id="place-heading" className="section__head">
              Kisumu &amp; Western Kenya
            </h2>
            <p className="place__lead">
              The practice is based in Kisumu, on the shore of Lake Victoria.
              Work comes from NGOs, SACCOs and corporate businesses in the town
              and across the Western Kenya economic corridor.
            </p>
          </div>
        </Reveal>

        <Reveal>
          <div className="place__grid">
            <figure className="place__figure place__figure--large">
              <div className="place__frame">
                <Image
                  src="/images/kisumu-city.jpg"
                  alt="View across the green grounds of Kisumu towards the town centre and Lake Victoria."
                  width={1632}
                  height={1224}
                  sizes="(max-width: 900px) 92vw, 62vw"
                  className="place__image"
                />
              </div>
              <figcaption className="place__caption">
                <span className="place__caption-pill">Commercial Hub</span>
                <span>Kisumu, with the lake behind the town. Victor Ochieng, CC BY-SA 2.0.</span>
              </figcaption>
            </figure>

            <figure className="place__figure place__figure--a">
              <div className="place__frame">
                <Image
                  src="/images/kisumu-lake-landing.jpg"
                  alt="Fishing boats moored at the landing sites on Lake Victoria at Kisumu."
                  width={1920}
                  height={1275}
                  sizes="(max-width: 900px) 92vw, 40vw"
                  className="place__image"
                />
              </div>
              <figcaption className="place__caption">
                <span className="place__caption-pill">Lake Basin</span>
                <span>Landing sites on Lake Victoria. Josep M. Gracia, CC BY-SA 4.0.</span>
              </figcaption>
            </figure>

            <figure className="place__figure place__figure--b">
              <div className="place__frame">
                <Image
                  src="/images/kisumu-night.jpg"
                  alt="A lit street in Kisumu at night with cars parked along the road."
                  width={1920}
                  height={1280}
                  sizes="(max-width: 900px) 92vw, 50vw"
                  className="place__image"
                />
              </div>
              <figcaption className="place__caption">
                <span className="place__caption-pill">Urban Center</span>
                <span>Kisumu by evening. Victor Ochieng, CC BY-SA 2.0.</span>
              </figcaption>
            </figure>

            <div className="place__facts-card">
              <div className="place__facts-header">
                <span className="place__facts-title">Regional Practice Profile</span>
              </div>
              <div className="place__facts">
                <div className="place__fact">
                  <span className="place__fact-label">Base of Operations</span>
                  <span className="place__fact-value">{profile?.location || 'Kisumu, Kenya'}</span>
                </div>
                <div className="place__fact">
                  <span className="place__fact-label">Client Focus</span>
                  <span className="place__fact-value">
                    NGOs, SACCOs &amp; Corporate Enterprises
                  </span>
                </div>
                <div className="place__fact">
                  <span className="place__fact-label">Core Scope</span>
                  <span className="place__fact-value">
                    Tax compliance, statutory audits &amp; financial reporting
                  </span>
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
