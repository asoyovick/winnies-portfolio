import { getProfile } from '@/lib/content';
import { Reveal } from './Reveal';

export default async function About() {
  const profile = await getProfile();
  const biography = (profile?.biography || '').trim();
  const paragraphs = biography
    .split('\n\n')
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  return (
    <section id="about" className="section" aria-labelledby="about-heading">
      <div className="wrap about__layout">
        <div className="about__intro">
          <Reveal>
            <span className="section-badge">About the Practice</span>
            <h2 id="about-heading" className="section__head">
              About
            </h2>
            <p className="about__lead">
              {profile?.display_name || 'Winnie Awuor Otieno'} is an accounting,
              audit and tax professional based in {profile?.location || 'Kisumu, Kenya'}.
            </p>

            <div className="about__stat-cards">
              <div className="about__stat-card">
                <span className="about__stat-mark">CPA</span>
                <span className="about__stat-text">Certified Public Accountant (Ongoing)</span>
              </div>
              <div className="about__stat-card">
                <span className="about__stat-mark">B.Sc</span>
                <span className="about__stat-text">Egerton University</span>
              </div>
              <div className="about__stat-card">
                <span className="about__stat-mark">Regional</span>
                <span className="about__stat-text">NGOs, SACCOs &amp; Corporates</span>
              </div>
            </div>
          </Reveal>
        </div>
        <Reveal>
          <div className="about__card">
            <div className="about__card-accent" />
            <div className="about__body">
              {paragraphs.map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
