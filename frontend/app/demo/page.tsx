'use client';

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';
import {
  CheckCircle,
  XCircle,
  Loader2,
  ChevronDown,
  ExternalLink,
  Play,
  RotateCcw,
  Zap,
} from 'lucide-react';

const ease = [0.22, 1, 0.36, 1] as const;

type StepStatus = 'running' | 'done' | 'error';

interface Step {
  id: string;
  title: string;
  status: StepStatus;
  detail?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data?: Record<string, any>;
}

type DemoState = 'idle' | 'running' | 'complete' | 'error';

function StatusIcon({ status }: { status: StepStatus }) {
  if (status === 'running') return <Loader2 size={14} className="animate-spin text-[#ea580c]" />;
  if (status === 'done') return <CheckCircle size={14} className="text-green-500" />;
  return <XCircle size={14} className="text-red-500" />;
}

function DataRow({ k, v }: { k: string; v: string }) {
  const isLink = typeof v === 'string' && v.startsWith('http');
  return (
    <div className="flex gap-2 text-[10px]">
      <span className="w-36 shrink-0 text-muted-foreground">{k}</span>
      {isLink ? (
        <a
          href={v}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 break-all font-mono text-[#ea580c] hover:underline"
        >
          {v.length > 50 ? v.slice(0, 50) + '…' : v}
          <ExternalLink size={9} />
        </a>
      ) : (
        <span className="break-all font-mono text-foreground">{String(v)}</span>
      )}
    </div>
  );
}

function StepCard({ step, index }: { step: Step; index: number }) {
  const [open, setOpen] = useState(step.status === 'running');

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease }}
      className={`border-l-2 pl-4 ${
        step.status === 'done'
          ? 'border-green-500'
          : step.status === 'error'
          ? 'border-red-500'
          : 'border-[#ea580c]'
      }`}
    >
      <button
        onClick={() => step.data && setOpen((v) => !v)}
        className="flex w-full items-start gap-3 py-2 text-left"
      >
        <span className="mt-0.5 shrink-0">
          <StatusIcon status={step.status} />
        </span>
        <div className="flex-1">
          <p className="font-mono text-[11px] font-bold uppercase tracking-wider text-foreground">
            {step.title}
          </p>
          {step.detail && (
            <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">{step.detail}</p>
          )}
        </div>
        {step.data && (
          <motion.span
            animate={{ rotate: open ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            className="shrink-0 text-muted-foreground"
          >
            <ChevronDown size={12} />
          </motion.span>
        )}
      </button>

      <AnimatePresence>
        {open && step.data && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease }}
            className="overflow-hidden"
          >
            <div className="mb-3 ml-6 space-y-1 border border-foreground/10 bg-foreground/[0.02] p-3">
              {Object.entries(step.data).map(([k, v]) => (
                <DataRow key={k} k={k} v={String(v)} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function DemoPage() {
  const [state, setDemoState] = useState<DemoState>('idle');
  const [steps, setSteps] = useState<Step[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [summary, setSummary] = useState<Record<string, any> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  function upsertStep(incoming: Step) {
    setSteps((prev) => {
      const idx = prev.findIndex((s) => s.id === incoming.id);
      if (idx === -1) return [...prev, incoming];
      const next = [...prev];
      next[idx] = incoming;
      return next;
    });
  }

  async function startDemo() {
    setDemoState('running');
    setSteps([]);
    setSummary(null);
    setErrorMsg(null);

    abortRef.current = new AbortController();

    try {
      const res = await fetch('/api/demo', { signal: abortRef.current.signal });
      if (!res.body) throw new Error('No response body');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const messages = buffer.split('\n\n');
        buffer = messages.pop() ?? '';

        for (const msg of messages) {
          const lines = msg.trim().split('\n');
          let eventType = 'message';
          let dataLine = '';
          for (const line of lines) {
            if (line.startsWith('event: ')) eventType = line.slice(7);
            if (line.startsWith('data: ')) dataLine = line.slice(6);
          }
          if (!dataLine) continue;

          try {
            const parsed = JSON.parse(dataLine);
            if (eventType === 'step') {
              upsertStep(parsed as Step);
            } else if (eventType === 'complete') {
              setSummary(parsed.summary);
              setDemoState('complete');
            } else if (eventType === 'error') {
              setErrorMsg(parsed.message ?? 'Unknown error');
              setDemoState('error');
            }
          } catch {
            // ignore parse errors
          }
        }
      }
    } catch (e) {
      if ((e as Error).name !== 'AbortError') {
        setErrorMsg(e instanceof Error ? e.message : 'Connection failed');
        setDemoState('error');
      }
    }
  }

  function reset() {
    abortRef.current?.abort();
    setDemoState('idle');
    setSteps([]);
    setSummary(null);
    setErrorMsg(null);
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-16 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease }}
          className="mb-10"
        >
          <div className="mb-3 flex items-center gap-2">
            <Zap size={14} className="text-[#ea580c]" strokeWidth={2} />
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Live Playground
            </span>
          </div>
          <h1 className="mb-2 font-mono text-2xl font-bold uppercase tracking-tight text-foreground">
            Agent Negotiation Demo
          </h1>
          <p className="font-mono text-xs text-muted-foreground">
            Watch a consumer agent autonomously browse, negotiate, and pay for content using x402
            micropayments on Base — live, step by step.
          </p>
        </motion.div>

        {/* Protocol legend */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="mb-8 flex flex-wrap gap-3"
        >
          {[
            { label: 'x402 v1', color: 'bg-[#ea580c]/10 text-[#ea580c]' },
            { label: 'ERC-8004', color: 'bg-green-500/10 text-green-600' },
            { label: 'Base Sepolia', color: 'bg-blue-500/10 text-blue-600' },
            { label: 'Claude AI Negotiation', color: 'bg-purple-500/10 text-purple-600' },
          ].map(({ label, color }) => (
            <span
              key={label}
              className={`rounded-none px-2 py-1 font-mono text-[9px] uppercase tracking-widest ${color}`}
            >
              {label}
            </span>
          ))}
        </motion.div>

        {/* Start / Reset button */}
        <div className="mb-8 flex items-center gap-3">
          {state === 'idle' || state === 'error' ? (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={startDemo}
              className="flex items-center gap-2 bg-foreground px-5 py-2.5 font-mono text-xs uppercase tracking-widest text-background"
            >
              <Play size={12} strokeWidth={2} />
              {state === 'error' ? 'Retry Demo' : 'Run Demo'}
            </motion.button>
          ) : state === 'running' ? (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={reset}
              className="flex items-center gap-2 border border-foreground/30 px-5 py-2.5 font-mono text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground"
            >
              <RotateCcw size={12} strokeWidth={2} />
              Cancel
            </motion.button>
          ) : (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={reset}
              className="flex items-center gap-2 border-2 border-foreground px-5 py-2.5 font-mono text-xs uppercase tracking-widest text-foreground"
            >
              <RotateCcw size={12} strokeWidth={2} />
              Run Again
            </motion.button>
          )}

          {state === 'running' && (
            <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-[#ea580c]">
              <Loader2 size={10} className="animate-spin" />
              Agents negotiating…
            </span>
          )}
          {state === 'complete' && (
            <span className="font-mono text-[10px] uppercase tracking-widest text-green-600">
              ✓ Demo complete
            </span>
          )}
          {state === 'error' && errorMsg && (
            <span className="font-mono text-[10px] text-red-500">{errorMsg}</span>
          )}
        </div>

        {/* Steps timeline */}
        {steps.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-8 space-y-2"
          >
            {steps.map((step, i) => (
              <StepCard key={step.id + i} step={step} index={i} />
            ))}
          </motion.div>
        )}

        {/* Summary card */}
        <AnimatePresence>
          {summary && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4, ease }}
              className="border-2 border-foreground p-5"
            >
              <p className="mb-4 font-mono text-[10px] font-bold uppercase tracking-widest text-[#ea580c]">
                ✦ Protocol Summary
              </p>
              <div className="space-y-1.5">
                {Object.entries(summary).map(([k, v]) => (
                  <DataRow key={k} k={k} v={String(v)} />
                ))}
              </div>
              <div className="mt-4 border-t border-foreground/10 pt-4">
                <p className="mb-2 font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
                  On-chain Proof
                </p>
                <div className="space-y-1">
                  <DataRow
                    k="AgentRegistry"
                    v="https://sepolia.basescan.org/address/0xb0088D1300E10CF5AAC0d21c9d434885dCE2D305"
                  />
                  <DataRow
                    k="Example x402 Tx"
                    v="https://sepolia.basescan.org/tx/0xde3dbeefa8b0caed96d39327ec8479051a258b63168a0d9986ebedcf8af8bde6"
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Idle state hint */}
        {state === 'idle' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="border border-dashed border-foreground/20 p-8 text-center"
          >
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Press "Run Demo" to start the live agent simulation
            </p>
            <p className="mt-1 font-mono text-[9px] text-muted-foreground/60">
              Browse → 402 Paywall → ERC-8004 Reputation → Negotiate → x402 Pay → Unlock Content
            </p>
          </motion.div>
        )}
      </main>
      <Footer />
    </div>
  );
}
