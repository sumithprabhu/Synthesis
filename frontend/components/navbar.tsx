'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bot, ChevronDown, LayoutDashboard, FileText, LogOut, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ThemeToggle } from '@/components/theme-toggle';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import { useAccount, useDisconnect } from 'wagmi';
import { useState, useRef, useEffect } from 'react';

const ease = [0.22, 1, 0.36, 1] as const;

function truncateAddress(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function WalletButton() {
  const { address, isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();
  const { disconnect } = useDisconnect();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  if (!isConnected || !address) {
    return (
      <div className="flex items-center gap-2">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={openConnectModal}
          className="bg-foreground px-4 py-2 font-mono text-xs uppercase tracking-widest text-background"
        >
          Connect Wallet
        </motion.button>
        <Link href="/login" className="font-mono text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground">
          Sign In
        </Link>
      </div>
    );
  }

  return (
    <div ref={ref} className="relative">
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 border border-foreground/30 bg-background/80 px-3 py-1.5 font-mono text-xs uppercase tracking-widest text-foreground backdrop-blur-sm"
      >
        <span className="flex h-5 w-5 items-center justify-center bg-[#ea580c] text-background">
          <User size={11} strokeWidth={1.5} />
        </span>
        <span>{truncateAddress(address)}</span>
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown size={12} strokeWidth={2} />
        </motion.span>
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.15, ease }}
            className="absolute right-0 top-full z-50 mt-1 min-w-[160px] border-2 border-foreground bg-background shadow-lg"
          >
            {[
              { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
              { href: '/publish', label: 'Publish', icon: FileText },
            ].map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 border-b border-foreground/10 px-4 py-3 font-mono text-[11px] uppercase tracking-wider text-foreground transition-colors last:border-0 hover:bg-foreground/5"
              >
                <Icon size={12} strokeWidth={1.5} className="text-muted-foreground" />
                {label}
              </Link>
            ))}
            <button
              onClick={() => {
                disconnect();
                localStorage.removeItem('ca_token');
                fetch('/api/auth/logout', { method: 'POST' });
                setOpen(false);
                router.push('/login');
              }}
              className="flex w-full items-center gap-2.5 border-t-2 border-foreground/20 px-4 py-3 font-mono text-[11px] uppercase tracking-wider text-[#ea580c] transition-colors hover:bg-foreground/5"
            >
              <LogOut size={12} strokeWidth={1.5} />
              Disconnect
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function Navbar() {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease }}
      className="w-full px-4 pt-4 lg:px-6 lg:pt-6"
    >
      <nav className="w-full border border-foreground/20 bg-background/80 px-6 py-3 backdrop-blur-sm lg:px-8">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <Bot size={16} strokeWidth={1.5} />
            <span className="text-xs font-bold uppercase tracking-[0.15em] text-foreground">ContentAgents</span>
          </Link>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <WalletButton />
          </div>
        </div>
      </nav>
    </motion.div>
  );
}
