'use client';

import { motion } from 'framer-motion';

const ease = [0.22, 1, 0.36, 1] as const;

const PARTNERS = [
  'NEXT.JS',
  'BASE SEPOLIA',
  'ERC-8004',
  'x402',
  'USDC',
  'OPENSERV',
  'MONGODB',
  'CDP WALLETS',
  'FRAMER MOTION',
];

function LogoBlock({ name, glitch }: { name: string; glitch: boolean }) {
  return (
    <div
      className={`flex shrink-0 items-center justify-center border-r-2 border-foreground px-8 py-4 ${
        glitch ? 'animate-glitch' : ''
      }`}
    >
      <span className="whitespace-nowrap font-mono text-sm uppercase tracking-[0.15em] text-foreground">{name}</span>
    </div>
  );
}

export function GlitchMarquee() {
  const glitchIndices = [2, 6];

  return (
    <section className="w-full px-6 py-16 lg:px-12">
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true, margin: '-80px' }}
        transition={{ duration: 0.5, ease }}
        className="mb-8 flex items-center gap-4"
      >
        <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          {'// STACK & ECOSYSTEM'}
        </span>
        <div className="flex-1 border-t border-border" />
        <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">008</span>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-40px' }}
        transition={{ duration: 0.6, ease }}
        className="overflow-hidden border-2 border-foreground"
      >
        <div className="flex animate-marquee" style={{ width: 'max-content' }}>
          {[...PARTNERS, ...PARTNERS].map((name, i) => (
            <LogoBlock key={`${name}-${i}`} name={name} glitch={glitchIndices.includes(i % PARTNERS.length)} />
          ))}
        </div>
      </motion.div>
    </section>
  );
}
