import { getPublishedArticles } from '@/lib/content';
import type { MetadataRoute } from 'next';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

// The list of published insights changes in the admin panel, so the sitemap is
// rendered per request rather than baked at build time.
export const dynamic = 'force-dynamic';

/**
 * The public site is a single page with sections, so the sitemap lists the
 * home page and the published insights. Drafts are never listed.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 1,
    },
  ];

  const articles = getPublishedArticles();
  for (const article of articles) {
    entries.push({
      url: `${BASE_URL}/insights/${article.slug}`,
      lastModified: new Date(article.updated_at),
      changeFrequency: 'monthly',
      priority: 0.6,
    });
  }

  return entries;
}
