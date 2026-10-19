import { getExpertise } from '@/lib/content';
import { Reveal } from './Reveal';

export default function Expertise() {
  const items = getExpertise();

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
      <div className="expertise__wrap">
        <Reveal>
          <h2 id="expertise-heading" className="section__head">
            Expertise
          </h2>
          <div className="expertise__columns">
            <nav className="expertise__index" aria-labelledby="expertise-heading">
              {Object.entries(groups).map(([category, groupItems]) => (
                <div key={category} className="expertise__group">
                  <p className="expertise__group-label">{category}</p>
                  {groupItems.map((item) => (
                    <div key={item.id} className="expertise__row">
                      <div className="expertise__title">{item.title}</div>
                      <p className="expertise__desc">{item.description}</p>
                    </div>
                  ))}
                </div>
              ))}
            </nav>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
