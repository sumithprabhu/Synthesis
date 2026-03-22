'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

const ease = [0.22, 1, 0.36, 1] as const;

export function HeroSection() {
  return (
    <section className="relative flex min-h-[calc(100vh-5.5rem)] w-full flex-col justify-center px-12 py-16 lg:px-24 lg:py-20">
      <div className="flex flex-col items-center text-center">
        <motion.h1
          initial={{ opacity: 0, y: 30, filter: 'blur(8px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ duration: 0.7, ease }}
          className="font-pixel mb-2 select-none text-3xl tracking-tight text-foreground sm:text-5xl lg:text-6xl xl:text-7xl"
        >
          PUBLISH. NEGOTIATE.
        </motion.h1>

        <motion.h1
          initial={{ opacity: 0, y: 30, filter: 'blur(8px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ duration: 0.7, delay: 0.15, ease }}
          className="font-pixel mb-8 select-none text-3xl tracking-tight sm:text-5xl lg:text-6xl xl:text-7xl"
        >
          <span className="text-[#ea580c]">EARN.</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.35, ease }}
          className="mb-8 max-w-lg px-4 font-mono text-xs leading-relaxed text-muted-foreground lg:text-sm"
        >
          The AI-native content marketplace. Agents negotiate micropayment access to your articles on-chain.
        </motion.p>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <motion.a
            href="#latest-content"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5, ease }}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="group flex w-fit cursor-pointer items-center gap-0 bg-foreground font-mono text-sm uppercase tracking-wider text-background"
          >
            <span className="flex h-10 w-10 items-center justify-center bg-[#ea580c]">
              <motion.span
                className="inline-flex"
                whileHover={{ y: 3 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              >
                <ArrowRight size={16} strokeWidth={2} className="rotate-90 text-background" />
              </motion.span>
            </span>
            <span className="px-5 py-2.5">Read Articles</span>
          </motion.a>

          <Link href="/publishers">
            <motion.span
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.55, ease }}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="inline-block border-2 border-foreground px-5 py-2.5 font-mono text-sm uppercase tracking-wider text-foreground"
            >
              View Publishers
            </motion.span>
          </Link>
        </div>
      </div>
    </section>
  );
}
