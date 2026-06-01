'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, ArrowRight, Zap, Shield, BarChart3, FileText, Clock, X, Calendar } from 'lucide-react';

const EXAMPLE_QUERIES = [
  'best gym in Berlin',
  'best laptop under €1000',
  'Is MBA worth it',
  'best protein powder',
  'best mechanical keyboard',
  'moving to Germany',
];

const HOW_IT_WORKS = [
  { icon: Search, title: 'Searches Reddit', desc: 'Finds relevant discussions across subreddits' },
  { icon: BarChart3, title: 'Analyzes Data', desc: 'Extracts entities, sentiment, and frequency' },
  { icon: Zap, title: 'Scores Consensus', desc: 'Weighted algorithm across 5 dimensions' },
  { icon: FileText, title: 'Explains Results', desc: 'Every finding linked to real Reddit sources' },
];

const HISTORY_KEY = 'threadlens_history';
const MAX_HISTORY = 8;

interface HistoryEntry {
  q: string;
  from?: string;
  to?: string;
  subreddit?: string;
}

function getHistory(): HistoryEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = JSON.parse(localStorage.getItem(HISTORY_KEY) ?? '[]');
    // Migrate legacy string entries
    return raw.map((item: HistoryEntry | string) =>
      typeof item === 'string' ? { q: item } : item,
    );
  } catch { return []; }
}

function saveToHistory(entry: HistoryEntry) {
  const updated = [entry, ...getHistory().filter((h) => h.q !== entry.q)].slice(0, MAX_HISTORY);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
}

function removeFromHistory(q: string) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(getHistory().filter((h) => h.q !== q)));
}

