import { getEducation } from '@/lib/content';
import { Reveal } from './Reveal';

export default function Education() {
  const items = getEducation();

  return (
    <section id="education" className="section" aria-labelledby="education-heading">
      <Reveal>
        <h2 id="education-heading" className="section__head">Education &amp; qualifications</h2>
        <div className="education__list">
          {items.map((item) => (
            <div key={item.id} className="education__row">
              <div className="education__meta">
                <h3 className="education__qualification">{item.qualification}</h3>
                <p className="education__institution">{item.institution}</p>
                {item.field_of_study && (
                  <p className="education__field">{item.field_of_study}</p>
                )}
              </div>
              <div className="education__dates">
                {item.start_date || item.end_date ? (
                  <>
                    <span className="education__period">
                      {item.start_date ? new Date(item.start_date).toLocaleDateString('en-GB', { year: 'numeric' }) : ''}
                      {item.end_date ? ` – ${new Date(item.end_date).toLocaleDateString('en-GB', { year: 'numeric' })}` : ''}
                    </span>
                    <span className="education__status">
                      {item.status === 'ongoing' ? 'Ongoing' : 'Completed'}
                    </span>
                  </>
                ) : (
                  <span className="education__status">
                    {item.status === 'ongoing' ? 'Ongoing' : 'Completed'}
                  </span>
                )}
              </div>
              {item.description && (
                <p className="education__note">{item.description}</p>
              )}
            </div>
          ))}
        </div>
        <p className="section__note">
          The Certified Public Accountant qualification is ongoing at Advanced
          level and is not yet complete.
        </p>
      </Reveal>
    </section>
  );
}
