'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Mail, Wallet, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { useAccount, useSignMessage } from 'wagmi';
import { useConnectModal } from '@rainbow-me/rainbowkit';

const ease = [0.22, 1, 0.36, 1] as const;

const inputCls =
  'w-full border-2 border-foreground bg-background px-4 py-3 font-mono text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#ea580c]/50';

type Tab = 'email' | 'wallet';

export default function LoginPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('email');

  // Email/password
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Wallet
  const { address, isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();
  const { signMessageAsync } = useSignMessage();
  const [walletLoading, setWalletLoading] = useState(false);

  function saveSession(token: string) {
    localStorage.setItem('ca_token', token);
  }

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setEmailLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Login failed'); return; }
      saveSession(data.token);
      router.push('/dashboard');
    } catch {
      setError('Request failed');
    } finally {
      setEmailLoading(false);
    }
  }

  async function handleWalletLogin() {
    if (!isConnected || !address) { openConnectModal?.(); return; }
    setError(null);
    setWalletLoading(true);
    try {
      // 1. Get nonce
      const nonceRes = await fetch(`/api/auth/nonce?address=${address}`);
      const { nonce, message } = await nonceRes.json();
      // 2. Sign
      const signature = await signMessageAsync({ message });
      // 3. Verify + get token
      const loginRes = await fetch('/api/auth/wallet-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, signature, nonce }),
      });
      const data = await loginRes.json();
      if (!loginRes.ok) { setError(data.error || 'Wallet login failed'); return; }
      saveSession(data.token);
      router.push('/dashboard');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Wallet login failed';
      if (msg.includes('rejected') || msg.includes('denied')) {
        setError('Signature rejected');
      } else {
        setError(msg);
      }
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
          <Bot size={16} strokeWidth={1.5} />
          <span className="font-mono text-xs font-bold uppercase tracking-[0.15em] text-foreground">Parley Protocol</span>
        </Link>

        {/* Header */}
        <div className="mb-6 flex items-center gap-4">
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">// AUTH</span>
          <div className="flex-1 border-t border-border" />
          <span className="h-2 w-2 animate-blink bg-[#ea580c]" />
        </div>

        <h1 className="mb-1 font-pixel text-lg uppercase tracking-tight text-foreground">Sign In</h1>
        <p className="mb-8 font-mono text-xs text-muted-foreground">
          Session valid for 12 hours.{' '}
          <Link href="/register" className="text-foreground underline underline-offset-2">
            No account? Register →
          </Link>
        </p>

        {/* Tab switcher */}
        <div className="mb-6 flex border-2 border-foreground">
          {(['email', 'wallet'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); setError(null); }}
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
            <motion.form
              key="email"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.2, ease }}
              onSubmit={handleEmailLogin}
              className="space-y-4"
            >
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
                disabled={emailLoading}
                className="flex w-full items-center justify-center gap-0 bg-foreground font-mono text-xs uppercase tracking-widest text-background disabled:opacity-50"
              >
                <span className="flex h-10 w-10 items-center justify-center bg-[#ea580c]">
                  <ArrowRight size={14} />
                </span>
                <span className="flex-1 py-2.5">{emailLoading ? 'Signing in…' : 'Sign In'}</span>
              </button>
            </motion.form>
          ) : (
            <motion.div
              key="wallet"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2, ease }}
              className="space-y-4"
            >
              <p className="font-mono text-xs leading-relaxed text-muted-foreground">
                Sign a message with your publisher wallet to authenticate. No gas required.
              </p>

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
