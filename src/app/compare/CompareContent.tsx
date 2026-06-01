'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Search, ArrowRight, Trophy, Layers, MessageSquare, Zap, ArrowLeftRight, Share2, Check } from 'lucide-react';
import type { ConsensusReport, AnalyzeResponse } from '@/types';
import { formatNumber } from '@/lib/utils';

interface SideState {
  report: ConsensusReport | null;
  loading: boolean;
  error: string | null;
}

const EMPTY_SIDE: SideState = { report: null, loading: false, error: null };

function getAvgScore(report: ConsensusReport): number {
  if (!report.entities.length) return 0;
  return Math.round(
    report.entities.reduce((s, e) => s + e.consensusScore, 0) / report.entities.length,
  );
}

type Side = 'orange' | 'blue';

const COLORS: Record<Side, { border: string; ring: string; icon: string; score: string; badge: string }> = {
  orange: {
    border: 'border-orange-500/30',
    ring: 'focus:ring-orange-500/50',
    icon: 'text-orange-400',
    score: 'text-orange-400',
    badge: 'bg-orange-500/10 border-orange-500/20 text-orange-400',
  },
  blue: {
    border: 'border-blue-500/30',
    ring: 'focus:ring-blue-500/50',
    icon: 'text-blue-400',
    score: 'text-blue-400',
    badge: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
  },
};

