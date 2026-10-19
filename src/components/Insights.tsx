import { getPublishedArticles } from '@/lib/content';
import Link from 'next/link';
import { Reveal } from './Reveal';

export default function Insights() {
  const articles = getPublishedArticles();

  return (
    <section id="insights" className="section" aria-labelledby="insights-heading">
      <Reveal>
        <h2 id="insights-heading" className="section__head">Insights</h2>
        {articles.length === 0 ? (
          <div className="insights__empty">
            <p>No articles published yet.</p>
            <p className="insights__empty-note">
              Insights and case studies appear here once Winnie publishes them
              from the admin panel.
            </p>
          </div>
        ) : (
          <ul className="insights__list">
            {articles.map((article) => (
              <li key={article.id} className="insights__item">
                <Link href={`/insights/${article.slug}`} className="insights__link">
                  <h3 className="insights__title">{article.title}</h3>
                  {article.summary && (
                    <p className="insights__summary">{article.summary}</p>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Reveal>
    </section>
  );
}
