import type { Metadata } from 'next';
import './globals.css';
import './interactions.css';

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
  ),
  title: 'Nightingale Care Note',
  description:
    'The three things that matter most now, with every insight traceable to its source.',
  openGraph: {
    title: 'Nightingale Care Note',
    description: 'The three things that matter most now.',
    images: [{ url: '/og.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Nightingale Care Note',
    description: 'The three things that matter most now.',
    images: ['/og.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
