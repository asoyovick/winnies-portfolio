import { getExpertise } from '@/lib/content';
import { Reveal } from './Reveal';

export default async function Expertise() {
  const items = await getExpertise();

  // Group by category so related expertise sits together under a plain
  // group label (the blueprint's "group separated by a plain word").
  const groups: Record<string, typeof items> = {};
  items.forEach((item) => {
    const key = item.category || 'General';
    if (!groups[key]) groups[key] = [];
    groups[key].push(item);
  });

  return (
    <section id="expertise" className="section" aria-labelledby="expertise-heading">
      <div className="wrap">
        <Reveal>
          <div className="expertise__head">
            <div>
              <span className="section-badge">Core Practice Areas</span>
              <h2 id="expertise-heading" className="section__head">
                Expertise
              </h2>
            </div>
            <p className="expertise__lead">
              Structured financial advisory and rigorous statutory compliance
              tailored to Kenyan regulatory frameworks.
            </p>
          </div>
        </Reveal>
        <Reveal>
          <div className="expertise__grid">
            {Object.entries(groups).map(([category, groupItems]) => (
              <div key={category} className="expertise__card">
                <div className="expertise__card-head">
                  <div className="expertise__badge-wrap">
                    <span className="expertise__card-icon">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </span>
                    <h3 className="expertise__group-label">{category}</h3>
                  </div>
                  <span className="expertise__count-pill">
                    {groupItems.length} {groupItems.length === 1 ? 'service' : 'services'}
                  </span>
                </div>
                <div className="expertise__items">
                  {groupItems.map((item) => (
                    <div key={item.id} className="expertise__row">
                      <h4 className="expertise__title">{item.title}</h4>
                      <p className="expertise__desc">{item.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
