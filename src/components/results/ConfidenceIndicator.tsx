import type { ConfidenceLevel } from '@/types';
import { cn } from '@/lib/utils';
import { Info } from 'lucide-react';

const CONFIG = {
  high: { label: 'High Confidence', dots: 3, color: 'text-emerald-400', dotColor: 'bg-emerald-500' },
  medium: { label: 'Medium Confidence', dots: 2, color: 'text-amber-400', dotColor: 'bg-amber-500' },
  low: { label: 'Low Confidence', dots: 1, color: 'text-red-400', dotColor: 'bg-red-500' },
};

const TOOLTIP: Record<ConfidenceLevel, string> = {
  high: 'Strong data: 8+ threads and 80+ comments with consistent sentiment.',
  medium: 'Moderate data: 4+ threads and 30+ comments. Results are directional.',
  low: 'Limited data: few threads or comments. Take results with caution.',
};

interface Props {
  level: ConfidenceLevel;
  reason: string;
}

export function ConfidenceIndicator({ level, reason }: Props) {
  const config = CONFIG[level];
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <div className="flex gap-1">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className={cn(
                'w-2 h-2 rounded-full transition-all',
                i <= config.dots ? config.dotColor : 'bg-muted',
              )}
            />
          ))}
        </div>
        <span className={cn('text-sm font-semibold', config.color)}>{config.label}</span>
        <div className="relative group ml-auto">
          <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
          <div className="absolute right-0 bottom-full mb-2 w-52 px-3 py-2 rounded-lg bg-popover border border-border text-xs text-muted-foreground shadow-xl z-20 hidden group-hover:block pointer-events-none">
            {TOOLTIP[level]}
          </div>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">{reason}</p>
    </div>
  );
}
