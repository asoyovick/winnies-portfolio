import { getMediaAsset, getProfile } from '@/lib/content';
import { NavBar } from './NavBar';

/**
 * The navigation.
 *
 * The brand mark is Winnie's own photograph when she has uploaded one. The
 * picture is read from the profile settings here, on the server, and only the
 * address of the file is handed to the browser.
 */
export async function Nav() {
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

  return <NavBar pictureUrl={pictureUrl} />;
}
