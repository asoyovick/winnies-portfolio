import Link from 'next/link';
import { getProfile } from '@/lib/content';
import { parseJson } from '@/lib/validation';

type SocialLink = { label: string; url: string };
type LinkItem = { title: string; href: string };

/**
 * Footer — divided-column format.
 *
 * Four columns divided by hairlines, each led by a connect card (Winnie's own
 * social links when she has added them, contact anchors otherwise) with the
 * arrow carrying across, and a small link group beneath. The band opens with
 * a soft radial light and closes on a centred line of the small print. Only
 * contact details Winnie approved for publication are shown.
 */
export default async function Footer() {
  const profile = await getProfile();

  const socialLinks: SocialLink[] = parseJson<SocialLink[]>(
    profile?.social_links ?? null,
    []
  );

  const name = profile?.display_name || 'Winnie Awuor Otieno';
  const email = profile?.public_email || null;
  const phone = profile?.public_phone || null;

  // One connect card per column: her social first, contact anchors until
  // then, and the way back to the top last.
  const fallbacks: SocialLink[] = [
    { label: 'Email', url: email ? `mailto:${email}` : '/#contact' },
    {
      label: 'Call',
      url: phone ? `tel:${phone.replace(/[^\d+]/g, '')}` : '/#contact',
    },
    { label: 'Visit', url: '/#contact' },
    { label: 'Back to top', url: '/#top' },
  ];
  const cards: SocialLink[] = [...socialLinks, ...fallbacks].slice(0, 4);

  const groups: { title: string; links: LinkItem[] }[] = [
    {
      title: 'Explore',
      links: [
        { title: 'Services', href: '/#expertise' },
        { title: 'Notes', href: '/#insights' },
        { title: 'Experience', href: '/#experience' },
        { title: 'Education', href: '/#education' },
      ],
    },
    {
      title: 'Practice',
      links: [
        { title: 'About', href: '/#about' },
        { title: 'Kisumu', href: '/#place' },
        { title: 'Questions', href: '/#faq' },
      ],
    },
    {
      title: 'Get in touch',
      links: [
        { title: 'Start a conversation', href: '/#contact' },
        ...(email
          ? [{ title: 'Email', href: `mailto:${email}` } satisfies LinkItem]
          : []),
        ...(phone
          ? [{ title: 'Phone', href: `tel:${phone.replace(/[^\d+]/g, '')}` } satisfies LinkItem]
          : []),
      ],
    },
    {
      title: 'Shortcuts',
      links: [
        { title: 'Back to top ↑', href: '/#top' },
        { title: 'Services', href: '/#expertise' },
        { title: 'Notes', href: '/#insights' },
      ],
    },
  ];

  return (
    <footer className="w-footer" role="contentinfo">
      <div className="w-footer__container">
        <div className="w-footer__grid">
          {groups.map((group, index) => {
            const card: SocialLink = cards[index] ?? { label: 'Contact', url: '/#contact' };
            const external = /^https?:\/\//i.test(card.url);
            return (
              <div className="w-footer__col" key={group.title}>
                <a
                  className="w-footer__card"
                  href={card.url}
                  {...(external
                    ? { target: '_blank', rel: 'noopener noreferrer' }
                    : {})}
                >
                  <span>{card.label}</span>
                  <svg
                    viewBox="0 0 16 16"
                    width="15"
                    height="15"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    aria-hidden="true"
                  >
                    <path d="M2.5 8h11M9 3.5 13.5 8 9 12.5" />
                  </svg>
                </a>

                <div className="w-footer__group">
                  <h3>{group.title}</h3>
                  <ul>
                    {group.links.map((link) => (
                      <li key={link.title}>
                        <Link href={link.href}>{link.title}</Link>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="w-footer__legal">
        <p>
          © {new Date().getFullYear()} {name},{' '}
          {profile?.professional_title ?? 'Accountant'}.
          {profile?.location ? ` ${profile.location}.` : ''}
        </p>
        <p className="w-footer__credits">
          Photographs of Kisumu by Victor Ochieng (CC BY-SA 2.0), Josep M.
          Gracia (CC BY-SA 4.0) and Ggobanga (CC BY-SA 4.0), via Wikimedia
          Commons. Working photographs via Unsplash.
        </p>
      </div>
    </footer>
  );
}
