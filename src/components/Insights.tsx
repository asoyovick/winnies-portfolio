import Image from 'next/image';
import Link from 'next/link';
import { getPublishedArticles } from '@/lib/content';
import { Reveal } from './Reveal';

/**
 * From the notebook.
 *
 * Published notes sit on the right like journal entries — number, category,
 * title in the serif, a line of summary and an invitation in small caps —
 * with a photograph to anchor the left column. The empty state keeps the
 * same rhythm so the section never looks broken.
 */
export default async function Insights() {
  const articles = await getPublishedArticles();

  return (
    <section id="insights" className="w-section" aria-labelledby="insights-heading">
      <div className="w-wrap">
        <Reveal>
          <div className="w-head-row">
            <div>
              <p className="w-eyebrow">
                <span className="w-num">08</span>
                <span>From the notebook</span>
              </p>
              <h2 id="insights-heading" className="w-head">
                Small notes.
                <br />
                <em>Useful perspective.</em>
              </h2>
            </div>
            <p className="w-lead">
              Notes on Kenyan tax compliance, statutory reporting and
              bookkeeping practices for businesses and organizations — a little
              financial clarity for the everyday.
            </p>
          </div>
        </Reveal>

        <Reveal>
          <div className="w-notes__grid">
            <figure className="w-notes__figure">
              <div className="w-notes__frame">
                <Image
                  src="/images/accounting-review.jpg"
                  alt="Two people going over figures together at a desk: laptops, an annotated paper and pencils."
                  width={1600}
                  height={1068}
                  sizes="(max-width: 860px) 92vw, 42vw"
                  className="w-notes__image"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>
              <figcaption className="w-notes__caption">
                The practice of paying attention
              </figcaption>
            </figure>

            {articles.length === 0 ? (
              <div className="w-entries">
                <div className="w-entry w-entry--empty">
                  <div className="w-entry__body">
                    <p className="w-entry__prompt">Coming soon</p>
                    <p>
                      Insight articles and guidance notes on Kenyan taxation,
                      bookkeeping and statutory audits will appear here as they
                      are published. In the meantime, questions about any area
                      of the practice are welcome directly.
                    </p>
                    <Link href="/#contact" className="w-entry__link">
                      Ask a question
                    </Link>
                  </div>
                </div>
              </div>
            ) : (
              <div className="w-entries">
                {articles.map((article, index) => (
                  <article key={article.id} className="w-entry">
                    <div className="w-entry__meta">
                      <span className="w-entry__num">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      <span className="w-tag">Practice note</span>
                    </div>
                    <div className="w-entry__body">
                      <Link href={`/insights/${article.slug}`} className="w-entry__title-link">
                        <h3 className="w-entry__title">{article.title}</h3>
                      </Link>
                      {article.summary ? (
                        <p>{article.summary}</p>
                      ) : null}
                      <Link href={`/insights/${article.slug}`} className="w-entry__link">
                        Read the note
                      </Link>
                    </div>
                    <span className="w-entry__arrow" aria-hidden="true">
                      ↗
                    </span>
                  </article>
                ))}
              </div>
            )}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
