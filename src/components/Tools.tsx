import { Reveal } from './Reveal';

const TOOLS = [
  {
    name: 'Xero',
    tag: 'Cloud Accounting',
    use: 'Client bookkeeping, bank reconciliations and practice management workflows.',
    badge: 'Certified Workflows',
  },
  {
    name: 'QuickBooks Online',
    tag: 'SME Financials',
    use: 'Small-business accounts, general ledger, accounts receivable/payable and custom reporting.',
    badge: 'Practice Standard',
  },
  {
    name: 'Microsoft Excel',
    tag: 'Financial Modeling',
    use: 'Advanced financial analysis, statutory working papers, cashflow models and variance analysis.',
    badge: 'Advanced Analysis',
  },
  {
    name: 'KRA iTax Platform',
    tag: 'Statutory Portal',
    use: 'Direct management of electronic filings, VAT returns, PAYE withholding slips and tax compliance.',
    badge: 'Statutory Compliance',
  },
];

export default function Tools() {
  return (
    <section id="tools" className="section section--alt" aria-labelledby="tools-heading">
      <div className="wrap">
        <Reveal>
          <div className="section-head-wrap">
            <span className="section-badge">Technology &amp; Software</span>
            <h2 id="tools-heading" className="section__head">
              Systems &amp; tools
            </h2>
            <p className="section__lead">
              Bookkeeping, reconciliation and reporting are done in Xero and
              QuickBooks Online, with analysis and modelling in Microsoft Excel.
              Clients moving to digital tax filing, such as iTax, are supported
              through the change.
            </p>
          </div>
        </Reveal>
        <Reveal>
          <div className="tools__grid">
            {TOOLS.map((tool) => (
              <div key={tool.name} className="tools__card">
                <div className="tools__card-head">
                  <span className="tools__tag">{tool.tag}</span>
                  <span className="tools__badge">{tool.badge}</span>
                </div>
                <h3 className="tools__name">{tool.name}</h3>
                <p className="tools__use">{tool.use}</p>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
