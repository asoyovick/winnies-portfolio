import { getServerAdmin } from '@/lib/admin-helpers';
import { redirect } from 'next/navigation';
import { get } from '@/lib/db';
import type { Article } from '@/lib/db';
import ArticleEditor from '../../editor';

export default async function EditArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const session = await getServerAdmin();
  if ('redirect' in session) redirect(session.redirect);

  const { slug } = await params;
  const article = await get<Article>('SELECT * FROM articles WHERE slug = $1', [slug]);
  if (!article) redirect('/admin/articles');

  return <ArticleEditor initial={article} />;
}
