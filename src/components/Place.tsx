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
export default function Place() {
  const profile = getProfile();

  return (
    <section id="place" className="section" aria-labelledby="place-heading">
      <div className="wrap">
        <Reveal>
          <div className="place__head">
            <h2 id="place-heading" className="section__head">
              Kisumu
            </h2>
            <p className="place__lead">
              The practice is based in Kisumu, on the shore of Lake Victoria.
              Work comes from NGOs, SACCOs and corporate businesses in the town
              and the county around it.
            </p>
          </div>
        </Reveal>

        <Reveal>
          <div className="place__grid">
            <figure className="place__figure place__figure--large">
              <Image
                src="/images/kisumu-city.jpg"
                alt="View across the green grounds of Kisumu towards the town centre and Lake Victoria."
                width={1632}
                height={1224}
                sizes="(max-width: 900px) 92vw, 62vw"
                className="place__image"
              />
              <figcaption className="place__caption">
                Kisumu, with the lake behind the town. Photograph by Victor
                Ochieng, CC BY-SA 2.0, via Wikimedia Commons.
              </figcaption>
            </figure>

            <figure className="place__figure place__figure--a">
              <Image
                src="/images/kisumu-lake-landing.jpg"
                alt="Fishing boats moored at the landing sites on Lake Victoria at Kisumu."
                width={1920}
                height={1275}
                sizes="(max-width: 900px) 92vw, 40vw"
                className="place__image"
              />
              <figcaption className="place__caption">
                Landing sites on Lake Victoria. Photograph by Josep M. Gracia,
                CC BY-SA 4.0, via Wikimedia Commons.
              </figcaption>
            </figure>

            <figure className="place__figure place__figure--b">
              <Image
                src="/images/kisumu-night.jpg"
                alt="A lit street in Kisumu at night with cars parked along the road."
                width={1920}
                height={1280}
                sizes="(max-width: 900px) 92vw, 50vw"
                className="place__image"
              />
              <figcaption className="place__caption">
                Kisumu at night. Photograph by Victor Ochieng, CC BY-SA 2.0, via
                Wikimedia Commons.
              </figcaption>
            </figure>

            <div className="place__facts">
              <p className="place__fact">
                <span className="place__fact-label">Based in</span>
                <span className="place__fact-value">{profile?.location}</span>
              </p>
              <p className="place__fact">
                <span className="place__fact-label">Clients</span>
                <span className="place__fact-value">
                  NGOs, SACCOs and corporate businesses
                </span>
              </p>
              <p className="place__fact">
                <span className="place__fact-label">Work</span>
                <span className="place__fact-value">
                  Tax compliance, audit and accounting
                </span>
              </p>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
