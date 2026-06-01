import { Suspense } from 'react';
import type { Metadata } from 'next';
import { CompareContent } from './CompareContent';

interface Props {
  searchParams: Promise<{ a?: string; b?: string }>;
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { a, b } = await searchParams;
  if (a && b) {
    return {
      title: `"${a}" vs "${b}" — ThreadLens`,
      description: `Reddit community comparison: ${a} vs ${b}. Which does Reddit prefer?`,
    };
  }
  return {
    title: 'Compare — ThreadLens',
    description: 'Compare two topics side by side using Reddit community consensus.',
  };
}

export default function ComparePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <CompareContent />
    </Suspense>
  );
}
