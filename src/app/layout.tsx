import type { Metadata, Viewport } from 'next';
import '@fontsource/atkinson-hyperlegible/400.css';
import '@fontsource/atkinson-hyperlegible/700.css';
import './globals.css';
import Providers from './providers';

export const metadata: Metadata = {
  title: 'Ndoti',
  description: 'Ramassage des ordures à domicile / Household trash pickup',
  icons: { icon: '/icons/favicon.svg', apple: '/icons/icon-192.png' },
  appleWebApp: { capable: true, title: 'Ndoti', statusBarStyle: 'default' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#123B2E',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body><Providers>{children}</Providers></body>
    </html>
  );
}
