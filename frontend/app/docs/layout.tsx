'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { ThemeToggle } from '@/components/theme-toggle';
import { useState } from 'react';
import { Menu, X } from 'lucide-react';

const nav = [
  {
    group: 'Overview',
    items: [
      { label: 'Get Started', href: '/docs/get-started' },
      { label: 'Architecture', href: '/docs/architecture' },
    ],
  },
  {
    group: 'Guides',
    items: [
      { label: 'How it works for Agents', href: '/docs/how-it-works-agents' },
      { label: 'How it works for Humans', href: '/docs/how-it-works-humans' },
    ],
  },
  {
    group: 'Reference',
    items: [
      { label: 'skill.md', href: '/docs/skill' },
      { label: 'Contracts', href: '/docs/contracts' },
    ],
  },
];

function Sidebar({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname();
  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-foreground/10 p-4">
        <Link href="/" className="flex items-center gap-2" onClick={onClose}>
          <Image src="/logo.png" alt="Parley Protocol" width={20} height={20} className="object-contain" />
          <span className="font-mono text-[11px] font-bold uppercase tracking-[0.15em] text-foreground">
            Parley Protocol
          </span>
        </Link>
        <p className="mt-1 font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
          Documentation
        </p>
      </div>
      <nav className="flex-1 overflow-y-auto p-4">
        {nav.map((group) => (
          <div key={group.group} className="mb-6">
            <p className="mb-2 font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
              {group.group}
            </p>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active = pathname === item.href;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onClose}
                      className={`block border-l-2 py-1.5 pl-3 font-mono text-[11px] uppercase tracking-wider transition-colors ${
                        active
                          ? 'border-[#ea580c] text-foreground'
                          : 'border-transparent text-muted-foreground hover:border-foreground/30 hover:text-foreground'
                      }`}
                    >
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
      <div className="border-t border-foreground/10 p-4">
        <a
          href="https://github.com/sumithprabhu/Parley-Protocol"
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground hover:text-foreground"
        >
          GitHub ↗
        </a>
      </div>
    </div>
  );
}

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen flex-col">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-foreground/10 bg-background/90 backdrop-blur-sm">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              className="lg:hidden"
              onClick={() => setMobileOpen((v) => !v)}
            >
              {mobileOpen ? <X size={16} /> : <Menu size={16} />}
            </button>
            <Link href="/" className="flex items-center gap-2">
              <Image src="/logo.png" alt="Parley Protocol" width={18} height={18} className="object-contain" />
              <span className="font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-foreground">
                Parley Protocol
              </span>
            </Link>
            <span className="font-mono text-[9px] text-muted-foreground">/</span>
            <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">Docs</span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/demo"
              className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground hover:text-foreground"
            >
              Live Demo
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Desktop sidebar */}
        <aside className="hidden w-56 shrink-0 border-r border-foreground/10 lg:block">
          <div className="sticky top-[49px] h-[calc(100vh-49px)] overflow-y-auto">
            <Sidebar />
          </div>
        </aside>

        {/* Mobile sidebar overlay */}
        {mobileOpen && (
          <div className="fixed inset-0 z-30 lg:hidden">
            <div
              className="absolute inset-0 bg-background/80 backdrop-blur-sm"
              onClick={() => setMobileOpen(false)}
            />
            <aside className="absolute left-0 top-[49px] h-[calc(100%-49px)] w-56 border-r border-foreground/10 bg-background">
              <Sidebar onClose={() => setMobileOpen(false)} />
            </aside>
          </div>
        )}

        {/* Main content */}
        <main className="min-w-0 flex-1 px-6 py-10 lg:px-12 lg:py-12">
          <div className="mx-auto max-w-3xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
