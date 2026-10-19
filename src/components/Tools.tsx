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
      <Reveal>
        <h2 id="tools-heading" className="section__head">Systems &amp; tools</h2>
        <p className="tools__intro">
          She works in Xero, QuickBooks Online and Microsoft Excel, and
          supports clients transitioning to digital tax systems such as iTax.
          No proficiency scores are claimed — only tools used in real work.
        </p>
        <ul className="tools__list">
          {TOOLS.map((tool) => (
            <li key={tool.name} className="tools__item">
              <span className="tools__name">{tool.name}</span>
              <span className="tools__use">{tool.use}</span>
            </li>
          ))}
        </ul>
      </Reveal>
    </section>
  );
}
