import { getServerAdmin } from '@/lib/admin-helpers';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
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
  const article = (db
    .prepare('SELECT * FROM articles WHERE slug = ?')
    .get(slug) as Article | undefined) ?? null;
  if (!article) redirect('/admin/articles');

  return <ArticleEditor initial={article} />;
}
