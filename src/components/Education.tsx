import { getEducation } from '@/lib/content';
import { Reveal } from './Reveal';

function year(value: string | null): string {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';
  return String(parsed.getFullYear());
}

export default async function Education() {
  const items = await getEducation();

  return (
    <section id="education" className="section" aria-labelledby="education-heading">
      <div className="wrap">
        <Reveal>
          <div className="section-head-wrap">
            <span className="section-badge">Credentials &amp; Training</span>
            <h2 id="education-heading" className="section__head">
              Education &amp; qualifications
            </h2>
            <p className="section__lead">
              Formal accounting certifications and university academic foundation.
            </p>
          </div>
        </Reveal>
        <Reveal>
          <div className="education__grid">
            {items.map((item) => {
              const from = year(item.start_date);
              const to = year(item.end_date);
              const period = from && to ? `${from} – ${to}` : from ? `From ${from}` : '';
              const isOngoing = item.status === 'ongoing';

              return (
                <div key={item.id} className="education__card">
                  <div className="education__card-header">
                    <span className="education__card-icon" aria-hidden="true">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                        <path d="M12 14l9-5-9-5-9 5 9 5z" />
                        <path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                        <path d="M12 14v7" />
                      </svg>
                    </span>
                    <span
                      className={`education__status${
                        isOngoing ? ' education__status--ongoing' : ''
                      }`}
                    >
                      {isOngoing ? <span className="education__status-pulse" /> : null}
                      {isOngoing ? 'In progress' : 'Completed'}
                    </span>
                  </div>

                  <div className="education__meta">
                    <h3 className="education__qualification">{item.qualification}</h3>
                    <p className="education__institution">{item.institution}</p>
                    {item.field_of_study ? (
                      <p className="education__field">{item.field_of_study}</p>
                    ) : null}
                    {item.description ? (
                      <p className="education__note">{item.description}</p>
                    ) : null}
                  </div>

                  {period ? (
                    <div className="education__footer">
                      <span className="education__period">{period}</span>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
