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
    <section id="place" className="w-section w-place" aria-labelledby="place-heading">
      <div className="w-wrap">
        <Reveal>
          <div className="w-head-row">
            <div>
              <p className="w-eyebrow">
                <span className="w-num">03</span>
                <span>Where the work happens</span>
              </p>
              <h2 id="place-heading" className="w-head">
                Kisumu &amp; <em>Western Kenya.</em>
              </h2>
            </div>
            <p className="w-lead">
              The practice is based in Kisumu, on the shore of Lake Victoria.
              Work comes from NGOs, SACCOs and corporate businesses in the town
              and across the Western Kenya economic corridor.
            </p>
          </div>
        </Reveal>

        <Reveal>
          <div className="w-place__grid">
            <figure className="w-place__figure">
              <div className="w-place__frame">
                <Image
                  src="/images/kisumu-city.jpg"
                  alt="View across the green grounds of Kisumu towards the town centre and Lake Victoria."
                  width={1632}
                  height={1224}
                  sizes="(max-width: 860px) 92vw, 58vw"
                  className="w-place__image"
                />
              </div>
              <figcaption className="w-place__caption">
                <span className="w-place__caption-label">Commercial hub</span>
                Kisumu, with the lake behind the town. Victor Ochieng, CC BY-SA 2.0.
              </figcaption>
            </figure>

            <div className="w-place__side">
              <figure className="w-place__figure w-place__figure--small">
                <div className="w-place__frame">
                  <Image
                    src="/images/kisumu-lake-landing.jpg"
                    alt="Fishing boats moored at the landing sites on Lake Victoria at Kisumu."
                    width={1920}
                    height={1275}
                    sizes="(max-width: 860px) 92vw, 36vw"
                    className="w-place__image"
                  />
                </div>
                <figcaption className="w-place__caption">
                  <span className="w-place__caption-label">Lake basin</span>
                  Landing sites on Lake Victoria. Josep M. Gracia, CC BY-SA 4.0.
                </figcaption>
              </figure>

              <div className="w-facts">
                <div className="w-facts__row">
                  <span className="w-facts__label">Practice base</span>
                  <span className="w-facts__value">
                    {profile?.location || 'Kisumu, Kenya'}
                  </span>
                </div>
                <div className="w-facts__row">
                  <span className="w-facts__label">Client focus</span>
                  <span className="w-facts__value">
                    NGOs, SACCOs &amp; corporate enterprises
                  </span>
                </div>
                <div className="w-facts__row">
                  <span className="w-facts__label">Core scope</span>
                  <span className="w-facts__value">
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
