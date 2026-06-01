import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'ThreadLens — Understand Reddit without reading Reddit',
  description:
    'AI-powered Reddit Consensus Engine. Analyze thousands of discussions to discover what the community actually thinks.',
  keywords: ['reddit', 'consensus', 'analysis', 'recommendations', 'community opinion'],
  openGraph: {
    title: 'ThreadLens',
    description: 'Understand Reddit without reading Reddit.',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} font-sans antialiased min-h-screen`}>
        {children}
      </body>
    </html>
  );
}