export default function HomePage() {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [history, setHistory] = useState<{ q: string; from?: string; to?: string; subreddit?: string }[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [subreddit, setSubreddit] = useState('');
  const router = useRouter();

  const heroRef = useRef<HTMLDivElement>(null);
  const animatedRef = useRef(false);

  useEffect(() => {
    setHistory(getHistory());
  }, []);

  useEffect(() => {
    if (animatedRef.current) return;
    animatedRef.current = true;

    // Lazy-import GSAP only in the browser, never during SSR
    import('gsap').then(({ default: gsap }) => {
      const targets = heroRef.current?.querySelectorAll('[data-animate]');
      if (!targets || targets.length === 0) return;
      gsap.fromTo(
        targets,
        { opacity: 0, y: 28 },
        { opacity: 1, y: 0, duration: 0.6, stagger: 0.1, ease: 'power3.out' },
      );
    });
  }, []);

  function handleSearch(q: string) {
    const trimmed = q.trim();
    if (!trimmed || trimmed.length < 2) return;
    const entry = {
      q: trimmed,
      from: showDateFilter && dateFrom ? dateFrom : undefined,
      to: showDateFilter && dateTo ? dateTo : undefined,
      subreddit: showDateFilter && subreddit.trim() ? subreddit.trim().replace(/^r\//, '') : undefined,
    };
    saveToHistory(entry);
    setHistory(getHistory());
    setIsLoading(true);
    setShowHistory(false);
    const params = new URLSearchParams({ q: trimmed });
    if (entry.from && entry.to && entry.from <= entry.to) {
      params.set('from', entry.from);
      params.set('to', entry.to);
    }
    if (entry.subreddit) params.set('subreddit', entry.subreddit);
    router.push(`/results?${params.toString()}`);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') handleSearch(query);
    if (e.key === 'Escape') setShowHistory(false);
  }

  function handleHistoryClick(entry: { q: string; from?: string; to?: string; subreddit?: string }) {
    setQuery(entry.q);
    if (entry.from || entry.to || entry.subreddit) {
      setShowDateFilter(true);
      setDateFrom(entry.from ?? '');
      setDateTo(entry.to ?? '');
      setSubreddit(entry.subreddit ?? '');
    }
    const params = new URLSearchParams({ q: entry.q });
    if (entry.from && entry.to) { params.set('from', entry.from); params.set('to', entry.to); }
    if (entry.subreddit) params.set('subreddit', entry.subreddit);
    setIsLoading(true);
    setShowHistory(false);
    router.push(`/results?${params.toString()}`);
  }

  function handleDeleteHistory(q: string, e: React.MouseEvent) {
    e.stopPropagation();
    removeFromHistory(q);
    setHistory(getHistory());
  }

  return (
    <main className="min-h-screen flex flex-col">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-border/50">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-orange-500 flex items-center justify-center">
            <Search className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-bold text-sm tracking-wide">ThreadLens</span>
        </div>
        <div className="flex items-center gap-4">
          <a href="/compare"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors">
            Compare
          </a>
          <a href="https://github.com/edwinjostonc/ThreadLens" target="_blank" rel="noreferrer"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors">
            GitHub
          </a>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs text-emerald-400">Live</span>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section ref={heroRef} className="flex-1 flex flex-col items-center justify-center px-4 py-20 text-center">
        <div data-animate className="mb-6 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-medium">
          <Zap className="w-3 h-3" />
          AI-powered Reddit Consensus Engine
        </div>

        <h1 data-animate className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight mb-4 leading-[1.05]">
          Understand Reddit
          <br />
          <span className="text-gradient">without reading Reddit.</span>
        </h1>

        <p data-animate className="text-lg text-muted-foreground max-w-xl mb-12 leading-relaxed">
          ThreadLens analyzes thousands of Reddit discussions to extract what the
          community actually thinks — backed by real data, not AI hallucinations.
        </p>

        {/* Search */}
        <div data-animate className="w-full max-w-2xl mb-4 relative">
          <div className="relative flex items-center">
            <Search className="absolute left-4 w-4 h-4 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => history.length > 0 && setShowHistory(true)}
              onBlur={() => setTimeout(() => setShowHistory(false), 150)}
              placeholder="What does Reddit think about..."
              className="w-full pl-11 pr-36 py-4 rounded-xl border border-border bg-card text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 transition-all"
              disabled={isLoading}
              maxLength={200}
            />
            <button
              onClick={() => handleSearch(query)}
              disabled={isLoading || query.trim().length < 2}
              className="absolute right-2 flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-500 text-white text-sm font-medium hover:bg-orange-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isLoading
                ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : <><span>Analyze</span><ArrowRight className="w-3.5 h-3.5" /></>}
            </button>
          </div>

          {showHistory && history.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 rounded-xl border border-border bg-card shadow-xl z-10 overflow-hidden animate-fade-in">
              <div className="px-3 py-2 border-b border-border/50 flex items-center gap-1.5">
                <Clock className="w-3 h-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Recent searches</span>
              </div>
              {history.map((entry) => (
                <div key={entry.q}
                  className="flex items-center justify-between px-4 py-2.5 hover:bg-accent cursor-pointer group transition-colors"
                  onMouseDown={() => handleHistoryClick(entry)}>
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm text-foreground/80 group-hover:text-foreground truncate">{entry.q}</span>
                    {entry.subreddit && (
                      <span className="text-xs text-orange-400/70 shrink-0">r/{entry.subreddit}</span>
                    )}
                    {entry.from && entry.to && (
                      <span className="text-xs text-muted-foreground shrink-0">{entry.from.slice(0, 7)}…</span>
                    )}
                  </div>
                  <button onMouseDown={(e) => handleDeleteHistory(entry.q, e)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:text-red-400 shrink-0">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Date filter */}
        <div data-animate className="w-full max-w-2xl mb-4">
          <button
            onClick={() => setShowDateFilter((v) => !v)}
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-all ${
              showDateFilter
                ? 'border-orange-500/50 text-orange-400 bg-orange-500/10'
                : 'border-border text-muted-foreground hover:border-orange-500/30 hover:text-orange-400'
            }`}
          >
            <Calendar className="w-3 h-3" />
            {showDateFilter && dateFrom && dateTo
              ? `${dateFrom} → ${dateTo}`
              : 'Filter by date'}
            {showDateFilter && (dateFrom || dateTo) && (
              <span
                className="ml-1 hover:text-red-400"
                onClick={(e) => { e.stopPropagation(); setDateFrom(''); setDateTo(''); }}
              >
                <X className="w-3 h-3" />
              </span>
            )}
          </button>

          {showDateFilter && (
            <div className="mt-2 flex flex-col gap-2 p-3 rounded-xl border border-border bg-card">
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <label className="block text-xs text-muted-foreground mb-1">From</label>
                  <input
                    type="date"
                    value={dateFrom}
                    max={dateTo || undefined}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-orange-500/50"
                  />
                </div>
                <div className="text-muted-foreground text-xs pt-4">→</div>
                <div className="flex-1">
                  <label className="block text-xs text-muted-foreground mb-1">To</label>
                  <input
                    type="date"
                    value={dateTo}
                    min={dateFrom || undefined}
                    max={new Date().toISOString().split('T')[0]}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-orange-500/50"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Subreddit (optional)</label>
                <input
                  type="text"
                  value={subreddit}
                  onChange={(e) => setSubreddit(e.target.value)}
                  placeholder="e.g. MechanicalKeyboards"
                  maxLength={50}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-orange-500/50"
                />
              </div>
            </div>
          )}
        </div>

        {/* Example queries */}
        <div data-animate className="flex flex-wrap justify-center gap-2 mb-16">
          {EXAMPLE_QUERIES.map((q) => (
            <button key={q} onClick={() => handleSearch(q)}
              className="px-3 py-1.5 rounded-full text-xs border border-border bg-card hover:border-orange-500/40 hover:text-orange-400 text-muted-foreground transition-all">
              {q}
            </button>
          ))}
        </div>

        {/* How it works */}
        <div data-animate className="w-full max-w-4xl">
          <p className="text-xs text-muted-foreground uppercase tracking-widest mb-6">How it works</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {HOW_IT_WORKS.map(({ icon: Icon, title, desc }, i) => (
              <div key={title} className="flex flex-col items-center gap-2 p-4 rounded-xl border border-border bg-card/50">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-orange-500/10">
                  <Icon className="w-4 h-4 text-orange-400" />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-muted-foreground">{i + 1}.</span>
                  <span className="text-sm font-medium">{title}</span>
                </div>
                <p className="text-xs text-muted-foreground text-center">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 px-6 py-4 flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Data sourced from Reddit&apos;s public API · Not affiliated with Reddit, Inc.
        </p>
        <div className="flex items-center gap-1">
          <Shield className="w-3 h-3 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">No data stored</span>
        </div>
      </footer>
    </main>
  );
}
