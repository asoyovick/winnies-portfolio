import { Reveal } from './Reveal';

/**
 * A few things you might wonder.
 *
 * The design's accordion, kept honest: plain questions a new client actually
 * asks before the first conversation, answered without jargon. Opens and
 * closes with native details/summary, so it works without JavaScript.
 */
const QUESTIONS = [
  {
    question: 'Where do we start?',
    answer:
      'With a conversation about your business, your current records, and what you want help with. From there we can define a sensible scope together.',
  },
  {
    question: 'Do my books need to be in perfect shape?',
    answer:
      'No. We start with what you have. The first step is understanding the gaps in the records and agreeing what needs attention, without judgement.',
  },
  {
    question: 'What will this cost?',
    answer:
      'It depends on the scope, not a fixed price list. Once the work is defined you get a clear proposal, so there are no surprises later.',
  },
];

export default function Faq() {
  return (
    <section id="faq" className="w-section w-faq" aria-labelledby="faq-heading">
      <div className="w-wrap w-faq__grid">
        <Reveal>
          <div>
            <p className="w-eyebrow">
              <span className="w-num">09</span>
              <span>Before we talk</span>
            </p>
            <h2 id="faq-heading" className="w-head">
              A few things
              <br />
              you might wonder.
            </h2>
            <p className="w-lead" style={{ marginTop: '1.25rem' }}>
              A clear beginning makes for a better working relationship.
            </p>
          </div>
        </Reveal>

        <Reveal>
          <div className="w-faq__list">
            {QUESTIONS.map((item) => (
              <details key={item.question} className="w-faq-item">
                <summary className="w-faq-item__summary">
                  <span className="w-faq-item__q">{item.question}</span>
                  <span className="w-faq-item__marker" aria-hidden="true">
                    +
                  </span>
                </summary>
                <p className="w-faq-item__a">{item.answer}</p>
              </details>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
