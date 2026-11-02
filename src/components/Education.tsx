import { getEducation } from '@/lib/content';
import { Reveal } from './Reveal';

function year(value: string | null): string {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';
  return String(parsed.getFullYear());
}

/**
 * Education & qualifications, set as a ruled ledger: qualification on the
 * left in the serif, institution and field beside it, period and status
 * printed small on the right.
 */
export default async function Education() {
  const items = await getEducation();

  return (
    <section id="education" className="w-section" aria-labelledby="education-heading">
      <div className="w-wrap">
        <Reveal>
          <div className="w-head-row">
            <div>
              <p className="w-eyebrow">
                <span className="w-num">06</span>
                <span>Credentials &amp; training</span>
              </p>
              <h2 id="education-heading" className="w-head">
                Certificates on the wall.
                <br />
                <em>The practice they support.</em>
              </h2>
            </div>
            <p className="w-lead">
              Formal accounting certifications and a university academic
              foundation, kept current through continuing professional training.
            </p>
          </div>
        </Reveal>

        <Reveal>
          <ul className="w-rows__list">
            {items.map((item) => {
              const from = year(item.start_date);
              const to = year(item.end_date);
              const period = from && to ? `${from} – ${to}` : from ? `From ${from}` : '';
              const isOngoing = item.status === 'ongoing';

              return (
                <li key={item.id} className="w-rows-item">
                  <h3 className="w-rows-item__title">{item.qualification}</h3>
                  <div className="w-rows-item__text">
                    <p>{item.institution}</p>
                    {item.field_of_study ? <p>{item.field_of_study}</p> : null}
                    {item.description ? <p>{item.description}</p> : null}
                  </div>
                  <span className="w-rows-item__meta">{period}</span>
                  <span
                    className={`w-rows-item__status${
                      isOngoing ? ' w-rows-item__status--live' : ''
                    }`}
                  >
                    {isOngoing ? 'In progress' : 'Completed'}
                  </span>
                </li>
              );
            })}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}
