import { Reveal } from './Reveal';

const TOOLS = [
  {
    name: 'Xero',
    use: 'Client bookkeeping, bank reconciliations and practice management workflows.',
    tag: 'Cloud accounting',
  },
  {
    name: 'QuickBooks Online',
    use: 'Small-business accounts, general ledger, receivables, payables and custom reporting.',
    tag: 'SME financials',
  },
  {
    name: 'Microsoft Excel',
    use: 'Statutory working papers, cash-flow models and variance analysis.',
    tag: 'Financial modelling',
  },
  {
    name: 'KRA iTax',
    use: 'Electronic VAT returns, PAYE slips, withholding certificates and compliance status.',
    tag: 'Statutory portal',
  },
];

/**
 * Systems & tools.
 *
 * A quiet four-column index of what the practice works in, in the same
 * numbered rhythm as the rest of the page.
 */
export default function Tools() {
  return (
    <section id="tools" className="w-section w-note-section" aria-labelledby="tools-heading">
      <div className="w-wrap">
        <Reveal>
          <div className="w-head-row">
            <div>
              <p className="w-eyebrow">
                <span className="w-num">07</span>
                <span>Systems &amp; tools</span>
              </p>
              <h2 id="tools-heading" className="w-head">
                Right tools, <em>kept tidy.</em>
              </h2>
            </div>
            <p className="w-lead">
              Bookkeeping, reconciliation and reporting are done in Xero and
              QuickBooks Online, with analysis and modelling in Microsoft Excel.
              Clients moving to digital tax filing, such as iTax, are supported
              through the change.
            </p>
          </div>
        </Reveal>

        <Reveal>
          <div className="w-tools__grid">
            {TOOLS.map((tool, index) => (
              <div key={tool.name} className="w-tool">
                <span className="w-tool__num">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <h3 className="w-tool__name">{tool.name}</h3>
                <p className="w-tool__use">{tool.use}</p>
                <span className="w-tool__tag">{tool.tag}</span>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
