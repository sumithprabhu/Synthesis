'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { authFetch } from '@/lib/use-auth-fetch';
import { motion, AnimatePresence } from 'framer-motion';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';
import {
  FileText,
  DraftingCompass,
  TrendingUp,
  Settings,
  MessageSquare,
  Plus,
  ExternalLink,
  Send,
} from 'lucide-react';

const ease = [0.22, 1, 0.36, 1] as const;
const EXPLORER = 'https://sepolia.basescan.org';

type Publisher = {
  id: string;
  name: string;
  email: string;
  walletAddress: string;
  generosity: number;
  minPrice: number;
  reputationThreshold: number;
  earnings: number;
  articles: { id: string }[];
  erc8004Id?: string | null;
  agentCreated: boolean;
  openservAgentId?: string | null;
  freeForHighReputation: boolean;
  allowFreeByUseCase: boolean;
  freeCaseKeywords: string;
};

type Negotiation = {
  id: string;
  articleId: string;
  consumerAddress: string;
  status: string;
  initialPrice: number;
  finalPrice: number | null;
  rounds: Array<{ role: string; offer: number; reasoning: string }>;
  createdAt: string;
};

type AccessLog = {
  id: string;
  articleId: string;
  consumerAgent: string;
  pricePaid: number;
  negotiationRounds: number;
  txHash: string | null;
  createdAt: string;
  article: { title: string };
};

type Stats = {
  totalNegotiations: number;
  acceptedDeals: number;
  totalApiCalls: number;
  totalEarnings: number;
};

type Article = {
  id: string;
  title: string;
  summary: string;
  tier: string;
  basePrice: number;
  qualityScore: number;
  isFree: boolean;
  isDraft: boolean;
  thumbnail?: string | null;
  previewLength: number;
  publisher?: { name: string };
  createdAt?: string;
};

type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

type Tab = 'articles' | 'drafts' | 'income' | 'settings' | 'chat';

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'articles', label: 'Articles', icon: FileText },
  { id: 'drafts', label: 'Drafts', icon: DraftingCompass },
  { id: 'income', label: 'Income', icon: TrendingUp },
  { id: 'settings', label: 'Agent Settings', icon: Settings },
  { id: 'chat', label: 'Chat', icon: MessageSquare },
];

const inputCls =
  'w-full border-2 border-foreground bg-background px-3 py-2 font-mono text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-[#ea580c]/50';
const primaryBtn =
  'bg-foreground text-background font-mono text-xs uppercase tracking-widest px-4 py-2 hover:opacity-80 transition-opacity disabled:opacity-40';
