import { Nav } from '@/components/Nav';
import Footer from '@/components/Footer';

/**
 * Public site shell. The admin panel lives outside this route group, so the
 * public pages never download the administration application.
 */
export default function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Nav />
      <main id="main">{children}</main>
      <Footer />
    </>
  );
}
