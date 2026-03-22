'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Search, X } from 'lucide-react';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';

const ease = [0.22, 1, 0.36, 1] as const;

type Article = {
  id: string;
  title: string;
  summary: string;
  tier: string;
  isFree: boolean;
  basePrice: number;
  qualityScore: number;
  publisher: { name: string };
};

export default function ArticlesPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  useEffect(() => {
    fetch('/api/content')
      .then((r) => r.json())
      .then((data) => {
        setArticles(Array.isArray(data) ? data : data.articles ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    if (!query.trim()) return articles;
    const q = query.toLowerCase();
    return articles.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        a.summary.toLowerCase().includes(q) ||
        a.publisher?.name?.toLowerCase().includes(q)
    );
  }, [articles, query]);

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="px-6 py-12 lg:px-12 lg:py-16">
        <div className="mx-auto max-w-6xl">

          {/* Section label */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, ease }}
            className="mb-8 flex items-center gap-4"
          >
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              {'// DIRECTORY: ARTICLES'}
            </span>
            <div className="flex-1 border-t border-border" />
            <span className="h-2 w-2 animate-blink bg-[#ea580c]" />
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">010</span>
          </motion.div>

          <div className="mb-8 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <motion.h1
              initial={{ opacity: 0, y: 20, filter: 'blur(8px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              transition={{ duration: 0.6, ease }}
              className="font-pixel text-2xl uppercase tracking-tight text-foreground sm:text-3xl"
            >
              Articles
            </motion.h1>

            {/* Search bar */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.15, ease }}
              className="relative w-full sm:max-w-xs"
            >
              <Search
                size={13}
                strokeWidth={1.5}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <input
                type="text"
                placeholder="Search articles..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full border-2 border-foreground bg-background/80 py-2.5 pl-9 pr-9 font-mono text-xs uppercase tracking-wider text-foreground placeholder:normal-case placeholder:tracking-normal placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#ea580c]/50"
              />
              {query && (
                <button
                  onClick={() => setQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X size={13} strokeWidth={1.5} />
                </button>
              )}
            </motion.div>
          </div>

          {/* Results count */}
          {!loading && (
            <p className="mb-6 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              {query ? `${filtered.length} result${filtered.length !== 1 ? 's' : ''} for "${query}"` : `${articles.length} article${articles.length !== 1 ? 's' : ''}`}
            </p>
          )}

          {loading ? (
            <div className="border-2 border-dashed border-foreground/25 bg-background/50 p-16 text-center font-mono text-sm text-muted-foreground">
              Loading articles...
            </div>
          ) : filtered.length === 0 ? (
            <div className="border-2 border-dashed border-foreground/25 bg-background/50 p-16 text-center font-mono text-sm text-muted-foreground">
              {query ? `No articles match "${query}"` : 'No articles yet.'}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filtered.map((a, i) => (
                <motion.article
                  key={a.id}
                  initial={{ opacity: 0, y: 16, filter: 'blur(4px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  transition={{ delay: Math.min(i * 0.05, 0.4), duration: 0.45, ease }}
                  className="flex h-full flex-col border-2 border-foreground bg-background/80 p-5 backdrop-blur-sm transition-colors hover:bg-foreground/5"
                >
                  <div className="mb-3 flex items-center justify-between gap-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                    <span className="truncate">{a.publisher?.name ?? 'Unknown'}</span>
                    <div className="flex shrink-0 items-center gap-1">
                      {a.isFree ? (
                        <span className="border border-[#ea580c]/60 px-2 py-0.5 text-[#ea580c]">Free</span>
                      ) : (
                        <span className="border border-foreground/30 px-2 py-0.5">{a.tier}</span>
                      )}
                    </div>
                  </div>

                  <h2 className="mb-2 line-clamp-2 font-mono text-sm font-bold uppercase leading-snug tracking-tight text-foreground">
                    {a.title}
                  </h2>

                  <p className="mb-4 line-clamp-4 flex-1 font-mono text-xs leading-relaxed text-muted-foreground">
                    {a.summary}
                  </p>

                  <div className="flex items-center justify-between border-t border-foreground/20 pt-3 font-mono text-[10px] uppercase tracking-wider">
                    <span className="text-muted-foreground">
                      {a.isFree ? <span className="text-[#ea580c]">Free</span> : `${a.basePrice} USDC`}
                    </span>
                    <span className="text-muted-foreground">
                      Quality: <span className="text-foreground">{a.qualityScore?.toFixed(1) ?? '—'}</span>
                    </span>
                  </div>
                </motion.article>
              ))}
            </div>
          )}

          <p className="mt-12 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            <Link href="/" className="underline decoration-foreground/20 underline-offset-4 hover:text-foreground">
              ← Back home
            </Link>
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
