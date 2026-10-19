import { getProfile } from '@/lib/content';

export default function Footer() {
  const profile = getProfile();
  const socialLinks: { label: string; url: string }[] =
    profile?.social_links ? Array.isArray(profile.social_links)
      ? profile.social_links
      : []
      : [];

  return (
    <footer className="site-footer" role="contentinfo">
      <div className="footer__pad">
        <p className="footer__invitation">
          Get in touch about your tax, audit or accounting needs.
        </p>
        <a href="#contact" className="footer__button">
          Discuss a Service
        </a>
        {socialLinks.length > 0 && (
          <ul className="footer__social" aria-label="Professional social links">
            {socialLinks.map((link, i) => (
              <li key={i}>
                <a href={link.url} className="footer__social-link" rel="noreferrer" target="_blank">
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        )}
        <p className="footer__legal">
          {profile?.display_name}&nbsp;—&nbsp;Accounting &amp; Tax Professional.
          {profile?.location ? `&nbsp;·&nbsp;${profile.location}` : ''}
        </p>
        <p className="footer__name">
          {profile?.display_name || 'Winnie Awuor Otieno'}
        </p>
        <p className="footer__copyright">
          &copy; {new Date().getFullYear()} {profile?.display_name || 'Winnie Awuor Otieno'}.
          All rights reserved.
        </p>
      </div>
    </footer>
  );
}
