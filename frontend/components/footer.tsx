'use client';

import { motion } from 'framer-motion';

const ease = [0.22, 1, 0.36, 1] as const;

const links = [
  { name: 'Dashboard', href: '/dashboard', external: false },
  { name: 'Publishers', href: '/publishers', external: false },
  { name: 'GitHub', href: 'https://github.com/sumithprabhu/ContentAgents', external: true },
] as const;

export function Footer() {
  return (
    <motion.footer
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.6, ease }}
      className="w-full border-t-2 border-foreground px-6 py-8 lg:px-12"
    >
      <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-bold uppercase tracking-[0.15em] text-foreground">ContentAgents</span>
          <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
            The negotiating web · x402 · Base
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-6">
          {links.map((item, i) => (
            <motion.a
              key={item.name}
              href={item.href}
              initial={{ opacity: 0, y: 6 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 + i * 0.06, duration: 0.4, ease }}
              className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground transition-colors duration-200 hover:text-foreground"
              {...(item.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
            >
              {item.name}
            </motion.a>
          ))}
        </div>
      </div>
    </motion.footer>
  );
}
