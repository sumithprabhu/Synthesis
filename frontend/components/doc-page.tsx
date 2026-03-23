'use client';

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';

interface DocPageProps {
  title: string;
  subtitle?: string;
  rawContent: string;
  children: React.ReactNode;
}

export function DocPage({ title, subtitle, rawContent, children }: DocPageProps) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(rawContent).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <article>
      {/* Header */}
      <div className="mb-8 border-b border-foreground/10 pb-6">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h1 className="font-mono text-2xl font-bold uppercase tracking-tight text-foreground">
              {title}
            </h1>
            {subtitle && (
              <p className="mt-2 font-mono text-sm text-muted-foreground">{subtitle}</p>
            )}
          </div>
          <button
            onClick={handleCopy}
            className="flex shrink-0 items-center gap-1.5 border border-foreground/20 px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground"
          >
            {copied ? (
              <>
                <Check size={11} strokeWidth={2} className="text-green-500" />
                Copied
              </>
            ) : (
              <>
                <Copy size={11} strokeWidth={2} />
                Copy
              </>
            )}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="docs-content space-y-6">
        {children}
      </div>
    </article>
  );
}

/* ── Prose helpers ─────────────────────────────────────────── */

export function DocH2({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-3 mt-10 border-b border-foreground/10 pb-2 font-mono text-sm font-bold uppercase tracking-widest text-foreground first:mt-0">
      {children}
    </h2>
  );
}

export function DocH3({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-2 mt-6 font-mono text-[11px] font-bold uppercase tracking-wider text-foreground">
      {children}
    </h3>
  );
}

export function DocP({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-mono text-[13px] leading-relaxed text-muted-foreground">{children}</p>
  );
}

export function DocCode({ children }: { children: React.ReactNode }) {
  const [copied, setCopied] = useState(false);
  const text = typeof children === 'string' ? children : '';

  return (
    <div className="relative my-4">
      <pre className="overflow-x-auto border border-foreground/10 bg-foreground/[0.03] p-4 font-mono text-[11px] leading-relaxed text-foreground">
        {children}
      </pre>
      {text && (
        <button
          onClick={() => {
            navigator.clipboard.writeText(text).then(() => {
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            });
          }}
          className="absolute right-2 top-2 border border-foreground/10 bg-background px-2 py-1 font-mono text-[9px] uppercase tracking-widest text-muted-foreground hover:text-foreground"
        >
          {copied ? '✓' : 'copy'}
        </button>
      )}
    </div>
  );
}

export function DocInlineCode({ children }: { children: React.ReactNode }) {
  return (
    <code className="rounded-none border border-foreground/15 bg-foreground/[0.04] px-1.5 py-0.5 font-mono text-[11px] text-foreground">
      {children}
    </code>
  );
}

export function DocTable({
  headers,
  rows,
}: {
  headers: string[];
  rows: string[][];
}) {
  return (
    <div className="my-4 overflow-x-auto">
      <table className="w-full border-collapse font-mono text-[11px]">
        <thead>
          <tr className="border-b-2 border-foreground">
            {headers.map((h) => (
              <th key={h} className="py-2 pr-6 text-left font-bold uppercase tracking-wider text-foreground">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-foreground/10">
              {row.map((cell, j) => (
                <td key={j} className="py-2 pr-6 text-muted-foreground">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function DocCallout({
  type = 'info',
  children,
}: {
  type?: 'info' | 'warning' | 'tip';
  children: React.ReactNode;
}) {
  const styles = {
    info: 'border-l-2 border-blue-500 bg-blue-500/5',
    warning: 'border-l-2 border-[#ea580c] bg-[#ea580c]/5',
    tip: 'border-l-2 border-green-500 bg-green-500/5',
  };
  const labels = { info: 'Note', warning: 'Warning', tip: 'Tip' };
  const labelColors = {
    info: 'text-blue-500',
    warning: 'text-[#ea580c]',
    tip: 'text-green-600',
  };

  return (
    <div className={`my-4 px-4 py-3 ${styles[type]}`}>
      <p className={`mb-1 font-mono text-[9px] font-bold uppercase tracking-widest ${labelColors[type]}`}>
        {labels[type]}
      </p>
      <div className="font-mono text-[12px] leading-relaxed text-muted-foreground">{children}</div>
    </div>
  );
}

export function DocList({ items }: { items: string[] }) {
  return (
    <ul className="my-3 space-y-1.5">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2 font-mono text-[12px] text-muted-foreground">
          <span className="mt-1 h-1 w-1 shrink-0 bg-[#ea580c]" />
          {item}
        </li>
      ))}
    </ul>
  );
}
