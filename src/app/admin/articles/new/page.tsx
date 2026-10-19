import { getServerAdmin } from '@/lib/admin-helpers';
import { redirect } from 'next/navigation';
import ArticleEditor from '../editor';

export default async function NewArticlePage() {
  const session = await getServerAdmin();
  if ('redirect' in session) redirect(session.redirect);
  return (
    <div className="admin-canvas">
      <h1 className="admin-canvas__title">New article</h1>
      <ArticleEditor initial={null} />
    </div>
  );
}
