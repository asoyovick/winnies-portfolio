import { getArticleBySlug } from '@/lib/content';

export default function ArticlePage({
  params,
}: {
  params: { slug: string };
}) {
  const article = getArticleBySlug(params.slug);

  if (!article) {
    return (
      <div className="wrap section">
        <h1 className="section__head">Not found</h1>
        <p>This article is not available.</p>
      </div>
    );
  }

  return (
    <div className="wrap section">
      <article>
        <h1 className="section__head">{article.title}</h1>
        {article.summary && (
          <p className="lead" style={{ color: 'var(--muted)', marginBottom: '1.5rem' }}>
            {article.summary}
          </p>
        )}
        <div
          className="article__body"
          dangerouslySetInnerHTML={{ __html: article.body }}
        />
      </article>
    </div>
  );
}
