'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';

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

export function LatestContent() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/content')
      .then((r) => r.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : data.articles ?? [];
        setArticles(list.slice(0, 4));
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to load articles');
        setLoading(false);
      });
  }, []);

  return (
    <section id="latest-content" className="w-full scroll-mt-24 px-6 py-12 lg:px-12">
      <div className="mb-8 flex items-center gap-4">
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          {'// SECTION: LATEST_PUBLICATIONS'}
        </span>
        <div className="flex-1 border-t border-border" />
        <span className="h-2 w-2 animate-blink bg-[#ea580c]" />
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">007</span>
      </div>

      <div className="mb-10 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <h2 className="font-mono text-2xl font-bold uppercase tracking-tight text-foreground lg:text-3xl">
          Latest publications
        </h2>
        <Link
          href="/articles"
          className="font-mono text-xs uppercase tracking-widest text-muted-foreground underline decoration-foreground/20 underline-offset-4 transition-colors hover:text-foreground"
        >
          Browse all articles →
        </Link>
      </div>

      {loading ? (
        <div className="border-2 border-dashed border-foreground/25 bg-background/50 p-12 text-center font-mono text-sm text-muted-foreground">
          Loading articles...
        </div>
      ) : error ? (
        <div className="border-2 border-dashed border-foreground/25 bg-background/50 p-12 text-center font-mono text-sm text-muted-foreground">
          {error}
        </div>
      ) : articles.length === 0 ? (
        <div className="border-2 border-dashed border-foreground/25 bg-background/50 p-12 text-center font-mono text-sm text-muted-foreground">
          No articles yet.{' '}
          <Link href="/publish" className="text-foreground underline underline-offset-2">
            Upload the first
          </Link>
          .
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {articles.map((a, i) => (
            <motion.article
              key={a.id}
              initial={{ opacity: 0, y: 16, filter: 'blur(4px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              transition={{ delay: 0.05 + i * 0.07, duration: 0.5, ease }}
              className="flex h-full flex-col border-2 border-foreground bg-background/80 p-5 backdrop-blur-sm"
            >
              <div className="mb-3 flex items-center justify-between gap-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                <span className="truncate">{a.publisher?.name ?? 'Unknown'}</span>
                <div className="flex shrink-0 items-center gap-1">
                  {a.isFree ? (
                    <span className="border border-[#ea580c]/60 px-2 py-0.5 text-[#ea580c]">Free</span>
                  ) : (
                    <span className="border border-foreground/30 px-2 py-0.5 text-foreground">{a.tier}</span>
                  )}
                </div>
              </div>
              <h3 className="mb-2 line-clamp-2 font-mono text-sm font-bold uppercase leading-snug tracking-tight text-foreground">
                {a.title}
              </h3>
              <p className="mb-4 line-clamp-3 flex-1 font-mono text-xs leading-relaxed text-muted-foreground">
                {a.summary}
              </p>
              <div className="flex items-center justify-between border-t border-foreground/20 pt-3 font-mono text-[10px] uppercase tracking-wider">
                <span className="text-muted-foreground">{a.isFree ? '—' : `${a.basePrice} USDC`}</span>
                <span className="text-muted-foreground">
                  Score: <span className="text-foreground">{a.qualityScore?.toFixed(1) ?? '—'}</span>
                </span>
              </div>
            </motion.article>
          ))}
        </div>
      )}
    </section>
  );
}
