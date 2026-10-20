import Hero from '@/components/Hero';
import About from '@/components/About';
import Place from '@/components/Place';
import Expertise from '@/components/Expertise';
import TaxMap from '@/components/TaxMap';
import Experience from '@/components/Experience';
import Education from '@/components/Education';
import Tools from '@/components/Tools';
import Insights from '@/components/Insights';
import Contact from '@/components/Contact';
import { getExperience, getMediaAsset, getProfile } from '@/lib/content';

// The page is rendered for every request so that anything Winnie changes in
// the admin panel is on the public site straight away.
export const dynamic = 'force-dynamic';

export default function Page() {
  const profile = getProfile();

  const cvUrl = (() => {
    if (!profile?.cv_media_id) return null;
    const asset = getMediaAsset(profile.cv_media_id);
    if (!asset) return null;
    return `/api/media/${encodeURIComponent(asset.storage_name)}`;
  })();

  const currentRole = getExperience().find((item) => Boolean(item.is_current));

  // Structured data for the person, using only facts that are on the site.
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: profile?.display_name ?? 'Winnie Awuor Otieno',
    jobTitle: profile?.professional_title ?? 'Accounting, Audit & Tax Professional',
    description: profile?.hero_subheading ?? undefined,
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Kisumu',
      addressCountry: 'KE',
    },
    worksFor: currentRole
      ? {
          '@type': 'Organization',
          name: currentRole.organization,
        }
      : undefined,
    alumniOf: {
      '@type': 'EducationalOrganization',
      name: 'Egerton University',
    },
    email: profile?.public_email || undefined,
    telephone: profile?.public_phone || undefined,
    url: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <Hero />
      <About />
      <Place />
      <Expertise />
      <TaxMap />
      <Experience />
      <Education />
      <Tools />
      <Insights />
      <Contact profile={profile} cvUrl={cvUrl} />
    </>
  );
}
