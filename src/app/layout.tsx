import type { Metadata } from 'next';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/900.css';
import './globals.css';

export const metadata: Metadata = {
  title: 'Winnie Awuor Otieno — Accounting, Audit & Tax Professional',
  description:
    'Professional portfolio of Winnie Awuor Otieno, an accounting, audit and tax professional based in Kisumu, Kenya. VAT, PAYE, withholding tax and corporation tax returns; financial audits with a tax focus; bookkeeping and tax advisory.',
  openGraph: {
    title: 'Winnie Awuor Otieno — Accounting, Audit & Tax Professional',
    description:
      'Accounting, audit and tax services for NGOs, SACCOs and corporate clients in Kisumu, Kenya.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
