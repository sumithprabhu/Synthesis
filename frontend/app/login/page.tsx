'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Wallet, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { useAccount, useSignMessage } from 'wagmi';
import { useConnectModal } from '@rainbow-me/rainbowkit';

const ease = [0.22, 1, 0.36, 1] as const;

const inputCls =
  'w-full border-2 border-foreground bg-background px-4 py-3 font-mono text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#ea580c]/50';

type Tab = 'email' | 'wallet';

export default function LoginPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('email');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { address, isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();
  const { signMessageAsync } = useSignMessage();
  const [walletLoading, setWalletLoading] = useState(false);

  function switchTab(t: Tab) { setTab(t); setError(null); }

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      // Try login first; if not found, auto-register then login
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (res.status === 401 && data.error === 'Invalid credentials') {
        // Account might not exist — try registering
        const regRes = await fetch('/api/publisher/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: email.split('@')[0], email, password }),
        });
        const regData = await regRes.json();
        if (!regRes.ok && regRes.status !== 409) {
          setError(regData.error || 'Sign in failed');
          return;
        }
        // Now login
        const res2 = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });
        const data2 = await res2.json();
        if (!res2.ok) { setError(data2.error || 'Sign in failed'); return; }
        localStorage.setItem('ca_token', data2.token);
        window.dispatchEvent(new Event('storage'));
        router.push('/dashboard');
        return;
      }

      if (!res.ok) { setError(data.error || 'Sign in failed'); return; }
      localStorage.setItem('ca_token', data.token);
      window.dispatchEvent(new Event('storage'));
      router.push('/dashboard');
    } catch {
      setError('Request failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleWalletLogin() {
    if (!isConnected || !address) { openConnectModal?.(); return; }
    setError(null);
    setWalletLoading(true);
    try {
      const nonceRes = await fetch(`/api/auth/nonce?address=${address}`);
      const { nonce, message } = await nonceRes.json();
      const signature = await signMessageAsync({ message });
      const loginRes = await fetch('/api/auth/wallet-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, signature, nonce }),
      });
      const data = await loginRes.json();
      if (!loginRes.ok) { setError(data.error || 'Wallet login failed'); return; }
      localStorage.setItem('ca_token', data.token);
      window.dispatchEvent(new Event('storage'));
      router.push('/dashboard');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Wallet login failed';
      setError(msg.includes('rejected') || msg.includes('denied') ? 'Signature rejected' : msg);
    } finally {
      setWalletLoading(false);
    }
  }

  return (
    <div className="dot-grid-bg flex min-h-screen flex-col items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 24, filter: 'blur(8px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        transition={{ duration: 0.6, ease }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <Link href="/" className="mb-8 flex items-center gap-3">
          <Image src="/logo.png" alt="Parley Protocol" width={28} height={28} className="object-contain" />
          <span className="font-mono text-xs font-bold uppercase tracking-[0.15em] text-foreground">Parley Protocol</span>
        </Link>

        {/* Header rule */}
        <div className="mb-6 flex items-center gap-4">
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">// AUTH</span>
          <div className="flex-1 border-t border-border" />
          <span className="h-2 w-2 bg-[#ea580c]" />
        </div>

        {/* Tab switcher — Email / Wallet */}
        <div className="mb-5 flex border-2 border-foreground">
          {(['email', 'wallet'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => switchTab(t)}
              className={`flex flex-1 items-center justify-center gap-2 py-2.5 font-mono text-[11px] uppercase tracking-widest transition-colors ${
                tab === t ? 'bg-foreground text-background' : 'text-muted-foreground hover:bg-foreground/5'
              }`}
            >
              {t === 'email' ? <Mail size={12} /> : <Wallet size={12} />}
              {t === 'email' ? 'Email' : 'Wallet'}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {tab === 'email' ? (
            <motion.div
              key="email"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.2, ease }}
            >
              <form onSubmit={handleEmailSubmit} className="space-y-4">
                <div>
                  <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="publisher@example.com"
                    className={inputCls}
                  />
                </div>

                <div>
                  <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPass ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      placeholder="••••••••"
                      className={inputCls + ' pr-10'}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>

                {error && (
                  <p className="border border-red-500/40 bg-red-500/10 px-3 py-2 font-mono text-[11px] text-red-500">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-0 bg-foreground font-mono text-xs uppercase tracking-widest text-background disabled:opacity-50"
                >
                  <span className="flex h-10 w-10 items-center justify-center bg-[#ea580c]">
                    <ArrowRight size={14} />
                  </span>
                  <span className="flex-1 py-2.5">
                    {loading ? 'Signing in…' : 'Continue'}
                  </span>
                </button>
              </form>
            </motion.div>
          ) : (
            <motion.div
              key="wallet"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2, ease }}
              className="space-y-4"
            >
              {isConnected && address && (
                <div className="border border-foreground/20 bg-background/50 px-4 py-3">
                  <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Connected</p>
                  <p className="mt-1 font-mono text-xs text-foreground">{address.slice(0, 10)}…{address.slice(-6)}</p>
                </div>
              )}

              {error && (
                <p className="border border-red-500/40 bg-red-500/10 px-3 py-2 font-mono text-[11px] text-red-500">
                  {error}
                </p>
              )}

              <button
                onClick={handleWalletLogin}
                disabled={walletLoading}
                className="flex w-full items-center justify-center gap-0 bg-foreground font-mono text-xs uppercase tracking-widest text-background disabled:opacity-50"
              >
                <span className="flex h-10 w-10 items-center justify-center bg-[#ea580c]">
                  <Wallet size={14} />
                </span>
                <span className="flex-1 py-2.5">
                  {walletLoading ? 'Signing…' : isConnected ? 'Sign & Login' : 'Connect & Sign'}
                </span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
