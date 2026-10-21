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
            <h2 id="expertise-heading" className="section__head">
              Expertise
            </h2>
            <p className="expertise__lead">
              The areas I work in, and what each one covers.
            </p>
          </div>
        </Reveal>
        <Reveal>
          <div className="expertise__columns">
            {Object.entries(groups).map(([category, groupItems]) => (
              <div key={category} className="expertise__group">
                <p className="expertise__group-label">{category}</p>
                {groupItems.map((item) => (
                  <div key={item.id} className="expertise__row">
                    <h3 className="expertise__title">{item.title}</h3>
                    <p className="expertise__desc">{item.description}</p>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
