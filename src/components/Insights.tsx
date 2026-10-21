import { getExpertise, getPublishedArticles } from '@/lib/content';
import Link from 'next/link';
import { Reveal } from './Reveal';

export default async function Insights() {
  const articles = await getPublishedArticles();
  const areas = (await getExpertise()).slice(0, 6);

  return (
    <section id="insights" className="section" aria-labelledby="insights-heading">
      <div className="wrap insights__layout">
        <div className="insights__head">
          <Reveal>
            <h2 id="insights-heading" className="section__head">
              Insights
            </h2>
            <p className="insights__lead">
              Notes on tax compliance, bookkeeping and reporting — the subjects
              clients ask about most.
            </p>
          </Reveal>
        </div>

        <Reveal>
          {articles.length === 0 ? (
            <div className="insights__empty">
              <p className="insights__empty-note">
                No articles have been published yet. The first note goes up as
                soon as it is written.
              </p>
              {areas.length > 0 ? (
                <>
                  <p className="insights__topics-label">Subjects covered</p>
                  <ul className="insights__topics">
                    {areas.map((area) => (
                      <li key={area.id}>{area.title}</li>
                    ))}
                  </ul>
                </>
              ) : null}
              <p className="insights__note">
                Have a question about any of them?{' '}
                <Link href="/#contact">Ask in the contact form</Link>.
              </p>
            </div>
          ) : (
            <ul className="insights__list">
              {articles.map((article) => (
                <li key={article.id} className="insights__item">
                  <Link href={`/insights/${article.slug}`} className="insights__link">
                    <h3 className="insights__title">{article.title}</h3>
                    {article.summary ? (
                      <p className="insights__summary">{article.summary}</p>
                    ) : null}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Reveal>
      </div>
    </section>
  );
}
