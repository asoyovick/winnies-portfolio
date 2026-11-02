import { Reveal } from './Reveal';

/**
 * A drawn map of the work: the returns she prepares, what they are checked
 * against, and where they end up.
 *
 * It is set out like a working paper — the statement on the dark band, the
 * detail printed on a cream card on top of it — so the page keeps the
 * editorial rhythm of the design: dark chapter, then a quiet, factual card.
 */
const TAXES = [
  { label: 'VAT', note: 'Monthly return' },
  { label: 'PAYE', note: 'Monthly return' },
  { label: 'Withholding tax', note: 'On payments made' },
  { label: 'Corporation tax', note: 'Annual return' },
];

const STEPS = [
  {
    label: 'The returns',
    value:
      'The four recurring returns: VAT, PAYE, withholding tax and corporation tax, each on its own statutory hairline of dates.',
  },
  {
    label: 'The check',
    value:
      'Every return is checked against primary ledgers and supporting records before submission, with audit trails preserved.',
  },
  {
    label: 'The filing',
    value:
      'Submissions are executed on iTax and filed away with the reconciliations behind them, ready for any future review.',
  },
];

export default function TaxMap() {
  return (
    <section className="w-section w-dark" aria-labelledby="taxmap-heading">
      <div className="w-wrap w-look__grid">
        <Reveal>
          <div>
            <p className="w-eyebrow">
              <span className="w-num">04</span>
              <span>A closer look — the statutory month</span>
            </p>
            <h2 id="taxmap-heading" className="w-head w-look__head">
              How a return
              <br />
              gets done.
            </h2>
            <p className="w-look__lead">
              Statutory filings reward rhythm: the same records, the same
              checks, the same places every period. Three questions carry the
              month.
            </p>
            <div className="w-look__rows">
              {STEPS.map((step) => (
                <div key={step.label} className="w-look__row">
                  <span className="w-look__row-label">{step.label}</span>
                  <span className="w-look__row-value">{step.value}</span>
                </div>
              ))}
            </div>
          </div>
        </Reveal>

        <Reveal>
          <div className="w-card">
            <div className="w-card__head">
              <h3 className="w-card__title">The filing sheet</h3>
              <span className="w-card__meta">
                Statutory returns
                <br />
                Standing schedule
              </span>
            </div>

            <ul className="w-card__rows">
              {TAXES.map((tax) => (
                <li key={tax.label} className="w-card__row">
                  <span className="w-card__row-text">
                    <span className="w-card__row-title">{tax.label}</span>
                    <span className="w-card__row-note">{tax.note}</span>
                  </span>
                  <span className="w-card__row-state">{tax.label === 'Corporation tax' ? 'On schedule' : 'Reconciled'}</span>
                </li>
              ))}
            </ul>

            <div className="w-card__foot">
              <span className="w-card__caption">Everything in its date.</span>
              <span className="w-card__foot-note">
                Every figure traceable · every filing dated
              </span>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
