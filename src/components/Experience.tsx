import { getExperience, formatDateRange } from '@/lib/content';
import { parseJson } from '@/lib/validation';
import { Reveal } from './Reveal';

export default async function Experience() {
  const items = (await getExperience()).map((item) => ({
    ...item,
    responsibilities: parseJson(item.responsibilities, [] as string[]),
    achievements: parseJson(item.achievements, [] as string[]),
  }));

  return (
    <section
      id="experience"
      className="section section--field"
      aria-labelledby="experience-heading"
    >
      <div className="wrap">
        <Reveal>
          <h2 id="experience-heading" className="section__head">
            Experience
          </h2>
        </Reveal>
        <Reveal>
          <div className="timeline" aria-label="Employment history">
            <div className="timeline__axis" aria-hidden="true" />
            {items.map((item) => (
              <article key={item.id} className="timeline__item">
                <div className="timeline__marker" aria-hidden="true" />
                <div className="timeline__content">
                  <p className="timeline__org">{item.organization}</p>
                  <h3 className="timeline__role">{item.position}</h3>
                  <p className="timeline__dates">{formatDateRange(item)}</p>
                  {item.description ? (
                    <p className="timeline__description">{item.description}</p>
                  ) : null}
                  {item.responsibilities.length > 0 ? (
                    <ul className="timeline__responsibilities">
                      {item.responsibilities.map((responsibility, index) => (
                        <li key={index}>{responsibility}</li>
                      ))}
                    </ul>
                  ) : null}
                  {item.achievements.length > 0 ? (
                    <div className="timeline__achievements">
                      <p className="timeline__achievements-label">Recognised</p>
                      <ul className="timeline__responsibilities">
                        {item.achievements.map((achievement, index) => (
                          <li key={index}>{achievement}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
