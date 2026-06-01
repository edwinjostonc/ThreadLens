import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { ThemeProvider } from '@/components/ThemeProvider';
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
  manifest: '/manifest.json',
  themeColor: '#f97316',
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'ThreadLens',
  url: 'https://thread-lens-gilt.vercel.app',
  description: 'AI-powered Reddit Consensus Engine',
  potentialAction: {
    '@type': 'SearchAction',
    target: {
      '@type': 'EntryPoint',
      urlTemplate: 'https://thread-lens-gilt.vercel.app/results?q={search_term_string}',
    },
    'query-input': 'required name=search_term_string',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className={`${inter.variable} font-sans antialiased min-h-screen`}>
        <ThemeProvider>
          {children}
        </ThemeProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
