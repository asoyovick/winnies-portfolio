import { getExperience, formatDateRange } from '@/lib/content';
import { parseJson } from '@/lib/validation';
import { Reveal } from './Reveal';

export default function Experience() {
  const items = getExperience().map((item) => ({
    ...item,
    responsibilities: parseJson(item.responsibilities, [] as string[]),
  }));

  return (
    <section id="experience" className="section section--field" aria-labelledby="experience-heading">
      <Reveal>
        <h2 id="experience-heading" className="section__head">Experience</h2>
        <div className="timeline" aria-label="Employment history">
          <div className="timeline__axis" />
          {items.map((item) => (
            <div key={item.id} className="timeline__item">
              <div className="timeline__marker" />
              <div className="timeline__content">
                <div className="timeline__org">
                  {item.organization}
                </div>
                <h3 className="timeline__role">{item.position}</h3>
                <p className="timeline__dates">
                  {formatDateRange(item)}
                </p>
                <p className="timeline__description">{item.description}</p>
                {item.responsibilities?.length ? (
                  <ul className="timeline__responsibilities">
                    {item.responsibilities.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </Reveal>
    </section>
  );
}
