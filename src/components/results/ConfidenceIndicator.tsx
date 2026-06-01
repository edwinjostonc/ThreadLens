import type { ConfidenceLevel } from '@/types';
import { cn } from '@/lib/utils';

const CONFIG = {
  high: { label: 'High Confidence', dots: 3, color: 'text-emerald-400', dotColor: 'bg-emerald-500' },
  medium: { label: 'Medium Confidence', dots: 2, color: 'text-amber-400', dotColor: 'bg-amber-500' },
  low: { label: 'Low Confidence', dots: 1, color: 'text-red-400', dotColor: 'bg-red-500' },
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
      </div>
      <p className="text-xs text-muted-foreground">{reason}</p>
    </div>
  );
}
