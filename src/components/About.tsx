import { getProfile } from '@/lib/content';
import { Reveal } from './Reveal';

export default function About() {
  const profile = getProfile();
  const biography = profile?.biography || '';

  return (
    <section id="about" className="section" aria-labelledby="about-heading">
      <Reveal>
        <h2 id="about-heading" className="section__head">About</h2>
        <div className="about">
          <p className="about__lead">
            {profile?.display_name} is an accounting, audit and tax
            professional based in Kisumu, Kenya.
          </p>
          <div className="about__text">
            {biography.split('\n\n').map((paragraph, i) => (
              <p key={i} className="about__para">
                {paragraph}
              </p>
            ))}
          </div>
          <p className="about__close">
            <span className="about__highlight">
              Get in touch about your tax, audit or accounting needs.
            </span>
          </p>
        </div>
      </Reveal>
    </section>
  );
}
