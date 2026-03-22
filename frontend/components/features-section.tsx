'use client';

import { motion } from 'framer-motion';

const ease = [0.22, 1, 0.36, 1] as const;

const FEATURES = [
  {
    title: 'AI Negotiation',
    description: 'Agents negotiate micropayments automatically using reputation scores and configurable publisher policies.',
    tag: 'CORE',
  },
  {
    title: 'x402 Micropayments',
    description: 'Pay-per-article with USDC on Base Sepolia. Zero platform fees — payments go direct to publisher wallets.',
    tag: 'PAYMENTS',
  },
  {
    title: 'ERC-8004 Reputation',
    description: 'On-chain agent identity and reputation system. Publishers can gate content based on agent trust scores.',
    tag: 'IDENTITY',
  },
  {
    title: 'Smart Free Access',
    description: 'Grant free access automatically based on use case keywords or a minimum reputation score threshold.',
    tag: 'POLICY',
  },
  {
    title: 'OpenServ Agents',
    description: 'Publisher agents run on OpenServ with fully customizable negotiation parameters and access rules.',
    tag: 'AGENTS',
  },
  {
    title: 'Content Previews',
    description: 'Serve free previews with configurable preview length. Let agents evaluate before committing to a payment.',
    tag: 'UX',
  },
];

function FeatureCard({
  title,
  description,
  tag,
  index,
}: {
  title: string;
  description: string;
  tag: string;
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, filter: 'blur(4px)' }}
      whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ delay: 0.05 + index * 0.07, duration: 0.5, ease }}
      className="flex flex-col gap-3 border-2 border-foreground bg-background/80 p-5 backdrop-blur-sm"
    >
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#ea580c]">{tag}</span>
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          {String(index + 1).padStart(2, '0')}
        </span>
      </div>
      <h3 className="font-mono text-sm font-bold uppercase tracking-wide text-foreground">{title}</h3>
      <p className="font-mono text-xs leading-relaxed text-muted-foreground">{description}</p>
    </motion.div>
  );
}

export function FeaturesSection() {
  return (
    <section className="w-full px-6 py-20 lg:px-12">
      {/* Section label */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true, margin: '-80px' }}
        transition={{ duration: 0.5, ease }}
        className="mb-8 flex items-center gap-4"
      >
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          {'// SECTION: CAPABILITIES'}
        </span>
        <div className="flex-1 border-t border-border" />
        <span className="h-2 w-2 animate-blink bg-[#ea580c]" />
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">006</span>
      </motion.div>

      <div className="mb-10 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <h2 className="font-mono text-2xl font-bold uppercase tracking-tight text-foreground lg:text-3xl">
          Platform features
        </h2>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((feature, i) => (
          <FeatureCard key={feature.title} {...feature} index={i} />
        ))}
      </div>
    </section>
  );
}
