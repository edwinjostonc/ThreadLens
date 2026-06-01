import { Skeleton } from '@/components/ui/skeleton';

const STEPS = [
  'Expanding search queries...',
  'Searching Reddit discussions...',
  'Fetching comments...',
  'Extracting entities...',
  'Calculating consensus scores...',
  'Generating report...',
];

export function LoadingSkeleton({ step }: { step: number }) {
  return (
    <div className="animate-fade-in space-y-6">
      {/* Status */}
      <div className="flex flex-col items-center gap-3 py-8">
        <div className="relative w-12 h-12">
          <div className="absolute inset-0 rounded-full border-2 border-orange-500/20" />
          <div className="absolute inset-0 rounded-full border-2 border-orange-500 border-t-transparent animate-spin" />
        </div>
        <p className="text-sm text-muted-foreground">{STEPS[step] ?? 'Analyzing...'}</p>
        <div className="flex gap-1">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1 rounded-full transition-all duration-300 ${
                i <= step ? 'bg-orange-500 w-6' : 'bg-muted w-3'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Skeleton cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-5 space-y-3">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-2 w-full" />
            <div className="space-y-2 pt-1">
              <Skeleton className="h-3 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-card p-5 space-y-3">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    </div>
  );
}
