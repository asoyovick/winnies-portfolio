import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { formatDate, getArticleBySlug } from '@/lib/content';
import { sanitizeHtml } from '@/lib/sanitize';

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);
  if (!article) {
    return { title: 'Insight not found' };
  }
  return {
    title: `${article.title} — Winnie Awuor Otieno`,
    description: article.summary || undefined,
    openGraph: {
      title: article.title,
      description: article.summary || undefined,
      type: 'article',
    },
  };
}

export default async function ArticlePage({ params }: Params) {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);

  // A draft is not published, so it is not found — the URL gives nothing away.
  if (!article) {
    notFound();
  }

  const published = article.published_at
    ? formatDate(article.published_at)
    : null;

  return (
    <div className="page">
      <article className="wrap article">
        <Link href="/#insights" className="article__back">
          All insights
        </Link>
        <h1 className="article__title">{article.title}</h1>
        {article.summary ? <p className="article__summary">{article.summary}</p> : null}
        {published ? <p className="article__date">{published}</p> : null}
        <div
          className="article__body"
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(article.body) }}
        />
      </article>
    </div>
  );
}
