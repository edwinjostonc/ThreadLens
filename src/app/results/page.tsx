import { Suspense } from 'react';
import type { Metadata } from 'next';
import { ResultsContent } from './ResultsContent';

interface Props {
  searchParams: Promise<{ q?: string; from?: string; to?: string }>;
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { q, from, to } = await searchParams;
  const query = q ?? 'Reddit';
  const dateLabel = from && to ? ` (${from} to ${to})` : '';
  const title = `What does Reddit think about "${query}"${dateLabel}`;
  const description = `ThreadLens analyzed Reddit discussions about "${query}" and extracted the community consensus.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
    },
    twitter: {
      card: 'summary',
      title,
      description,
    },
  };
}

export default function ResultsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <ResultsContent />
    </Suspense>
  );
}
