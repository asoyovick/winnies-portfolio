import { getProfile } from '@/lib/content';
import { Reveal } from './Reveal';

export default async function About() {
  const profile = await getProfile();
  const biography = (profile?.biography || '').trim();
  const paragraphs = biography
    .split('\n\n')
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  return (
    <section id="about" className="section" aria-labelledby="about-heading">
      <div className="wrap about__layout">
        <div className="about__intro">
          <Reveal>
            <h2 id="about-heading" className="section__head">
              About
            </h2>
            <p className="about__lead">
              {profile?.display_name} is an accounting, audit and tax professional
              based in {profile?.location}.
            </p>
          </Reveal>
        </div>
        <Reveal>
          <div className="about__body">
            {paragraphs.map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