function SidePanel({
  query, state, color, label, isWinner,
}: {
  query: string;
  state: SideState;
  color: Side;
  label: string;
  isWinner: boolean;
}) {
  const c = COLORS[color];
  const spinColor = color === 'orange' ? 'border-orange-500' : 'border-blue-500';

  return (
    <div className={`rounded-xl border ${c.border} bg-card/50 overflow-hidden`}>
      <div className={`px-5 py-4 border-b ${c.border} flex items-center justify-between`}>
        <div className="flex items-center gap-2 min-w-0">
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full border shrink-0 ${c.badge}`}>{label}</span>
          <h2 className="font-semibold text-sm truncate">"{query || '…'}"</h2>
        </div>
        {isWinner && <Trophy className="w-4 h-4 text-orange-400 shrink-0" />}
      </div>

      <div className="p-5">
        {!query && (
          <p className="py-12 text-center text-sm text-muted-foreground">Enter a query above</p>
        )}

        {query && state.loading && (
          <div className="flex flex-col items-center gap-3 py-12">
            <div className={`w-8 h-8 border-2 border-t-transparent rounded-full animate-spin ${spinColor}`} />
            <p className="text-xs text-muted-foreground">Analyzing Reddit…</p>
          </div>
        )}

        {state.error && !state.loading && (
          <p className="py-8 text-center text-sm text-muted-foreground">{state.error}</p>
        )}

        {state.report && !state.loading && (() => {
          const r = state.report;
          const avg = getAvgScore(r);
          return (
            <div className="space-y-5">
              {/* Metrics */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'Consensus', value: avg, suffix: '/ 100', cls: c.score },
                  { label: 'Threads', value: r.totalThreads, icon: <Layers className="w-3.5 h-3.5 text-muted-foreground" /> },
                  { label: 'Comments', value: formatNumber(r.totalComments), icon: <MessageSquare className="w-3.5 h-3.5 text-muted-foreground" /> },
                ].map(({ label, value, suffix, cls, icon }) => (
                  <div key={label} className="rounded-lg border border-border bg-card p-3 text-center">
                    <p className="text-xs text-muted-foreground mb-1">{label}</p>
                    <p className={`text-xl font-bold flex items-center justify-center gap-1 ${cls ?? ''}`}>
                      {icon}{value}
                    </p>
                    {suffix && <p className="text-xs text-muted-foreground">{suffix}</p>}
                  </div>
                ))}
              </div>

              {/* Summary */}
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-widest mb-2 flex items-center gap-1">
                  <Zap className="w-3 h-3" /> Summary
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed">{r.executiveSummary}</p>
              </div>

              {/* Top picks */}
              {r.entities.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-widest mb-2">Top picks</p>
                  <div className="space-y-1.5">
                    {r.entities.slice(0, 4).map((entity, i) => (
                      <div key={entity.name} className="flex items-center justify-between px-3 py-2 rounded-lg border border-border bg-card/50">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-xs text-muted-foreground shrink-0">{i + 1}.</span>
                          <span className="text-xs font-medium truncate">{entity.name}</span>
                        </div>
                        <span className={`text-xs font-bold shrink-0 ml-2 ${c.score}`}>{entity.consensusScore}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Pros */}
              {r.commonPraises.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-widest mb-2">Community praises</p>
                  <ul className="space-y-1">
                    {r.commonPraises.slice(0, 3).map((p) => (
                      <li key={p} className="text-xs text-muted-foreground flex gap-1.5">
                        <span className="text-emerald-400 shrink-0">✓</span>
                        <span className="line-clamp-1">{p}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Cons */}
              {r.commonComplaints.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-widest mb-2">Community criticizes</p>
                  <ul className="space-y-1">
                    {r.commonComplaints.slice(0, 3).map((complaint) => (
                      <li key={complaint} className="text-xs text-muted-foreground flex gap-1.5">
                        <span className="text-red-400 shrink-0">✕</span>
                        <span className="line-clamp-1">{complaint}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Confidence */}
              <div className="pt-2 border-t border-border/50">
                <p className="text-xs text-muted-foreground">{r.confidenceReason}</p>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}

export function CompareContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const queryA = searchParams?.get('a') ?? '';
  const queryB = searchParams?.get('b') ?? '';

  const [inputA, setInputA] = useState(queryA);
  const [inputB, setInputB] = useState(queryB);
  const [sideA, setSideA] = useState<SideState>(EMPTY_SIDE);
  const [sideB, setSideB] = useState<SideState>(EMPTY_SIDE);
  const [copied, setCopied] = useState(false);

  const analyze = useCallback(async (q: string, setSide: (s: SideState) => void) => {
    if (q.trim().length < 2) return;
    setSide({ report: null, loading: true, error: null });
    try {
      const res = await fetch(`/api/analyze?q=${encodeURIComponent(q)}`);
      const data: AnalyzeResponse = await res.json();
      if (!res.ok || !data.success) {
        setSide({ report: null, loading: false, error: data.error ?? 'Analysis failed.' });
      } else {
        setSide({ report: data.report ?? null, loading: false, error: null });
      }
    } catch {
      setSide({ report: null, loading: false, error: 'Network error.' });
    }
  }, []);

  useEffect(() => {
    if (queryA) analyze(queryA, setSideA);
    if (queryB) analyze(queryB, setSideB);
  }, [queryA, queryB, analyze]);

  function handleCompare() {
    const a = inputA.trim();
    const b = inputB.trim();
    if (a.length < 2 || b.length < 2) return;
    router.push(`/compare?a=${encodeURIComponent(a)}&b=${encodeURIComponent(b)}`);
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter') handleCompare();
  }

  function handleSwap() {
    const a = inputA; const b = inputB;
    setInputA(b); setInputB(a);
    if (queryA && queryB) {
      router.push(`/compare?a=${encodeURIComponent(queryB)}&b=${encodeURIComponent(queryA)}`);
    }
  }

  function handleShare() {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const scoreA = sideA.report ? getAvgScore(sideA.report) : null;
  const scoreB = sideB.report ? getAvgScore(sideB.report) : null;
  const winner =
    scoreA !== null && scoreB !== null
      ? scoreA > scoreB ? 'a' : scoreB > scoreA ? 'b' : 'tie'
      : null;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-border/50 bg-background/90 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3 flex-wrap">
          <Link href="/" className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors text-sm shrink-0">
            <ArrowLeft className="w-3.5 h-3.5" />
            Back
          </Link>

          <div className="flex flex-1 items-center gap-2 min-w-0">
            <div className="flex-1 relative min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-orange-400 pointer-events-none" />
              <input
                type="text"
                value={inputA}
                onChange={(e) => setInputA(e.target.value)}
                onKeyDown={handleKey}
                placeholder="First option…"
                maxLength={200}
                className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-orange-500/30 bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-orange-500/50"
              />
            </div>
            <span className="text-xs font-bold text-muted-foreground shrink-0">vs</span>
            <div className="flex-1 relative min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-blue-400 pointer-events-none" />
              <input
                type="text"
                value={inputB}
                onChange={(e) => setInputB(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Second option…"
                maxLength={200}
                className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-blue-500/30 bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-blue-500/50"
              />
            </div>
            <button
              onClick={handleSwap}
              title="Swap A and B"
              className="p-2 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:border-orange-500/30 transition-all shrink-0"
            >
              <ArrowLeftRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleCompare}
              disabled={inputA.trim().length < 2 || inputB.trim().length < 2}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-orange-500 text-white text-sm font-medium hover:bg-orange-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
            >
              Compare <ArrowRight className="w-3.5 h-3.5" />
            </button>
            {queryA && queryB && (
              <button
                onClick={handleShare}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-xs text-muted-foreground hover:text-foreground hover:border-orange-500/30 transition-all shrink-0"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
                {copied ? 'Copied!' : 'Share'}
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto px-4 py-6 w-full">
        {/* Winner banner */}
        {winner === 'tie' && (
          <div className="mb-6 px-4 py-3 rounded-xl bg-muted border border-border text-sm text-muted-foreground">
            Community is split — both score equally.
          </div>
        )}
        {winner && winner !== 'tie' && (
          <div className="mb-6 flex items-center gap-2 px-4 py-3 rounded-xl bg-orange-500/10 border border-orange-500/20">
            <Trophy className="w-4 h-4 text-orange-400 shrink-0" />
            <span className="text-sm font-medium">
              Reddit prefers{' '}
              <span className="text-orange-400">
                &ldquo;{winner === 'a' ? queryA : queryB}&rdquo;
              </span>
              {' '}with a score of{' '}
              <span className="font-bold">{winner === 'a' ? scoreA : scoreB}</span>
              {' '}vs{' '}
              <span className="font-bold">{winner === 'a' ? scoreB : scoreA}</span>
            </span>
          </div>
        )}

        {/* Panels */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SidePanel query={queryA} state={sideA} color="orange" label="A" isWinner={winner === 'a'} />
          <SidePanel query={queryB} state={sideB} color="blue"   label="B" isWinner={winner === 'b'} />
        </div>
      </main>
    </div>
  );
}
