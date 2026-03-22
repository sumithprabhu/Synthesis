'use client';

import { useEffect, useState, useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import Image from 'next/image';

const ease = [0.22, 1, 0.36, 1] as const;

function ScrambleText({ text, className }: { text: string; className?: string }) {
  const [display, setDisplay] = useState(text);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-50px' });
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_./:';

  useEffect(() => {
    if (!inView) return;
    let iteration = 0;
    const interval = setInterval(() => {
      setDisplay(
        text
          .split('')
          .map((char, i) => {
            if (char === ' ') return ' ';
            if (i < iteration) return text[i];
            return chars[Math.floor(Math.random() * chars.length)];
          })
          .join('')
      );
      iteration += 0.5;
      if (iteration >= text.length) {
        setDisplay(text);
        clearInterval(interval);
      }
    }, 30);
    return () => clearInterval(interval);
  }, [inView, text]);

  return (
    <span ref={ref} className={className}>
      {display}
    </span>
  );
}

function BlinkDot() {
  return <span className="inline-block h-2 w-2 animate-blink bg-[#ea580c]" />;
}

function UptimeCounter() {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const base = 31536000 + Math.floor(Math.random() * 1000000);
    setSeconds(base);
    const interval = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const format = (n: number) => {
    const d = Math.floor(n / 86400);
    const h = Math.floor((n % 86400) / 3600);
    const m = Math.floor((n % 3600) / 60);
    const s = n % 60;
    return `${d}d ${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`;
  };

  return (
    <span className="font-mono text-[#ea580c]" style={{ fontVariantNumeric: 'tabular-nums' }}>
      {format(seconds)}
    </span>
  );
}

const STATS = [
  { label: 'NETWORK', value: 'Base' },
  { label: 'PAYMENTS', value: 'x402' },
  { label: 'AGENTS', value: 'OpenServ' },
  { label: 'IDENTITY', value: 'ERC-8004' },
];

function StatBlock({ label, value, index }: { label: string; value: string; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16, filter: 'blur(4px)' }}
      whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      viewport={{ once: true, margin: '-30px' }}
      transition={{ delay: 0.15 + index * 0.08, duration: 0.5, ease }}
      className="flex flex-col gap-1 border-2 border-foreground px-4 py-3"
    >
      <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{label}</span>
      <span className="font-mono text-xl font-bold tracking-tight lg:text-2xl">
        <ScrambleText text={value} />
      </span>
    </motion.div>
  );
}

export function AboutSection() {
  return (
    <section className="w-full px-6 py-20 lg:px-12">
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true, margin: '-80px' }}
        transition={{ duration: 0.5, ease }}
        className="mb-8 flex items-center gap-4"
      >
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          {'// SECTION: ABOUT_CONTENTAGENTS'}
        </span>
        <div className="flex-1 border-t border-border" />
        <BlinkDot />
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">005</span>
      </motion.div>

      <div className="flex flex-col gap-0 border-2 border-foreground lg:flex-row">
        <motion.div
          initial={{ opacity: 0, x: -30, filter: 'blur(6px)' }}
          whileInView={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.7, ease }}
          className="relative min-h-[300px] w-full overflow-hidden border-b-2 border-foreground bg-foreground lg:min-h-[500px] lg:w-1/2 lg:border-b-0 lg:border-r-2"
        >
          <div className="absolute left-0 right-0 top-0 z-10 flex items-center justify-between bg-foreground/80 px-4 py-2 backdrop-blur-sm">
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-background/60">
              RENDER: agent_mesh.svg
            </span>
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#ea580c]">LIVE</span>
          </div>

          <Image
            src="/images/about-isometric.svg"
            alt="Isometric visualization of publisher agents and negotiation graph"
            fill
            className="object-cover"
            sizes="(max-width: 1024px) 100vw, 50vw"
            priority
            unoptimized
          />

          <div className="absolute bottom-0 left-0 right-0 z-10 flex items-center justify-between bg-foreground/80 px-4 py-2 backdrop-blur-sm">
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-background/40">
              {'CAM: -45deg / ISO'}
            </span>
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-background/40">VECTOR</span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.7, delay: 0.1, ease }}
          className="flex w-full flex-col lg:w-1/2"
        >
          <div className="flex items-center justify-between border-b-2 border-foreground px-5 py-3">
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">README.md</span>
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">v1.0.0</span>
          </div>

          <div className="flex flex-1 flex-col justify-between px-5 py-6 lg:py-8">
            <div className="flex flex-col gap-6">
              <motion.h2
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-30px' }}
                transition={{ duration: 0.5, delay: 0.2, ease }}
                className="text-balance font-mono text-2xl font-bold uppercase tracking-tight lg:text-3xl"
              >
                Publishers and agents,
                <br />
                <span className="text-[#ea580c]">connected by payments</span>
              </motion.h2>

              <motion.div
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-30px' }}
                transition={{ delay: 0.3, duration: 0.5, ease }}
                className="flex flex-col gap-4"
              >
                <p className="font-mono text-xs leading-relaxed text-muted-foreground lg:text-sm">
                  ContentAgents is the negotiating web: you publish articles, configure an autonomous publisher agent on
                  OpenServ, and incoming consumer agents negotiate access. Settlement uses x402-style micropayments in
                  USDC on Base.
                </p>
                <p className="font-mono text-xs leading-relaxed text-muted-foreground lg:text-sm">
                  Use the dashboard to register, deploy your agent, and track earnings. ERC-8004-compatible identity
                  helps agents reason about reputation before they strike a deal.
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scaleX: 0.8 }}
                whileInView={{ opacity: 1, scaleX: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.4, duration: 0.5, ease }}
                style={{ transformOrigin: 'left' }}
                className="flex items-center gap-3 border-b-2 border-t-2 border-foreground py-3"
              >
                <span className="h-1.5 w-1.5 bg-[#ea580c]" />
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">UPTIME:</span>
                <UptimeCounter />
              </motion.div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-0">
              {STATS.map((stat, i) => (
                <StatBlock key={stat.label} {...stat} index={i} />
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