const secondaryBtn =
  'border-2 border-foreground font-mono text-xs uppercase tracking-widest px-4 py-2 hover:bg-foreground/5 transition-colors disabled:opacity-40';

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<Tab>('articles');
  const [publisher, setPublisher] = useState<Publisher | null>(null);
  const [negotiations, setNegotiations] = useState<Negotiation[]>([]);
  const [accessLogs, setAccessLogs] = useState<AccessLog[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [articles, setArticles] = useState<Article[]>([]);
  const [articlesLoading, setArticlesLoading] = useState(true);

  // Agent creation
  const [agentCreating, setAgentCreating] = useState(false);
  const [agentCreateError, setAgentCreateError] = useState<string | null>(null);
  const [agentConnectionStatus, setAgentConnectionStatus] = useState<'connected' | 'local' | 'offline' | null>(null);
  const [agentServerRunning, setAgentServerRunning] = useState(false);
  const [openservConnected, setOpenservConnected] = useState(false);
  const [agentSetupGuide, setAgentSetupGuide] = useState<Record<string, string> | null>(null);

  // Settings form
  const [settingsGenerosity, setSettingsGenerosity] = useState(5);
  const [settingsMinPrice, setSettingsMinPrice] = useState(0.001);
  const [settingsRepThreshold, setSettingsRepThreshold] = useState(3.0);
  const [settingsFreeForHighRep, setSettingsFreeForHighRep] = useState(false);
  const [settingsAllowFreeByUseCase, setSettingsAllowFreeByUseCase] = useState(true);
  const [settingsFreeCaseKeywords, setSettingsFreeCaseKeywords] = useState(
    'research,education,nonprofit,open-source'
  );
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsSaved, setSettingsSaved] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);

  // Chat
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatSending, setChatSending] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Draft publish
  const [publishingDraftId, setPublishingDraftId] = useState<string | null>(null);

  useEffect(() => {
    authFetch('/api/dashboard')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.publisher) {
          const p: Publisher = data.publisher;
          setPublisher(p);
          setSettingsGenerosity(p.generosity);
          setSettingsMinPrice(p.minPrice);
          setSettingsRepThreshold(p.reputationThreshold);
          setSettingsFreeForHighRep(p.freeForHighReputation ?? false);
          setSettingsAllowFreeByUseCase(p.allowFreeByUseCase ?? true);
          setSettingsFreeCaseKeywords(
            p.freeCaseKeywords ?? 'research,education,nonprofit,open-source'
          );
        }
        if (data?.negotiations) setNegotiations(data.negotiations);
        if (data?.accessLogs) setAccessLogs(data.accessLogs);
        if (data?.stats) setStats(data.stats);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    // Fetch all articles including drafts for the publisher
    authFetch('/api/content/all')
      .then((r) => (r.ok ? r.json() : []))
      .then((data: Article[]) => {
        if (Array.isArray(data)) setArticles(data);
      })
      .catch(() => {})
      .finally(() => setArticlesLoading(false));
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  async function handleCreateAgent() {
    setAgentCreating(true);
    setAgentCreateError(null);
    try {
      const res = await authFetch('/api/publisher/agent/create', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        setAgentCreateError(data.error || 'Failed to create agent');
        return;
      }
      setPublisher((prev) =>
        prev ? { ...prev, agentCreated: true, openservAgentId: data.openservAgentId } : prev
      );
      setAgentConnectionStatus(data.connectionStatus ?? 'offline');
      setAgentServerRunning(data.agentServerRunning ?? false);
      setOpenservConnected(data.openservConnected ?? false);
      setAgentSetupGuide(data.setupGuide ?? null);
    } catch (e) {
      setAgentCreateError(e instanceof Error ? e.message : 'Request failed');
    } finally {
      setAgentCreating(false);
    }
  }

  async function checkAgentStatus() {
    try {
      const res = await fetch('/api/agent/status');
      if (res.ok) {
        const data = await res.json();
        setAgentServerRunning(data.agentRunning);
        setOpenservConnected(data.openservConnected);
        if (data.openservConnected) setAgentConnectionStatus('connected');
        else if (data.agentRunning) setAgentConnectionStatus('local');
        else setAgentConnectionStatus('offline');
      }
    } catch { /* ignore */ }
  }

  async function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault();
    setSettingsSaving(true);
    setSettingsSaved(false);
    setSettingsError(null);
    try {
      const res = await authFetch('/api/publisher/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          generosity: settingsGenerosity,
          minPrice: settingsMinPrice,
          reputationThreshold: settingsRepThreshold,
          freeForHighReputation: settingsFreeForHighRep,
          allowFreeByUseCase: settingsAllowFreeByUseCase,
          freeCaseKeywords: settingsFreeCaseKeywords,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSettingsError(data.error || 'Failed to save settings');
        return;
      }
      setPublisher((prev) => (prev ? { ...prev, ...data } : prev));
      setSettingsSaved(true);
      setTimeout(() => setSettingsSaved(false), 3000);
    } catch (e) {
      setSettingsError(e instanceof Error ? e.message : 'Request failed');
    } finally {
      setSettingsSaving(false);
    }
  }

  async function handlePublishDraft(articleId: string) {
    setPublishingDraftId(articleId);
    try {
      const res = await fetch('/api/content', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: articleId, isDraft: false }),
      });
      if (res.ok) {
        setArticles((prev) =>
          prev.map((a) => (a.id === articleId ? { ...a, isDraft: false } : a))
        );
      }
    } catch {
      // silent
    } finally {
      setPublishingDraftId(null);
    }
  }

  async function handleSendChat() {
    if (!chatInput.trim() || chatSending) return;
    const userMsg: ChatMessage = { role: 'user', content: chatInput.trim() };
    const newMessages = [...chatMessages, userMsg];
    setChatMessages(newMessages);
    setChatInput('');
    setChatSending(true);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages }),
      });
      const data = await res.json();
      if (data.reply) {
        setChatMessages((prev) => [...prev, { role: 'assistant', content: data.reply }]);
      }
    } catch {
      setChatMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Error: could not reach the assistant.' },
      ]);
    } finally {
      setChatSending(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground animate-pulse">
          Loading dashboard…
        </span>
      </div>
    );
  }

  const pub = publisher || {
    id: '',
    name: 'Demo Publisher',
    email: 'demo@contentagents.dev',
    walletAddress: '0x…',
    generosity: 5,
    minPrice: 0.001,
    reputationThreshold: 3,
    earnings: 0,
    articles: [],
    erc8004Id: null,
    agentCreated: false,
    openservAgentId: null,
    freeForHighReputation: false,
    allowFreeByUseCase: true,
    freeCaseKeywords: 'research,education,nonprofit,open-source',
  };

  const s = stats || {
    totalNegotiations: negotiations.length,
    acceptedDeals: 0,
    totalApiCalls: 0,
    totalEarnings: 0,
  };

  const publishedArticles = articles.filter((a) => !a.isDraft);
  const draftArticles = articles.filter((a) => a.isDraft);

  return (
    <div className="relative min-h-screen bg-background text-foreground">
      {/* Dot grid background */}
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          backgroundImage:
            'radial-gradient(circle, hsl(var(--foreground) / 0.08) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />

      <div className="relative z-10 flex min-h-screen flex-col">
        <Navbar />

        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-10 lg:px-6">
          {/* Header */}
          <div className="flex items-center justify-between gap-4 border-b-2 border-foreground/20 pb-6">
            <div className="flex flex-col gap-1">
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                // DASHBOARD
              </span>
              <h1 className="font-pixel text-2xl uppercase tracking-widest text-foreground md:text-3xl">
                DASHBOARD
              </h1>
            </div>
            <Link href="/publish">
              <motion.span
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex cursor-pointer items-center gap-2 bg-foreground px-4 py-2 font-mono text-xs uppercase tracking-widest text-background"
              >
                <Plus size={12} strokeWidth={2} />
                Publish
              </motion.span>
            </Link>
          </div>

          {/* Agent warning banner */}
          {!pub.agentCreated && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease }}
              className="mt-4 border-2 border-[#ea580c]/60 bg-[#ea580c]/10 p-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <span className="font-mono text-[10px] uppercase tracking-widest text-[#ea580c]">
                    Agent not active
                  </span>
                  <p className="mt-1 font-mono text-xs text-muted-foreground">
                    Create your OpenServ agent before publishing gated content.
                  </p>
                  {agentCreateError && (
                    <p className="mt-1 font-mono text-xs text-red-500">{agentCreateError}</p>
                  )}
                </div>
                <button onClick={handleCreateAgent} disabled={agentCreating} className={primaryBtn}>
                  {agentCreating ? 'Creating…' : 'Create agent'}
                </button>
              </div>
            </motion.div>
          )}

          {/* Tab bar */}
          <div className="mt-8 flex border-b-2 border-foreground/20">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex items-center gap-2 border-b-2 px-4 py-3 font-mono text-[11px] uppercase tracking-widest transition-colors ${
                  activeTab === id
                    ? 'border-[#ea580c] text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
                style={{ marginBottom: '-2px' }}
              >
                <Icon size={12} strokeWidth={1.5} />
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>

          {/* Tab content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25, ease }}
              className="mt-8"
            >
              {/* ── ARTICLES TAB ── */}
              {activeTab === 'articles' && (
                <div>
                  <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                    // Published Articles ({publishedArticles.length})
                  </span>
                  {articlesLoading ? (
                    <p className="mt-6 font-mono text-xs text-muted-foreground animate-pulse">
                      Loading…
                    </p>
                  ) : publishedArticles.length === 0 ? (
                    <div className="mt-8 border-2 border-dashed border-foreground/20 p-12 text-center">
                      <p className="font-mono text-xs text-muted-foreground">
                        No published articles yet.
                      </p>
                      <Link href="/publish" className="mt-4 inline-block">
                        <span className={`${primaryBtn} mt-4 inline-block`}>
                          Write your first article
                        </span>
                      </Link>
                    </div>
                  ) : (
                    <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {publishedArticles.map((article, i) => (
                        <motion.div
                          key={article.id}
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.05, duration: 0.3, ease }}
                          className="border-2 border-foreground bg-background/80 backdrop-blur-sm"
                        >
                          {/* Thumbnail */}
                          <div className="aspect-video w-full bg-foreground/5 overflow-hidden">
                            {article.thumbnail ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={article.thumbnail}
                                alt={article.title}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center">
                                <FileText
                                  size={32}
                                  strokeWidth={1}
                                  className="text-foreground/20"
                                />
                              </div>
                            )}
                          </div>

                          <div className="p-4">
                            <div className="flex items-start justify-between gap-2">
                              <h3 className="font-mono text-xs font-bold text-foreground line-clamp-2">
                                {article.title}
                              </h3>
                              {article.isFree ? (
                                <span className="shrink-0 border border-green-500/60 px-2 py-0.5 font-mono text-[10px] text-green-500">
                                  FREE
                                </span>
                              ) : (
                                <span className="shrink-0 border border-[#ea580c]/60 px-2 py-0.5 font-mono text-[10px] text-[#ea580c]">
                                  PAID
                                </span>
                              )}
                            </div>

                            <div className="mt-3 flex flex-wrap gap-2">
                              <span className="border border-foreground/20 px-2 py-0.5 font-mono text-[10px] uppercase text-muted-foreground">
                                {article.tier}
                              </span>
                              <span className="border border-foreground/20 px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
                                ${article.basePrice.toFixed(4)}
                              </span>
                              <span className="border border-foreground/20 px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
                                Q: {article.qualityScore.toFixed(1)}/10
                              </span>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── DRAFTS TAB ── */}
              {activeTab === 'drafts' && (
                <div>
                  <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                    // Drafts ({draftArticles.length})
                  </span>
                  {articlesLoading ? (
                    <p className="mt-6 font-mono text-xs text-muted-foreground animate-pulse">
                      Loading…
                    </p>
                  ) : draftArticles.length === 0 ? (
                    <div className="mt-8 border-2 border-dashed border-foreground/20 p-12 text-center">
                      <p className="font-mono text-xs text-muted-foreground">
                        No drafts. Start writing.
                      </p>
                      <Link href="/publish" className="mt-4 inline-block">
                        <span className={`${primaryBtn} mt-4 inline-block`}>
                          New draft → /publish
                        </span>
                      </Link>
                    </div>
                  ) : (
                    <div className="mt-6 flex flex-col gap-2">
                      {draftArticles.map((article, i) => (
                        <motion.div
                          key={article.id}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.04, duration: 0.25, ease }}
                          className="flex items-center justify-between gap-4 border-2 border-foreground/20 bg-background/80 p-4 backdrop-blur-sm"
                        >
                          <div className="flex min-w-0 flex-1 items-center gap-3">
                            <DraftingCompass
                              size={14}
                              strokeWidth={1.5}
                              className="shrink-0 text-muted-foreground"
                            />
                            <span className="truncate font-mono text-xs text-foreground">
                              {article.title || '(Untitled)'}
                            </span>
                          </div>
                          <div className="flex shrink-0 gap-2">
                            <Link href={`/publish?draft=${article.id}`}>
                              <span className={secondaryBtn}>Continue editing</span>
                            </Link>
                            <button
                              onClick={() => handlePublishDraft(article.id)}
                              disabled={publishingDraftId === article.id}
                              className={primaryBtn}
                            >
                              {publishingDraftId === article.id ? 'Publishing…' : 'Publish now'}
                            </button>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── INCOME TAB ── */}
              {activeTab === 'income' && (
                <div className="space-y-8">
                  <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                    // Income & Activity
                  </span>

                  {/* Stats row */}
                  <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {[
                      {
                        label: 'Total Earnings',
                        value: `$${s.totalEarnings.toFixed(4)}`,
                        accent: true,
                      },
                      {
                        label: 'Articles Published',
                        value: `${pub.articles?.length ?? 0}`,
                        accent: false,
                      },
                      {
                        label: 'Negotiations',
                        value: `${s.totalNegotiations}`,
                        accent: false,
                      },
                      {
                        label: 'Accepted Deals',
                        value: `${s.acceptedDeals}`,
                        accent: false,
                      },
                    ].map(({ label, value, accent }) => (
                      <div key={label} className="border-2 border-foreground/20 bg-background/80 p-5 backdrop-blur-sm">
                        <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                          {label}
                        </span>
                        <div
                          className="mt-2 font-pixel text-2xl"
                          style={{ color: accent ? '#ea580c' : 'hsl(var(--foreground))' }}
                        >
                          {value}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Access logs */}
                  <div>
                    <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                      // Access Logs
                    </span>
                    <div className="mt-3 overflow-x-auto border-2 border-foreground/20">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="border-b-2 border-foreground/20 bg-foreground/5">
                            {['Article', 'Consumer', 'Price Paid', 'Rounds', 'Tx', 'Time'].map(
                              (h) => (
                                <th
                                  key={h}
                                  className="px-4 py-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground"
                                >
                                  {h}
                                </th>
                              )
                            )}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-foreground/10">
                          {accessLogs.length === 0 ? (
                            <tr>
                              <td
                                colSpan={6}
                                className="px-4 py-8 text-center font-mono text-xs text-muted-foreground"
                              >
                                No paid accesses yet
                              </td>
                            </tr>
                          ) : (
                            accessLogs.map((log) => (
                              <tr key={log.id} className="hover:bg-foreground/5">
                                <td className="max-w-[160px] truncate px-4 py-3 font-mono text-xs">
                                  {log.article.title}
                                </td>
                                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                                  {log.consumerAgent.slice(0, 10)}…
                                </td>
                                <td className="px-4 py-3 font-mono text-xs" style={{ color: '#ea580c' }}>
                                  ${log.pricePaid.toFixed(4)}
                                </td>
                                <td className="px-4 py-3 font-mono text-xs">{log.negotiationRounds}</td>
                                <td className="px-4 py-3 font-mono text-xs">
                                  {log.txHash ? (
                                    <a
                                      href={`${EXPLORER}/tx/${log.txHash}`}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="flex items-center gap-1 text-muted-foreground hover:text-foreground"
                                    >
                                      {log.txHash.slice(0, 8)}…
                                      <ExternalLink size={10} />
                                    </a>
                                  ) : (
                                    '—'
                                  )}
                                </td>
                                <td className="px-4 py-3 font-mono text-[10px] text-muted-foreground">
                                  {new Date(log.createdAt).toLocaleTimeString()}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Negotiations */}
                  <div>
                    <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                      // Negotiations
                    </span>
                    <div className="mt-3 overflow-x-auto border-2 border-foreground/20">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="border-b-2 border-foreground/20 bg-foreground/5">
                            {['Consumer', 'Rounds', 'Initial', 'Final', 'Status'].map((h) => (
                              <th
                                key={h}
                                className="px-4 py-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground"
                              >
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-foreground/10">
                          {negotiations.length === 0 ? (
                            <tr>
                              <td
                                colSpan={5}
                                className="px-4 py-8 text-center font-mono text-xs text-muted-foreground"
                              >
                                No negotiations yet
                              </td>
                            </tr>
                          ) : (
                            negotiations.map((n) => {
                              const roundCount = Array.isArray(n.rounds) ? n.rounds.length : 0;
                              return (
                                <tr key={n.id} className="hover:bg-foreground/5">
                                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                                    {n.consumerAddress.slice(0, 10)}…
                                  </td>
                                  <td className="px-4 py-3 font-mono text-xs">{roundCount}</td>
                                  <td className="px-4 py-3 font-mono text-xs">
                                    ${n.initialPrice.toFixed(4)}
                                  </td>
                                  <td className="px-4 py-3 font-mono text-xs">
                                    {n.finalPrice != null ? (
                                      <span style={{ color: '#ea580c' }}>
                                        ${n.finalPrice.toFixed(4)}
                                      </span>
                                    ) : (
                                      '—'
                                    )}
                                  </td>
                                  <td className="px-4 py-3">
                                    <span
                                      className={`border px-2 py-0.5 font-mono text-[10px] uppercase ${
                                        n.status === 'accepted'
                                          ? 'border-green-500/60 text-green-500'
                                          : n.status === 'rejected'
                                          ? 'border-red-500/60 text-red-500'
                                          : 'border-foreground/30 text-muted-foreground'
                                      }`}
                                    >
                                      {n.status}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* ── SETTINGS TAB ── */}
              {activeTab === 'settings' && (
                <div className="space-y-8">
                  <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                    // Agent Settings
                  </span>

                  {/* Agent card */}
                  {!pub.agentCreated && (
                    <div className="mt-4 border-2 border-[#ea580c]/40 bg-[#ea580c]/5 p-6">
                      <span className="font-mono text-[10px] uppercase tracking-widest text-[#ea580c]">
                        OpenServ Agent — Not Activated
                      </span>
                      <p className="mt-2 font-mono text-xs text-muted-foreground">
                        Activate your publisher agent to negotiate content access with AI consumer agents on the ContentAgents platform.
                      </p>
                      {agentCreateError && (
                        <p className="mt-2 font-mono text-xs text-red-500">{agentCreateError}</p>
                      )}
                      <button
                        onClick={handleCreateAgent}
                        disabled={agentCreating}
                        className={`${primaryBtn} mt-4`}
                      >
                        {agentCreating ? 'Activating…' : 'Activate Publisher Agent'}
                      </button>
                    </div>
                  )}
                  {pub.agentCreated && (
                    <div className="mt-4 space-y-4">
                      {/* Status card */}
                      <div className={`border-2 p-4 ${
                        agentConnectionStatus === 'connected'
                          ? 'border-green-500/40 bg-green-500/5'
                          : agentConnectionStatus === 'local'
                          ? 'border-blue-500/40 bg-blue-500/5'
                          : 'border-yellow-500/40 bg-yellow-500/5'
                      }`}>
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className={`border px-2 py-0.5 font-mono text-[10px] ${
                              agentConnectionStatus === 'connected'
                                ? 'border-green-500/60 text-green-500'
                                : agentConnectionStatus === 'local'
                                ? 'border-blue-500/60 text-blue-500'
                                : 'border-yellow-500/60 text-yellow-500'
                            }`}>
                              {agentConnectionStatus === 'connected' ? '● OPENSERV CLOUD' : agentConnectionStatus === 'local' ? '● LOCAL' : '○ OFFLINE'}
                            </span>
                            <span className="font-mono text-xs text-muted-foreground">
                              Publisher Agent
                            </span>
                          </div>
                          <button onClick={checkAgentStatus} className={secondaryBtn + ' text-[10px] py-1 px-2'}>
                            Refresh
                          </button>
                        </div>
                        {pub.openservAgentId && (
                          <p className="mt-2 font-mono text-[10px] text-muted-foreground">
                            ID: {pub.openservAgentId}
                          </p>
                        )}
                        {agentConnectionStatus === 'local' && (
                          <p className="mt-2 font-mono text-[10px] text-muted-foreground">
                            Running locally on port 7378. Capabilities (negotiate, evaluate, reputation) all work.
                          </p>
                        )}
                        {agentConnectionStatus === 'offline' && (
                          <p className="mt-2 font-mono text-[10px] text-yellow-600">
                            Agent server not detected. Run: <code className="bg-foreground/10 px-1">npm run agent</code> in a separate terminal to start.
                          </p>
                        )}
                      </div>

                      {/* Setup guide for OpenServ cloud connection */}
                      {!openservConnected && (
                        <div className="border border-foreground/20 p-4">
                          <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                            // Connect to OpenServ Cloud (Optional)
                          </span>
                          <p className="mt-2 font-mono text-[10px] text-muted-foreground leading-relaxed">
                            To connect your agent to the OpenServ platform and be discoverable by other AI agents:
                          </p>
                          <ol className="mt-3 space-y-1.5">
                            {[
                              'Go to platform.openserv.ai → Developer → Add Agent',
                              'Name: "ContentAgents Publisher Agent"',
                              'Capabilities: "Negotiate content access prices, evaluate content quality, manage publisher earnings on ContentAgents platform"',
                              'Copy the generated agent API key',
                              'Update OPENSERV_API_KEY in .env.local with the agent API key',
                              'Run: npm run agent (separate terminal) — agent connects automatically',
                            ].map((step, i) => (
                              <li key={i} className="flex items-start gap-2 font-mono text-[10px] text-muted-foreground">
                                <span className="text-[#ea580c] shrink-0">{i + 1}.</span>
                                <span>{step}</span>
                              </li>
                            ))}
                          </ol>
                          <a
                            href="https://platform.openserv.ai"
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`${primaryBtn} mt-4 inline-flex items-center gap-2`}
                          >
                            <ExternalLink size={12} />
                            Open platform.openserv.ai
                          </a>
                        </div>
                      )}
                    </div>
                  )}

                  <form onSubmit={handleSaveSettings} className="space-y-6 border-2 border-foreground/20 bg-background/80 p-6 backdrop-blur-sm">
                    <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                      // Negotiation Personality
                    </span>

                    <div className="mt-4 grid gap-5 sm:grid-cols-3">
                      <div>
                        <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                          Generosity (1–10)
                        </label>
                        <p className="mb-2 font-mono text-[10px] text-muted-foreground/60">
                          How willing to discount
                        </p>
                        <input
                          type="number"
                          min={1}
                          max={10}
                          value={settingsGenerosity}
                          onChange={(e) => setSettingsGenerosity(Number(e.target.value))}
                          className={inputCls}
                        />
                      </div>
                      <div>
                        <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                          Min Price (USD)
                        </label>
                        <p className="mb-2 font-mono text-[10px] text-muted-foreground/60">
                          Floor price for any deal
                        </p>
                        <input
                          type="number"
                          min={0}
                          step={0.0001}
                          value={settingsMinPrice}
                          onChange={(e) => setSettingsMinPrice(Number(e.target.value))}
                          className={inputCls}
                        />
                      </div>
                      <div>
                        <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                          Rep Threshold
                        </label>
                        <p className="mb-2 font-mono text-[10px] text-muted-foreground/60">
                          Min ERC-8004 score for free
                        </p>
                        <input
                          type="number"
                          min={0}
                          step={0.1}
                          value={settingsRepThreshold}
                          onChange={(e) => setSettingsRepThreshold(Number(e.target.value))}
                          className={inputCls}
                        />
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="flex cursor-pointer items-start gap-3 border-2 border-foreground/10 p-4 hover:border-foreground/30">
                        <input
                          type="checkbox"
                          checked={settingsFreeForHighRep}
                          onChange={(e) => setSettingsFreeForHighRep(e.target.checked)}
                          className="mt-0.5 h-4 w-4 accent-[#ea580c]"
                        />
                        <div>
                          <span className="font-mono text-xs text-foreground">
                            Free for high reputation
                          </span>
                          <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                            Auto-grant free access to agents with score &gt; threshold
                          </p>
                        </div>
                      </label>

                      <label className="flex cursor-pointer items-start gap-3 border-2 border-foreground/10 p-4 hover:border-foreground/30">
                        <input
                          type="checkbox"
                          checked={settingsAllowFreeByUseCase}
                          onChange={(e) => setSettingsAllowFreeByUseCase(e.target.checked)}
                          className="mt-0.5 h-4 w-4 accent-[#ea580c]"
                        />
                        <div>
                          <span className="font-mono text-xs text-foreground">
                            Allow free by use case
                          </span>
                          <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                            Grant free access if stated use case matches keywords
                          </p>
                        </div>
                      </label>
                    </div>

                    <div>
                      <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                        Free-case keywords
                      </label>
                      <p className="mb-2 font-mono text-[10px] text-muted-foreground/60">
                        Comma-separated keywords that qualify for free access
                      </p>
                      <input
                        type="text"
                        value={settingsFreeCaseKeywords}
                        onChange={(e) => setSettingsFreeCaseKeywords(e.target.value)}
                        placeholder="research,education,nonprofit,open-source"
                        className={inputCls}
                      />
                    </div>

                    {settingsError && (
                      <div className="border border-red-500/40 bg-red-500/10 px-4 py-2 font-mono text-xs text-red-400">
                        {settingsError}
                      </div>
                    )}
                    {settingsSaved && (
                      <div className="border border-green-500/40 bg-green-500/10 px-4 py-2 font-mono text-xs text-green-400">
                        Settings saved.
                      </div>
                    )}

                    <div className="flex justify-end">
                      <button type="submit" disabled={settingsSaving} className={primaryBtn}>
                        {settingsSaving ? 'Saving…' : 'Save Settings'}
                      </button>
                    </div>
                  </form>

                  {/* ERC-8004 identity */}
                  <div className="border-2 border-foreground/20 bg-background/80 p-4 backdrop-blur-sm">
                    <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                      // ERC-8004 Identity
                    </span>
                    <div className="mt-3 flex items-center justify-between gap-4">
                      <span className="truncate font-mono text-xs text-foreground">
                        {pub.walletAddress}
                      </span>
                      <a
                        href={`${EXPLORER}/address/${pub.walletAddress}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex shrink-0 items-center gap-1 font-mono text-[10px] text-muted-foreground hover:text-foreground"
                      >
                        BaseScan
                        <ExternalLink size={10} />
                      </a>
                    </div>
                  </div>
                </div>
              )}

              {/* ── CHAT TAB ── */}
              {activeTab === 'chat' && (
                <div className="flex h-[600px] flex-col border-2 border-foreground/20 bg-background/80 backdrop-blur-sm">
                  {/* System message */}
                  <div className="border-b-2 border-foreground/20 px-4 py-3">
                    <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                      // Publisher Assistant
                    </span>
                    <p className="mt-1 font-mono text-[10px] text-muted-foreground">
                      Ask me anything about pricing, content strategy, or negotiation settings.
                    </p>
                  </div>

                  {/* Messages */}
                  <div className="flex-1 space-y-4 overflow-y-auto p-4">
                    {chatMessages.length === 0 && (
                      <div className="flex h-full items-center justify-center">
                        <span className="font-mono text-[10px] text-muted-foreground/40">
                          Start a conversation…
                        </span>
                      </div>
                    )}
                    {chatMessages.map((msg, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2, ease }}
                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[80%] border-2 px-4 py-3 font-mono text-xs ${
                            msg.role === 'user'
                              ? 'border-[#ea580c]/40 bg-[#ea580c]/10 text-foreground'
                              : 'border-foreground/20 bg-foreground/5 text-foreground'
                          }`}
                        >
                          <span className="mb-1 block text-[10px] uppercase tracking-widest text-muted-foreground">
                            {msg.role === 'user' ? 'You' : 'Assistant'}
                          </span>
                          <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                        </div>
                      </motion.div>
                    ))}
                    {chatSending && (
                      <div className="flex justify-start">
                        <div className="border-2 border-foreground/20 bg-foreground/5 px-4 py-3">
                          <span className="font-mono text-[10px] text-muted-foreground animate-pulse">
                            Thinking…
                          </span>
                        </div>
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>

                  {/* Input */}
                  <div className="border-t-2 border-foreground/20 p-4">
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleSendChat();
                      }}
                      className="flex gap-2"
                    >
                      <input
                        type="text"
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        placeholder="Ask about pricing, strategy, negotiations…"
                        className="flex-1 border-2 border-foreground bg-background px-3 py-2 font-mono text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-[#ea580c]/50"
                        disabled={chatSending}
                      />
                      <button
                        type="submit"
                        disabled={chatSending || !chatInput.trim()}
                        className={primaryBtn}
                      >
                        <Send size={12} strokeWidth={2} />
                      </button>
                    </form>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </main>

        <Footer />
      </div>
    </div>
  );
}
