'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Search, ArrowLeft, RefreshCw, Clock, Layers, MessageSquare, Zap, Share2, Check, Calendar, GitCompare } from 'lucide-react';
import type { ConsensusReport, AnalyzeResponse } from '@/types';
import { LoadingSkeleton } from '@/components/results/LoadingSkeleton';
import { RecommendationCard } from '@/components/results/RecommendationCard';
import { ConfidenceIndicator } from '@/components/results/ConfidenceIndicator';
import { SourceThreads } from '@/components/results/SourceThreads';
import { DisagreementsSection } from '@/components/results/DisagreementsSection';
import { formatNumber } from '@/lib/utils';

export function ResultsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const query = searchParams?.get('q') ?? '';
  const dateFrom = searchParams?.get('from') ?? '';
  const dateTo = searchParams?.get('to') ?? '';
  const subreddit = searchParams?.get('subreddit') ?? '';
  const hasDateFilter = Boolean(dateFrom && dateTo);

  const [report, setReport] = useState<ConsensusReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [step, setStep] = useState(0);
  const [cached, setCached] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState(0);
  const [newQuery, setNewQuery] = useState('');
  const [copied, setCopied] = useState(false);

  const stepRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const analyze = useCallback(async (q: string) => {
    setIsLoading(true);
    setError(null);
    setReport(null);
    setStep(0);
    setSelectedEntity(0);

    // Step timing mirrors actual API work: expand (2s) → search (5s) → fetch (8s) → extract (13s) → score (16s) → report (19s)
    const STEP_DELAYS = [2000, 5000, 8000, 13000, 16000, 19000];
    const timers: ReturnType<typeof setTimeout>[] = [];
    STEP_DELAYS.forEach((delay, i) => {
      timers.push(setTimeout(() => setStep(i + 1), delay));
    });
    stepRef.current = setInterval(() => {}, 999999); // kept for cleanup ref shape
    const _timers = timers; // capture for cleanup

    try {
      const apiParams = new URLSearchParams({ q });
      if (dateFrom && dateTo) { apiParams.set('from', dateFrom); apiParams.set('to', dateTo); }
      if (subreddit) apiParams.set('subreddit', subreddit);
      const res = await fetch(`/api/analyze?${apiParams.toString()}`);
      const data: AnalyzeResponse = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error ?? 'Analysis failed. Please try again.');
        return;
      }

      setReport(data.report ?? null);
      setCached(data.cached ?? false);
    } catch {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
      if (stepRef.current) clearInterval(stepRef.current);
      _timers.forEach(clearTimeout);
    }
  }, []);

  useEffect(() => {
    if (query.trim().length >= 2) {
      analyze(query);
    } else {
      setError('Invalid query.');
      setIsLoading(false);
    }
    return () => {
      if (stepRef.current) clearInterval(stepRef.current);
    };
  }, [query, analyze]);

  useEffect(() => {
    if (!isLoading && report && resultsRef.current) {
      const el = resultsRef.current;
      import('gsap').then(({ default: gsap }) => {
        gsap.fromTo(
          el.children,
          { opacity: 0, y: 20 },
          { opacity: 1, y: 0, duration: 0.5, stagger: 0.08, ease: 'power2.out' },
        );
      });
    }
  }, [isLoading, report]);

  function handleShare() {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function handleNewSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = newQuery.trim();
    if (q.length >= 2) {
      router.push(`/results?q=${encodeURIComponent(q)}`);
    }
  }

  function exportMarkdown(r: ConsensusReport) {
    const lines = [
      `# Reddit Consensus: "${r.query}"`,
      ``,
      `**Confidence:** ${r.confidence} · ${r.confidenceReason}`,
      `**Threads analyzed:** ${r.totalThreads} · **Comments:** ${r.totalComments}`,
      ``,
      `## Summary`,
      r.executiveSummary,
      ``,
    ];
    if (r.entities.length > 0) {
      lines.push(`## Top Recommendations`);
      r.entities.forEach((e, i) => {
        lines.push(`${i + 1}. **${e.name}** — Score: ${e.consensusScore}/100 (${Math.round(e.sentimentRatio * 100)}% positive, ${e.totalMentions} mentions)`);
      });
      lines.push(``);
    }
    if (r.commonPraises.length > 0) {
      lines.push(`## Community Praises`);
      r.commonPraises.forEach((p) => lines.push(`- ${p}`));
      lines.push(``);
    }
    if (r.commonComplaints.length > 0) {
      lines.push(`## Community Criticizes`);
      r.commonComplaints.forEach((c) => lines.push(`- ${c}`));
      lines.push(``);
    }
    if (r.sourceThreads.length > 0) {
      lines.push(`## Source Threads`);
      r.sourceThreads.forEach((t) => lines.push(`- [${t.title}](${t.permalink}) — r/${t.subreddit}`));
      lines.push(``);
    }
    lines.push(`---`);
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://thread-lens-gilt.vercel.app';
    lines.push(`*Generated by [ThreadLens](${baseUrl})*`);

    const blob = new Blob([lines.join('\n')], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `threadlens-${r.query.replace(/\s+/g, '-').toLowerCase().slice(0, 40)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const overallScore =
    report && report.entities.length > 0
      ? Math.round(
          report.entities.reduce((sum, e) => sum + e.consensusScore, 0) / report.entities.length,
        )
      : null;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-border/50 bg-background/90 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-4">
          <Link
            href={`/?q=${encodeURIComponent(query)}`}
            className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors text-sm"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back
          </Link>

          <div className="flex-1 max-w-xl">
            <form onSubmit={handleNewSearch} className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                defaultValue={query}
                onChange={(e) => setNewQuery(e.target.value)}
                placeholder="New search..."
                className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-orange-500/50"
              />
            </form>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            {cached && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Cached
              </span>
            )}
            <Link
              href={`/compare?a=${encodeURIComponent(query)}`}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs hover:border-orange-500/30 hover:text-orange-400 transition-all"
            >
              <GitCompare className="w-3 h-3" />
              Compare
            </Link>
            <button
              onClick={handleShare}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs hover:border-orange-500/30 hover:text-orange-400 transition-all"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Share2 className="w-3 h-3" />}
              {copied ? 'Copied!' : 'Share'}
            </button>
            <button
              onClick={() => analyze(query)}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs hover:border-orange-500/30 hover:text-orange-400 transition-all disabled:opacity-40"
            >
              <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto px-4 py-6 w-full">
        {/* Query headline */}
        <div className="mb-6">
          <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Analyzing</p>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            &ldquo;{query}&rdquo;
          </h1>
          <div className="mt-2 flex flex-wrap gap-2">
            {subreddit && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs">
                r/{subreddit}
              </span>
            )}
            {hasDateFilter && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs">
                <Calendar className="w-3 h-3" />
                {dateFrom} → {dateTo}
              </span>
            )}
          </div>
        </div>

        {/* Loading */}
        {isLoading && <LoadingSkeleton step={step} />}

        {/* Error */}
        {!isLoading && error && (
          <div className="flex flex-col items-center gap-4 py-16 text-center">
            <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center">
              <Zap className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <p className="font-semibold mb-1">Analysis failed</p>
              <p className="text-sm text-muted-foreground">{error}</p>
            </div>
            <button
              onClick={() => analyze(query)}
              className="px-4 py-2 rounded-lg bg-orange-500 text-white text-sm font-medium hover:bg-orange-600 transition-colors"
            >
              Try again
            </button>
          </div>
        )}

        {/* Results */}
        {!isLoading && report && (
          <div ref={resultsRef} className="space-y-6">
            {/* Metrics bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-xl border border-border bg-card p-4">
                <p className="text-xs text-muted-foreground mb-1">Avg Consensus</p>
                <p className="text-2xl font-bold text-orange-400">{overallScore ?? '—'}</p>
                <p className="text-xs text-muted-foreground">/ 100</p>
              </div>
              <div className="rounded-xl border border-border bg-card p-4">
                <p className="text-xs text-muted-foreground mb-1">Threads</p>
                <p className="text-2xl font-bold flex items-center gap-1">
                  <Layers className="w-4 h-4 text-muted-foreground" />
                  {report.totalThreads}
                </p>
              </div>
              <div className="rounded-xl border border-border bg-card p-4">
                <p className="text-xs text-muted-foreground mb-1">Comments</p>
                <p className="text-2xl font-bold flex items-center gap-1">
                  <MessageSquare className="w-4 h-4 text-muted-foreground" />
                  {formatNumber(report.totalComments)}
                </p>
              </div>
              <div className="rounded-xl border border-border bg-card p-4">
                <ConfidenceIndicator level={report.confidence} reason={report.confidenceReason} />
              </div>
            </div>

            {/* Executive Summary */}
            <div className="rounded-xl border border-border bg-card p-5">
              <h2 className="text-sm font-semibold text-orange-400 mb-2 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5" />
                Executive Summary
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {report.executiveSummary}
              </p>
            </div>

            {/* Recommendations */}
            {report.entities.length > 0 ? (
              <div>
                <h2 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">
                  Top Recommendations
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {report.entities.slice(0, 8).map((entity, i) => (
                    <RecommendationCard
                      key={entity.name}
                      entity={entity}
                      rank={i + 1}
                      isSelected={selectedEntity === i}
                      onClick={() => setSelectedEntity(selectedEntity === i ? -1 : i)}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-border bg-card p-8 text-center space-y-3">
                <p className="text-muted-foreground text-sm">
                  No specific recommendations found. The community may be discussing this topic
                  without naming specific options — or the query needs to be more specific.
                </p>
                <div className="text-xs text-muted-foreground/70 space-y-1">
                  <p>Try a more specific query:</p>
                  <div className="flex flex-wrap justify-center gap-2 mt-2">
                    {['best ' + query, query + ' recommendations', query + ' vs alternatives'].map((suggestion) => (
                      <button
                        key={suggestion}
                        onClick={() => router.push(`/results?q=${encodeURIComponent(suggestion)}`)}
                        className="px-2.5 py-1 rounded-full border border-border text-xs hover:border-orange-500/40 hover:text-orange-400 transition-all"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Two column: disagreements + sources */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <DisagreementsSection
                disagreements={report.disagreements}
                commonPraises={report.commonPraises}
                commonComplaints={report.commonComplaints}
              />
              <SourceThreads threads={report.sourceThreads} />
            </div>

            {/* Related searches */}
            {report.relatedQueries && report.relatedQueries.length > 0 && (
              <div className="rounded-xl border border-border bg-card/50 p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-widest mb-3">Related searches</p>
                <div className="flex flex-wrap gap-2">
                  {report.relatedQueries.map((q) => (
                    <button
                      key={q}
                      onClick={() => router.push(`/results?q=${encodeURIComponent(q)}`)}
                      className="px-3 py-1.5 rounded-full text-xs border border-border bg-card hover:border-orange-500/40 hover:text-orange-400 text-muted-foreground transition-all"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Footer meta */}
            <div className="flex items-center justify-between text-xs text-muted-foreground py-4 border-t border-border/50">
              <span>Analysis completed in {(report.processingTimeMs / 1000).toFixed(1)}s</span>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => exportMarkdown(report)}
                  className="hover:text-foreground transition-colors"
                >
                  Export markdown
                </button>
                <span>All data sourced from Reddit&apos;s public API</span>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
