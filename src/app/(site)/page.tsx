import Hero from '@/components/Hero';
import About from '@/components/About';
import Place from '@/components/Place';
import Expertise from '@/components/Expertise';
import Experience from '@/components/Experience';
import Education from '@/components/Education';
import Tools from '@/components/Tools';
import Insights from '@/components/Insights';
import Contact from '@/components/Contact';
import { getMediaAsset, getProfile } from '@/lib/content';

export default function Page() {
  const profile = getProfile();

  const cvUrl = (() => {
    if (!profile?.cv_media_id) return null;
    const asset = getMediaAsset(profile.cv_media_id);
    if (!asset) return null;
    return `/api/media/${encodeURIComponent(asset.storage_name)}`;
  })();

  return (
    <>
      <Hero />
      <About />
      <Place />
      <Expertise />
      <Experience />
      <Education />
      <Tools />
      <Insights />
      <Contact profile={profile} cvUrl={cvUrl} />
    </>
  );
}
