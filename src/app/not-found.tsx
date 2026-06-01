import Link from 'next/link';
import { Search } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center px-4">
      <div className="w-12 h-12 rounded-full bg-orange-500/10 flex items-center justify-center mb-6">
        <Search className="w-5 h-5 text-orange-400" />
      </div>
      <h1 className="text-2xl font-bold mb-2">Page not found</h1>
      <p className="text-muted-foreground text-sm mb-6">
        This page doesn&apos;t exist. Head back to ThreadLens.
      </p>
      <Link
        href="/"
        className="px-4 py-2 rounded-lg bg-orange-500 text-white text-sm font-medium hover:bg-orange-600 transition-colors"
      >
        Go home
      </Link>
    </div>
  );
}
