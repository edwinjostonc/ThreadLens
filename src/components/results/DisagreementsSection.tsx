import { AlertTriangle } from 'lucide-react';

interface Props {
  disagreements: string[];
  commonPraises: string[];
  commonComplaints: string[];
}

export function DisagreementsSection({ disagreements, commonPraises, commonComplaints }: Props) {
  const hasData = disagreements.length > 0 || commonPraises.length > 0 || commonComplaints.length > 0;
  if (!hasData) return null;

  return (
    <div className="space-y-4">
      {/* Common praises */}
      {commonPraises.length > 0 && (
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-5">
          <h3 className="text-sm font-semibold text-emerald-400 mb-3">Most Common Praise</h3>
          <ul className="space-y-2">
            {commonPraises.slice(0, 4).map((p, i) => (
              <li key={i} className="text-xs text-muted-foreground leading-relaxed flex gap-2">
                <span className="text-emerald-500 mt-0.5">+</span>
                <span className="line-clamp-2">{p}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Common complaints */}
      {commonComplaints.length > 0 && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-5">
          <h3 className="text-sm font-semibold text-red-400 mb-3">Most Common Complaints</h3>
          <ul className="space-y-2">
            {commonComplaints.slice(0, 4).map((c, i) => (
              <li key={i} className="text-xs text-muted-foreground leading-relaxed flex gap-2">
                <span className="text-red-500 mt-0.5">−</span>
                <span className="line-clamp-2">{c}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Disagreements */}
      {disagreements.length > 0 && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-5">
          <h3 className="text-sm font-semibold text-amber-400 mb-3 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" />
            Points of Disagreement
          </h3>
          <ul className="space-y-2">
            {disagreements.map((d, i) => (
              <li key={i} className="text-xs text-muted-foreground leading-relaxed flex gap-2">
                <span className="text-amber-500 mt-0.5">⚡</span>
                <span>{d}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
