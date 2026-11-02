import { getExpertise } from '@/lib/content';
import { Reveal } from './Reveal';

/**
 * How I can help.
 *
 * The practice areas are read from the database where Winnie keeps them, and
 * presented as a numbered ledger: one line per service, title on the left,
 * description on the right, with the group each one belongs to as a small
 * printed tag.
 */
export default async function Expertise() {
  const items = await getExpertise();

  return (
    <section id="expertise" className="w-section" aria-labelledby="expertise-heading">
      <div className="w-wrap">
        <Reveal>
          <div className="w-services__head">
            <div>
              <p className="w-eyebrow">
                <span className="w-num">02</span>
                <span>How I can help</span>
              </p>
              <h2 id="expertise-heading" className="w-head">
                Support for the everyday.
                <br />
                <em>Insight for the next step.</em>
              </h2>
            </div>
            <div>
              <p className="w-lead">
                Structured financial advisory and rigorous statutory compliance
                for organisations working in Kenya — the routine done properly,
                and a view of what the numbers mean.
              </p>
              <div className="w-services__head-actions">
                <a href="#contact" className="w-btn">
                  <span>Discuss your needs</span>
                  <span className="w-btn__arrow" aria-hidden="true">
                    ↗
                  </span>
                </a>
                <span className="w-note">No obligation. A scope is agreed together.</span>
              </div>
            </div>
          </div>
        </Reveal>

        <Reveal>
          <ul className="w-services__list">
            {items.map((item, index) => (
              <li key={item.id} className="w-service">
                <span className="w-service__num">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <h3 className="w-service__title">{item.title}</h3>
                <div className="w-service__desc">
                  <p>{item.description}</p>
                  {item.category ? (
                    <p className="w-service__tags">
                      <span className="w-tag">{item.category}</span>
                    </p>
                  ) : null}
                </div>
                <span className="w-service__arrow" aria-hidden="true">
                  ↗
                </span>
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}
