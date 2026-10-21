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
          <h2 id="education-heading" className="section__head">
            Education &amp; qualifications
          </h2>
        </Reveal>
        <Reveal>
          <div className="education__list">
            {items.map((item) => {
              const from = year(item.start_date);
              const to = year(item.end_date);
              const period = from && to ? `${from} – ${to}` : from ? `From ${from}` : '';

              return (
                <div key={item.id} className="education__row">
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
                  <div className="education__dates">
                    {period ? <span className="education__period">{period}</span> : null}
                    <span
                      className={`education__status${
                        item.status === 'ongoing' ? ' education__status--ongoing' : ''
                      }`}
                    >
                      {item.status === 'ongoing' ? 'In progress' : 'Completed'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
