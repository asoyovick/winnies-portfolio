import Hero from '@/components/Hero';
import About from '@/components/About';
import Expertise from '@/components/Expertise';
import Experience from '@/components/Experience';
import Education from '@/components/Education';
import Tools from '@/components/Tools';
import Insights from '@/components/Insights';
import Contact from '@/components/Contact';
import { getProfile } from '@/lib/content';

export default function Page() {
  const profile = getProfile();

  return (
    <>
      <Hero />
      <About />
      <Expertise />
      <Experience />
      <Education />
      <Tools />
      <Insights />
      <Contact profile={profile} />
    </>
  );
}
