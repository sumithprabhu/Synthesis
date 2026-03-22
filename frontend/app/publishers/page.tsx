'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';

const ease = [0.22, 1, 0.36, 1] as const;

type Publisher = {
  id: string;
  name: string;
  walletAddress: string;
  earnings: number;
  agentCreated: boolean;
  articleCount: number;
  createdAt: string;
};

function truncateWallet(addr: string) {
  if (addr.length < 12) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export default function PublishersPage() {
  const [publishers, setPublishers] = useState<Publisher[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/publishers')
      .then((r) => r.json())
      .then((data) => {
        setPublishers(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to load publishers');
        setLoading(false);
      });
  }, []);

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="px-6 py-12 lg:px-12 lg:py-16">
        <div className="mx-auto max-w-5xl">
          {/* Section label */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, ease }}
            className="mb-8 flex items-center gap-4"
          >
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              {'// DIRECTORY: PUBLISHERS'}
            </span>
            <div className="flex-1 border-t border-border" />
            <span className="h-2 w-2 animate-blink bg-[#ea580c]" />
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">009</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20, filter: 'blur(8px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{ duration: 0.6, ease }}
            className="mb-4 font-pixel text-2xl uppercase tracking-tight text-foreground sm:text-3xl"
          >
            PUBLISHERS
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15, ease }}
            className="mb-12 max-w-xl font-mono text-sm leading-relaxed text-muted-foreground"
          >
            Registered wallets on ContentAgents. Article counts and earnings are shown for discovery.
          </motion.p>

          {loading ? (
            <div className="border-2 border-dashed border-foreground/25 bg-background/50 p-12 text-center font-mono text-sm text-muted-foreground">
              Loading publishers...
            </div>
          ) : error ? (
            <div className="border-2 border-dashed border-foreground/25 bg-background/50 p-12 text-center font-mono text-sm text-muted-foreground">
              {error}
            </div>
          ) : publishers.length === 0 ? (
            <div className="border-2 border-dashed border-foreground/25 bg-background/50 p-12 text-center font-mono text-sm text-muted-foreground">
              No publishers yet.{' '}
              <Link href="/dashboard" className="text-foreground underline underline-offset-2">
                Open dashboard
              </Link>{' '}
              to get started.
            </div>
          ) : (
            <motion.ul
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.2, ease }}
              className="space-y-0 border-2 border-foreground"
            >
              {publishers.map((p, i) => (
                <motion.li
                  key={p.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + i * 0.06, duration: 0.4, ease }}
                  className={i > 0 ? 'border-t-2 border-foreground' : ''}
                >
                  <Link
                    href={`/publishers/${p.id}`}
                    className="block bg-background/80 p-5 backdrop-blur-sm transition-colors duration-150 hover:bg-foreground/5"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h2 className="font-mono text-sm font-bold uppercase tracking-wide text-foreground">
                          {p.name}
                        </h2>
                        <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                          {truncateWallet(p.walletAddress)}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-6 font-mono text-[10px] uppercase tracking-wider">
                        <div>
                          <div className="text-muted-foreground">Articles</div>
                          <div className="mt-0.5 text-foreground">{p.articleCount}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Earnings</div>
                          <div className="mt-0.5 text-foreground">{Number(p.earnings).toFixed(4)} USDC</div>
                        </div>
                        <div>
                          <div className="mb-0.5 text-muted-foreground">Agent</div>
                          {p.agentCreated ? (
                            <span className="border border-green-500/60 px-2 py-0.5 text-green-500">
                              Agent Active
                            </span>
                          ) : (
                            <span className="border border-foreground/30 px-2 py-0.5 text-muted-foreground">
                              No Agent
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.li>
              ))}
            </motion.ul>
          )}

          <p className="mt-10 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
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
