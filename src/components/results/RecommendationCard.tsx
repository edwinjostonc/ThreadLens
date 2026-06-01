import type { Entity } from '@/types';
import { cn } from '@/lib/utils';
import { SentimentBar } from './SentimentBar';
import { ThumbsUp, ThumbsDown, Hash, Network } from 'lucide-react';

interface Props {
  entity: Entity;
  rank: number;
  isSelected: boolean;
  onClick: () => void;
}

const SCORE_COLOR = (score: number) => {
  if (score >= 75) return 'text-emerald-400';
  if (score >= 50) return 'text-amber-400';
  return 'text-red-400';
};

const SCORE_BG = (score: number) => {
  if (score >= 75) return 'bg-emerald-500/10 border-emerald-500/20';
  if (score >= 50) return 'bg-amber-500/10 border-amber-500/20';
  return 'bg-red-500/10 border-red-500/20';
};

export function RecommendationCard({ entity, rank, isSelected, onClick }: Props) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left rounded-xl border p-5 transition-all duration-200 hover:border-orange-500/30',
        isSelected
          ? 'border-orange-500/50 bg-orange-500/5 card-glow'
          : 'border-border bg-card hover:bg-card/80',
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-xs text-muted-foreground font-mono">#{rank}</span>
            <h3 className="font-semibold text-base leading-tight">{entity.name}</h3>
          </div>
          {entity.aliases.length > 0 && (
            <p className="text-xs text-muted-foreground">
              also: {entity.aliases.slice(0, 2).join(', ')}
            </p>
          )}
        </div>
        <div className={cn('px-2.5 py-1 rounded-lg border text-center min-w-[52px]', SCORE_BG(entity.consensusScore))}>
          <span className={cn('text-lg font-bold leading-none', SCORE_COLOR(entity.consensusScore))}>
            {entity.consensusScore}
          </span>
        </div>
      </div>

      {/* Sentiment */}
      <SentimentBar
        positive={entity.positiveCount}
        negative={entity.negativeCount}
        neutral={entity.neutralCount}
        total={entity.totalMentions}
      />

      {/* Stats */}
      <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Hash className="w-3 h-3" />
          {entity.totalMentions} mentions
        </span>
        <span className="flex items-center gap-1">
          <Network className="w-3 h-3" />
          {entity.supportingThreadIds.length} threads
        </span>
      </div>

      {/* Expanded detail */}
      {isSelected && (entity.pros.length > 0 || entity.cons.length > 0) && (
        <div className="mt-4 pt-4 border-t border-border grid grid-cols-2 gap-4 animate-fade-in">
          {entity.pros.length > 0 && (
            <div>
              <div className="flex items-center gap-1 mb-2">
                <ThumbsUp className="w-3 h-3 text-emerald-400" />
                <span className="text-xs font-medium text-emerald-400">Pros</span>
              </div>
              <ul className="space-y-1.5">
                {entity.pros.slice(0, 3).map((pro, i) => (
                  <li key={i} className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                    • {pro}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {entity.cons.length > 0 && (
            <div>
              <div className="flex items-center gap-1 mb-2">
                <ThumbsDown className="w-3 h-3 text-red-400" />
                <span className="text-xs font-medium text-red-400">Cons</span>
              </div>
              <ul className="space-y-1.5">
                {entity.cons.slice(0, 3).map((con, i) => (
                  <li key={i} className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                    • {con}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </button>
  );
}
