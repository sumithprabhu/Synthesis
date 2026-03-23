'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter, usePathname } from 'next/navigation';
import { ChevronDown, LayoutDashboard, FileText, LogOut, User, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ThemeToggle } from '@/components/theme-toggle';
import { useAccount, useDisconnect } from 'wagmi';
import { useState, useRef, useEffect } from 'react';

const ease = [0.22, 1, 0.36, 1] as const;

function truncateAddress(addr: string) {
  return `${addr.slice(0, 5)}...${addr.slice(-3)}`;
}

type SessionInfo = { name: string; email: string; walletAddress: string } | null;

function decodeJwt(token: string): SessionInfo {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return { name: payload.name || '', email: payload.email || '', walletAddress: payload.walletAddress || '' };
  } catch {
    return null;
  }
}

function AuthButton() {
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [session, setSession] = useState<SessionInfo>(null);
  const ref = useRef<HTMLDivElement>(null);

  // Read JWT on mount + when storage changes
  useEffect(() => {
    function loadSession() {
      const token = localStorage.getItem('ca_token');
      setSession(token ? decodeJwt(token) : null);
    }
    loadSession();
    window.addEventListener('storage', loadSession);
    return () => window.removeEventListener('storage', loadSession);
  }, []);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function handleDisconnect() {
    disconnect();
    localStorage.removeItem('ca_token');
    setSession(null);
    setOpen(false);
    fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }

  const isLoggedIn = !!session || isConnected;

  if (!isLoggedIn) {
    return (
      <Link
        href="/login"
        className="bg-foreground px-4 py-2 font-mono text-xs uppercase tracking-widest text-background hover:opacity-90 transition-opacity"
      >
        Login
      </Link>
    );
  }

  // Display label: prefer name, then email, then wallet address
  const displayName = session?.name || session?.email || (isConnected && address ? truncateAddress(address) : '');
  // Sub-label for dropdown header
  const subLabel = session?.email || (isConnected && address ? truncateAddress(address) : '');

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
        <span className="max-w-[120px] truncate">{displayName}</span>
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
            className="absolute right-0 top-full z-50 mt-1 min-w-[180px] border-2 border-foreground bg-background shadow-lg"
          >
            {/* Identity header */}
            <div className="border-b border-foreground/10 px-4 py-3">
              <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-foreground truncate">
                {displayName}
              </p>
              {subLabel !== displayName && (
                <p className="mt-0.5 font-mono text-[9px] text-muted-foreground truncate">{subLabel}</p>
              )}
            </div>

            {[
              { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
              { href: '/publish', label: 'Publish', icon: FileText },
              { href: '/demo', label: 'Demo', icon: Zap },
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
              onClick={handleDisconnect}
              className="flex w-full items-center gap-2.5 border-t-2 border-foreground/20 px-4 py-3 font-mono text-[11px] uppercase tracking-wider text-[#ea580c] transition-colors hover:bg-foreground/5"
            >
              <LogOut size={12} strokeWidth={1.5} />
              Sign Out
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function NavLinks() {
  const pathname = usePathname();
  const router = useRouter();

  function scrollTo(id: string, e: React.MouseEvent) {
    e.preventDefault();
    if (pathname === '/') {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    } else {
      router.push(`/#${id}`);
    }
  }

  return (
    <div className="hidden items-center gap-6 md:flex">
      <a href="/#articles" onClick={(e) => scrollTo('articles', e)} className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground">
        Articles
      </a>
      <a href="/#features" onClick={(e) => scrollTo('features', e)} className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground">
        Features
      </a>
      <Link href="/docs" className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground">
        Documentation
      </Link>
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
          <Link href="/" className="flex items-center gap-2">
            <Image src="/logo.png" alt="Parley Protocol" width={48} height={48} className="object-contain" />
            <span className="text-xs font-bold uppercase tracking-[0.15em] text-foreground">Parley Protocol</span>
          </Link>
          <NavLinks />
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <AuthButton />
          </div>
        </div>
      </nav>
    </motion.div>
  );
}
