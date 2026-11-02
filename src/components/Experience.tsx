import { getExperience, formatDateRange } from '@/lib/content';
import { parseJson } from '@/lib/validation';
import { Reveal } from './Reveal';

/**
 * Experience.
 *
 * The CV laid into the editorial ledger: one row per position, organisation
 * and dates printed small, role in the display serif, then the substance —
 * description and responsibilities — under it.
 */
export default async function Experience() {
  const items = (await getExperience()).map((item) => ({
    ...item,
    responsibilities: parseJson(item.responsibilities, [] as string[]),
    achievements: parseJson(item.achievements, [] as string[]),
  }));

  return (
    <section id="experience" className="w-section" aria-labelledby="experience-heading">
      <div className="w-wrap">
        <Reveal>
          <div className="w-head-row">
            <div>
              <p className="w-eyebrow">
                <span className="w-num">05</span>
                <span>Where the numbers come from</span>
              </p>
              <h2 id="experience-heading" className="w-head">
                Track record. <em>The organisations behind it.</em>
              </h2>
            </div>
            <p className="w-lead">
              Practical experience delivering audit, accounting and tax
              compliance across established Kenyan organizations.
            </p>
          </div>
        </Reveal>

        <Reveal>
          <ul className="w-track__list">
            {items.map((item) => (
              <li key={item.id} className="w-track-item">
                <div className="w-track-item__top">
                  <span className="w-track-item__org">{item.organization}</span>
                  {item.is_current ? (
                    <span className="w-track-item__current">Current position</span>
                  ) : null}
                  <span className="w-track-item__dates">
                    {formatDateRange(item)}
                  </span>
                </div>
                <h3 className="w-track-item__role">{item.position}</h3>

                {item.description ? (
                  <p className="w-track-item__desc">{item.description}</p>
                ) : null}

                {item.responsibilities.length > 0 ? (
                  <ul className="w-track-item__list">
                    {item.responsibilities.map((responsibility, index) => (
                      <li key={index}>{responsibility}</li>
                    ))}
                  </ul>
                ) : null}

                {item.achievements.length > 0 ? (
                  <div>
                    <p className="w-tag" style={{ marginTop: '1rem', display: 'inline-block' }}>
                      Recognised impact
                    </p>
                    <ul className="w-track-item__list">
                      {item.achievements.map((achievement, index) => (
                        <li key={index}>{achievement}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}
