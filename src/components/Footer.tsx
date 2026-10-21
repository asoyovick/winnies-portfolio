import Link from 'next/link';
import { getMediaAsset, getProfile } from '@/lib/content';
import { assetPublicUrl } from '@/lib/storage';
import { parseJson } from '@/lib/validation';

type SocialLink = { label: string; url: string };

/**
 * Site footer.
 *
 * Structure follows reference 3: a wide, light footer with clearly separated
 * groups, a simple brand treatment and small legal text. Only contact details
 * Winnie has approved for publication are shown.
 */
export default async function Footer() {
  const profile = await getProfile();

  const socialLinks: SocialLink[] = parseJson<SocialLink[]>(
    profile?.social_links ?? null,
    []
  );

  let cvUrl: string | null = null;
  if (profile?.cv_media_id) {
    const asset = await getMediaAsset(profile.cv_media_id);
    if (asset) {
      cvUrl = assetPublicUrl(asset.storage_name, asset.bucket, asset.visibility);
    }
  }

  const name = profile?.display_name || 'Winnie Awuor Otieno';

  return (
    <footer className="site-footer" role="contentinfo">
      <div className="wrap">
        <div className="footer__top">
          <div className="footer__brand">
            <p className="footer__brand-name">{name}</p>
            <p className="footer__brand-role">{profile?.professional_title}</p>
            {profile?.location ? (
              <p className="footer__brand-location">{profile.location}</p>
            ) : null}
            <Link href="/#contact" className="btn footer__button">
              Get in touch
            </Link>
          </div>

          <div className="footer__groups">
            <nav className="footer__group" aria-labelledby="footer-profile-heading">
              <h2 id="footer-profile-heading" className="footer__group-title">
                Profile
              </h2>
              <ul className="footer__group-list">
                <li>
                  <Link href="/#about">About</Link>
                </li>
                <li>
                  <Link href="/#experience">Experience</Link>
                </li>
                <li>
                  <Link href="/#expertise">Expertise</Link>
                </li>
              </ul>
            </nav>

            <nav className="footer__group" aria-labelledby="footer-resources-heading">
              <h2 id="footer-resources-heading" className="footer__group-title">
                Resources
              </h2>
              <ul className="footer__group-list">
                <li>
                  <Link href="/#insights">Professional insights</Link>
                </li>
                {cvUrl ? (
                  <li>
                    <a href={cvUrl} download>
                      Download CV
                    </a>
                  </li>
                ) : null}
              </ul>
            </nav>

            <div className="footer__group">
              <h2 className="footer__group-title">Contact</h2>
              <ul className="footer__group-list">
                {profile?.public_email ? (
                  <li>
                    <a href={`mailto:${profile.public_email}`}>{profile.public_email}</a>
                  </li>
                ) : null}
                {profile?.public_phone ? (
                  <li>
                    <a href={`tel:${profile.public_phone.replace(/\s+/g, '')}`}>
                      {profile.public_phone}
                    </a>
                  </li>
                ) : null}
                {socialLinks.map((link, index) => (
                  <li key={`${link.label}-${index}`}>
                    <a href={link.url} rel="noopener noreferrer" target="_blank">
                      {link.label}
                    </a>
                  </li>
                ))}
                {profile?.public_email || profile?.public_phone || socialLinks.length > 0
                  ? null
                  : (
                    <li className="footer__group-empty">
                      Contact details are published on request.
                    </li>
                  )}
              </ul>
            </div>
          </div>
        </div>

        <p className="footer__mark" aria-hidden="true">
          {name}
        </p>

        <div className="footer__legal">
          <p>
            © {new Date().getFullYear()} {name}. All rights reserved.
          </p>
          <p>
            Professional details are published for enquiries about accounting,
            audit and tax work.
          </p>
          <p className="footer__credits">
            Photographs of Kisumu by Victor Ochieng (CC BY-SA 2.0), Josep M.
            Gracia (CC BY-SA 4.0) and Ggobanga (CC BY-SA 4.0), via Wikimedia
            Commons.
          </p>
        </div>
      </div>
    </footer>
  );
}
