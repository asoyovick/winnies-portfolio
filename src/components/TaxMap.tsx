import { Reveal } from './Reveal';

/**
 * A drawn map of the work: the returns she prepares, what they are checked
 * against, and where they end up.
 *
 * It is drawn in code rather than photographed, so it stays sharp at any size,
 * carries no third-party rights, and says something true about the practice.
 */
const TAXES = [
  { label: 'VAT', note: 'Monthly return' },
  { label: 'PAYE', note: 'Monthly return' },
  { label: 'Withholding tax', note: 'On payments made' },
  { label: 'Corporation tax', note: 'Annual return' },
];

function Arrow() {
  return (
    <span className="taxmap__arrow" aria-hidden="true">
      <svg viewBox="0 0 48 12" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M0 6h44M39 1l5 5-5 5" />
      </svg>
    </span>
  );
}

export default function TaxMap() {
  return (
    <section className="section section--field" aria-labelledby="taxmap-heading">
      <div className="wrap">
        <Reveal>
          <div className="taxmap__head">
            <h2 id="taxmap-heading" className="section__head">
              How a return gets done
            </h2>
            <p className="taxmap__lead">
              The four returns she prepares, what each one is checked against, and
              where it ends up.
            </p>
          </div>
        </Reveal>

        <Reveal>
          <div className="taxmap">
            <ul className="taxmap__sources">
              {TAXES.map((tax) => (
                <li key={tax.label} className="taxmap__source">
                  <span className="taxmap__source-label">{tax.label}</span>
                  <span className="taxmap__source-note">{tax.note}</span>
                </li>
              ))}
            </ul>

            <Arrow />

            <div className="taxmap__node">
              <span className="taxmap__mark" aria-hidden="true">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <path d="M7 3.5h7l4 4V20a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1Z" />
                  <path d="M14 3.5V8h4" />
                  <path d="m9 14.5 2 2 4-4.5" />
                </svg>
              </span>
              <h3 className="taxmap__title">Prepared and reviewed</h3>
              <p className="taxmap__note">
                Each return is checked against the records behind it before it is
                filed, and the working is kept.
              </p>
            </div>

            <Arrow />

            <div className="taxmap__node">
              <span className="taxmap__mark" aria-hidden="true">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <path d="M12 3.5 5 6v5.5c0 4.2 2.9 7.6 7 9 4.1-1.4 7-4.8 7-9V6l-7-2.5Z" />
                  <path d="m9 12 2 2 4-4" />
                </svg>
              </span>
              <h3 className="taxmap__title">KRA compliance</h3>
              <p className="taxmap__note">
                Documentation and reconciliations ready for a compliance check,
                and filing moved across to iTax.
              </p>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
