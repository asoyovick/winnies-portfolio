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
      className="section section--alt"
      aria-labelledby="experience-heading"
    >
      <div className="wrap">
        <Reveal>
          <div className="section-head-wrap">
            <span className="section-badge">Career &amp; Track Record</span>
            <h2 id="experience-heading" className="section__head">
              Experience
            </h2>
            <p className="section__lead">
              Practical experience delivering audit, accounting and tax compliance
              across established Kenyan organizations.
            </p>
          </div>
        </Reveal>
        <Reveal>
          <div className="timeline" aria-label="Employment history">
            <div className="timeline__axis" aria-hidden="true" />
            {items.map((item) => (
              <article key={item.id} className="timeline__item">
                <div className="timeline__marker" aria-hidden="true">
                  <span className="timeline__marker-dot" />
                </div>
                <div className="timeline__card">
                  <div className="timeline__card-header">
                    <div>
                      <div className="timeline__org-row">
                        <span className="timeline__org">{item.organization}</span>
                        {item.is_current ? (
                          <span className="timeline__current-pill">Current Position</span>
                        ) : null}
                      </div>
                      <h3 className="timeline__role">{item.position}</h3>
                    </div>
                    <span className="timeline__dates-pill">{formatDateRange(item)}</span>
                  </div>

                  {item.description ? (
                    <p className="timeline__description">{item.description}</p>
                  ) : null}

                  {item.responsibilities.length > 0 ? (
                    <div className="timeline__section-block">
                      <h4 className="timeline__subhead">Key Responsibilities</h4>
                      <ul className="timeline__responsibilities">
                        {item.responsibilities.map((responsibility, index) => (
                          <li key={index} className="timeline__resp-item">
                            <span className="timeline__check-icon" aria-hidden="true">
                              <svg viewBox="0 0 20 20" fill="currentColor">
                                <path
                                  fillRule="evenodd"
                                  d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            </span>
                            <span>{responsibility}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  {item.achievements.length > 0 ? (
                    <div className="timeline__achievements">
                      <div className="timeline__achievements-head">
                        <span className="timeline__trophy-icon" aria-hidden="true">
                          ★
                        </span>
                        <h4 className="timeline__achievements-label">Recognised Impact &amp; Milestones</h4>
                      </div>
                      <ul className="timeline__achievements-list">
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
