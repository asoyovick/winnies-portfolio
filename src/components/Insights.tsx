import { getExpertise, getPublishedArticles } from '@/lib/content';
import Link from 'next/link';
import { Reveal } from './Reveal';

export default async function Insights() {
  const articles = await getPublishedArticles();
  const areas = (await getExpertise()).slice(0, 6);

  return (
    <section id="insights" className="section" aria-labelledby="insights-heading">
      <div className="wrap">
        <div className="insights__head">
          <Reveal>
            <span className="section-badge">Advisory &amp; Knowledge</span>
            <h2 id="insights-heading" className="section__head">
              Insights
            </h2>
            <p className="insights__lead">
              Notes on Kenyan tax compliance, statutory reporting, and bookkeeping
              practices for businesses and organizations.
            </p>
          </Reveal>
        </div>

        <Reveal>
          {articles.length === 0 ? (
            <div className="insights__empty-card">
              <div className="insights__empty-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <h3 className="insights__empty-title">Advisory Notes &amp; Publications</h3>
              <p className="insights__empty-note">
                Insight articles and guidance notes on Kenyan taxation, bookkeeping
                and statutory audits will appear here as they are published.
              </p>
              {areas.length > 0 ? (
                <div className="insights__topics-block">
                  <p className="insights__topics-label">Focus Areas Covered</p>
                  <ul className="insights__topics-pills">
                    {areas.map((area) => (
                      <li key={area.id} className="insights__topic-pill">
                        {area.title}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              <div className="insights__contact-cta">
                <span>Have questions regarding any of these areas?</span>
                <Link href="/#contact" className="btn btn--pill btn--sm">
                  Inquire directly
                </Link>
              </div>
            </div>
          ) : (
            <div className="insights__grid">
              {articles.map((article) => (
                <article key={article.id} className="insights__card">
                  <Link href={`/insights/${article.slug}`} className="insights__link">
                    <div className="insights__card-content">
                      <span className="insights__card-tag">Practice Note</span>
                      <h3 className="insights__title">{article.title}</h3>
                      {article.summary ? (
                        <p className="insights__summary">{article.summary}</p>
                      ) : null}
                    </div>
                    <div className="insights__card-footer">
                      <span className="insights__read-link">Read insight</span>
                      <span className="insights__arrow" aria-hidden="true">→</span>
                    </div>
                  </Link>
                </article>
              ))}
            </div>
          )}
        </Reveal>
      </div>
    </section>
  );
}
