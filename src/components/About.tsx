import { getProfile } from '@/lib/content';
import { Reveal } from './Reveal';

/**
 * A note from Winnie.
 *
 * The opening section after the hero: who is writing, in her own words, and
 * the three working values the practice rests on. It reads less like a sales
 * page and more like the start of a working relationship.
 */
export default async function About() {
  const profile = await getProfile();
  const biography = (profile?.biography || '').trim();
  const paragraphs = biography
    .split('\n\n')
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  const first = paragraphs[0];
  const rest = paragraphs.slice(1);

  return (
    <section id="about" className="w-section w-note-section" aria-labelledby="about-heading">
      <div className="w-wrap w-note-section__grid">
        <Reveal>
          <div>
            <p className="w-eyebrow">
              <span className="w-num">01</span>
              <span>A note from Winnie</span>
            </p>
            <h2 id="about-heading" className="w-note-section__hello">
              Hello, I&apos;m {((profile?.display_name || 'Winnie').split(' ')[0])}.
            </h2>
            {first ? <p className="w-lead">{first}</p> : null}
          </div>
        </Reveal>

        <Reveal>
          <div>
            {rest.length > 0 ? (
              <div className="w-note-section__body">
                {rest.map((paragraph, index) => (
                  <p key={index}>{paragraph}</p>
                ))}
              </div>
            ) : null}

            <ul className="w-note-section__values">
              <li className="w-note-section__value">
                <span className="w-tag">Compliance</span>
                Tax returns filed carefully, checked against the records behind
                them.
              </li>
              <li className="w-note-section__value">
                <span className="w-tag">Audit</span>
                Financial audits carried out with a tax view of the numbers.
              </li>
              <li className="w-note-section__value">
                <span className="w-tag">Reporting</span>
                Accounting and reporting explained in plain language, always.
              </li>
            </ul>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
