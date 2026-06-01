interface Props {
  positive: number;
  negative: number;
  neutral: number;
  total: number;
}

export function SentimentBar({ positive, negative, neutral, total }: Props) {
  if (total === 0) return null;
  const posW = Math.round((positive / total) * 100);
  const negW = Math.round((negative / total) * 100);
  const neuW = 100 - posW - negW;

  return (
    <div className="space-y-1.5">
      <div className="flex h-2 rounded-full overflow-hidden gap-px">
        {posW > 0 && (
          <div
            className="bg-emerald-500 transition-all duration-700 rounded-l-full"
            style={{ width: `${posW}%` }}
          />
        )}
        {neuW > 0 && (
          <div className="bg-zinc-600 transition-all duration-700" style={{ width: `${neuW}%` }} />
        )}
        {negW > 0 && (
          <div
            className="bg-red-500 transition-all duration-700 rounded-r-full"
            style={{ width: `${negW}%` }}
          />
        )}
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span className="text-emerald-400">{posW}% positive</span>
        {negW > 0 && <span className="text-red-400">{negW}% negative</span>}
      </div>
    </div>
  );
}
