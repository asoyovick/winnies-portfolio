import { getServerAdmin } from '@/lib/admin-helpers';
import { redirect } from 'next/navigation';
import ArticleEditor from '../editor';

export default async function NewArticlePage() {
  const session = await getServerAdmin();
  if ('redirect' in session) redirect(session.redirect);
  return <ArticleEditor initial={null} />;
}
