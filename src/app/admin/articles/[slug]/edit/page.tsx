import { getServerAdmin } from '@/lib/admin-helpers';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import ArticleEditor from '../../editor';

export default async function EditArticlePage({
  params,
}: {
  params: { slug: string };
}) {
  const session = await getServerAdmin();
  if ('redirect' in session) redirect(session.redirect);
  const article = db.prepare('SELECT * FROM articles WHERE slug = ?').get(params.slug) as any | null;
  if (!article) redirect('/admin/articles');
  return (
    <div className="admin-canvas">
      <h1 className="admin-canvas__title">Edit article</h1>
      <ArticleEditor initial={article} />
    </div>
  );
}
