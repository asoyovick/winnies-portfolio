import { getMediaAsset, getProfile } from '@/lib/content';
import { NavBar } from './NavBar';
import Footer from '@/components/Footer';
import './site.css';

/**
 * Public site shell. The admin panel lives outside this route group, so the
 * public pages never download the administration application.
 */
export default async function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getProfile();

  let pictureUrl: string | null = null;
  if (profile?.profile_image_id) {
    const asset = await getMediaAsset(profile.profile_image_id);
    if (asset) {
      pictureUrl = `/api/media/${asset.storage_name
        .split('/')
        .map(encodeURIComponent)
        .join('/')}`;
    }
  }

  return (
    <>
      <NavBar pictureUrl={pictureUrl} />
      <main id="main">{children}</main>
      <Footer />
    </>
  );
}
