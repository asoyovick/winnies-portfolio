import { Reveal } from './Reveal';

const TOOLS = [
  {
    name: 'Xero',
    use: 'Client bookkeeping and practice management.',
  },
  {
    name: 'QuickBooks Online',
    use: 'Small-business accounts and reporting.',
  },
  {
    name: 'Microsoft Excel',
    use: 'Financial analysis and modelling.',
  },
];

export default function Tools() {
  return (
    <section id="tools" className="section" aria-labelledby="tools-heading">
      <div className="wrap">
        <Reveal>
          <h2 id="tools-heading" className="section__head">
            Systems &amp; tools
          </h2>
        </Reveal>
        <Reveal>
          <div className="tools__layout">
            <p className="tools__intro">
              Bookkeeping, reconciliation and reporting are done in Xero and
              QuickBooks Online, with analysis and modelling in Microsoft Excel.
              Clients moving to digital tax filing, such as iTax, are supported
              through the change.
            </p>
            <ul className="tools__list">
              {TOOLS.map((tool) => (
                <li key={tool.name} className="tools__item">
                  <span className="tools__name">{tool.name}</span>
                  <span className="tools__use">{tool.use}</span>
                </li>
              ))}
            </ul>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
