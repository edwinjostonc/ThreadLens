import type { RedditThread } from '@/types';
import { ExternalLink, ArrowUp, MessageSquare } from 'lucide-react';
import { formatNumber, timeAgo } from '@/lib/utils';

interface Props {
  threads: RedditThread[];
}

export function SourceThreads({ threads }: Props) {
  if (threads.length === 0) return null;

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
        <span>Source Threads</span>
        <span className="px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground text-xs">
          {threads.length}
        </span>
      </h3>

      <div className="space-y-2">
        {threads.map((thread) => (
          <a
            key={thread.id}
            href={thread.permalink}
            target="_blank"
            rel="noreferrer noopener"
            className="flex items-start gap-3 p-3 rounded-lg border border-border/50 hover:border-border hover:bg-accent/50 transition-all group"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium leading-snug group-hover:text-orange-400 transition-colors line-clamp-2">
                {thread.title}
              </p>
              <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                <span className="text-orange-400/70">r/{thread.subreddit}</span>
                <span className="flex items-center gap-0.5">
                  <ArrowUp className="w-3 h-3" />
                  {formatNumber(thread.score)}
                </span>
                <span className="flex items-center gap-0.5">
                  <MessageSquare className="w-3 h-3" />
                  {formatNumber(thread.commentCount)}
                </span>
                <span>{timeAgo(thread.createdAt)}</span>
              </div>
            </div>
            <ExternalLink className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0 mt-0.5 group-hover:text-orange-400 transition-colors" />
          </a>
        ))}
      </div>
    </div>
  );
}
