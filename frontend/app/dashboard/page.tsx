'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

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

const EXPLORER = 'https://sepolia.basescan.org';

export default function DashboardPage() {
  const [publisher, setPublisher] = useState<Publisher | null>(null);
  const [negotiations, setNegotiations] = useState<Negotiation[]>([]);
  const [accessLogs, setAccessLogs] = useState<AccessLog[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [reputation, setReputation] = useState<{ score: number; totalDeals: number } | null>(null);

  // Agent creation state
  const [agentCreating, setAgentCreating] = useState(false);
  const [agentCreateError, setAgentCreateError] = useState<string | null>(null);

  // Settings form state
  const [settingsGenerosity, setSettingsGenerosity] = useState(5);
  const [settingsMinPrice, setSettingsMinPrice] = useState(0.001);
  const [settingsRepThreshold, setSettingsRepThreshold] = useState(3.0);
  const [settingsFreeForHighRep, setSettingsFreeForHighRep] = useState(false);
  const [settingsAllowFreeByUseCase, setSettingsAllowFreeByUseCase] = useState(true);
  const [settingsFreeCaseKeywords, setSettingsFreeCaseKeywords] = useState('research,education,nonprofit,open-source');
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsSaved, setSettingsSaved] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/dashboard')
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
          setSettingsFreeCaseKeywords(p.freeCaseKeywords ?? 'research,education,nonprofit,open-source');
        }
        if (data?.negotiations) setNegotiations(data.negotiations);
        if (data?.accessLogs) setAccessLogs(data.accessLogs);
        if (data?.reputation) setReputation(data.reputation);
        if (data?.stats) setStats(data.stats);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleCreateAgent() {
    setAgentCreating(true);
    setAgentCreateError(null);
    try {
      const res = await fetch('/api/publisher/agent/create', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        setAgentCreateError(data.error || 'Failed to create agent');
        return;
      }
      setPublisher((prev) =>
        prev ? { ...prev, agentCreated: true, openservAgentId: data.openservAgentId } : prev
      );
    } catch (e) {
      setAgentCreateError(e instanceof Error ? e.message : 'Request failed');
    } finally {
      setAgentCreating(false);
    }
  }

  async function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault();
    setSettingsSaving(true);
    setSettingsSaved(false);
    setSettingsError(null);
    try {
      const res = await fetch('/api/publisher/settings', {
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

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <span className="text-slate-400">Loading dashboard…</span>
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

  const rep = reputation || { score: 50, totalDeals: 0 };
  const s = stats || { totalNegotiations: negotiations.length, acceptedDeals: 0, totalApiCalls: 0, totalEarnings: 0 };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900/50">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-xl font-semibold text-emerald-400">
            ContentAgents
          </Link>
          <div className="flex gap-4">
            <Link href="/publish" className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500">
              Upload content
            </Link>
            <Link href="/" className="rounded-lg px-4 py-2 text-slate-400 hover:text-white">
              Home
            </Link>
          </div>
        </nav>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-10">
        <h1 className="text-2xl font-bold text-white">Publisher Dashboard</h1>

        {/* Agent Creation Card */}
        <section className="mt-8">
          <div className={`rounded-xl border p-6 ${pub.agentCreated ? 'border-emerald-700 bg-emerald-900/20' : 'border-amber-700 bg-amber-900/20'}`}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-white">
                  OpenServ Agent
                  {pub.agentCreated && (
                    <span className="ml-2 rounded-full bg-emerald-800 px-2 py-0.5 text-xs text-emerald-300">Active</span>
                  )}
                </h2>
                {pub.agentCreated ? (
                  <p className="mt-1 text-sm text-slate-400">
                    Agent registered.{' '}
                    <span className="font-mono text-emerald-400">{pub.openservAgentId}</span>
                  </p>
                ) : (
                  <p className="mt-1 text-sm text-amber-300">
                    You must create your OpenServ agent before you can publish content.
                  </p>
                )}
                {agentCreateError && (
                  <p className="mt-2 text-sm text-red-400">{agentCreateError}</p>
                )}
              </div>
              {!pub.agentCreated && (
                <button
                  onClick={handleCreateAgent}
                  disabled={agentCreating}
                  className="shrink-0 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
                >
                  {agentCreating ? 'Creating…' : 'Create your agent'}
                </button>
              )}
            </div>
          </div>
        </section>

        {/* Stats Grid */}
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
            <div className="text-slate-400 text-sm">Total earnings (USDC)</div>
            <div className="mt-1 text-2xl font-bold text-emerald-400">
              ${s.totalEarnings.toFixed(4)}
            </div>
          </div>
          <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
            <div className="text-slate-400 text-sm">Articles published</div>
            <div className="mt-1 text-2xl font-bold text-white">
              {pub.articles?.length ?? 0}
            </div>
          </div>
          <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
            <div className="text-slate-400 text-sm">Negotiations (accepted)</div>
            <div className="mt-1 text-2xl font-bold text-white">
              {s.totalNegotiations}
              <span className="ml-2 text-sm font-normal text-emerald-400">
                {s.acceptedDeals} deals
              </span>
            </div>
          </div>
          <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
            <div className="text-slate-400 text-sm">Content API calls</div>
            <div className="mt-1 text-2xl font-bold text-white">
              {s.totalApiCalls}
            </div>
          </div>
        </div>

        {/* Reputation + Personality */}
        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
            <div className="text-slate-400 text-sm mb-3">Agent reputation (ERC-8004)</div>
            <div className="flex items-center gap-4">
              <div className="text-3xl font-bold text-white">
                {rep.score}<span className="text-lg text-slate-400">/100</span>
              </div>
              <div className="flex-1 bg-slate-700 rounded-full h-2">
                <div className="bg-emerald-500 h-2 rounded-full" style={{ width: `${rep.score}%` }} />
              </div>
            </div>
            <div className="mt-2 text-sm text-slate-400">{rep.totalDeals} on-chain deals</div>
          </div>
          <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
            <div className="text-slate-400 text-sm mb-3">Agent personality</div>
            <div className="flex flex-wrap gap-4 text-sm">
              <div><span className="text-slate-400">Generosity: </span><span className="font-medium text-white">{pub.generosity}/10</span></div>
              <div><span className="text-slate-400">Min price: </span><span className="font-medium text-white">${pub.minPrice}</span></div>
              <div><span className="text-slate-400">Rep threshold: </span><span className="font-medium text-white">{pub.reputationThreshold}</span></div>
            </div>
          </div>
        </div>

        {/* Agent Settings Panel */}
        <section className="mt-8">
          <h2 className="text-lg font-semibold text-white mb-4">Agent Settings</h2>
          <form onSubmit={handleSaveSettings} className="rounded-xl border border-slate-700 bg-slate-800/50 p-6 space-y-5">
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {/* Generosity */}
              <div>
                <label className="block text-sm font-medium text-slate-300">
                  Generosity (1–10)
                </label>
                <p className="text-xs text-slate-500 mb-1">How willing to discount</p>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={settingsGenerosity}
                  onChange={(e) => setSettingsGenerosity(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-white focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              {/* Min price */}
              <div>
                <label className="block text-sm font-medium text-slate-300">
                  Min price (USD)
                </label>
                <p className="text-xs text-slate-500 mb-1">Floor price for any deal</p>
                <input
                  type="number"
                  min={0}
                  step={0.0001}
                  value={settingsMinPrice}
                  onChange={(e) => setSettingsMinPrice(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-white focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              {/* Reputation threshold */}
              <div>
                <label className="block text-sm font-medium text-slate-300">
                  Reputation threshold
                </label>
                <p className="text-xs text-slate-500 mb-1">Min ERC-8004 score to waive fees</p>
                <input
                  type="number"
                  min={0}
                  step={0.1}
                  value={settingsRepThreshold}
                  onChange={(e) => setSettingsRepThreshold(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-white focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* Toggles */}
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settingsFreeForHighRep}
                  onChange={(e) => setSettingsFreeForHighRep(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-slate-600 bg-slate-900 text-emerald-500 focus:ring-emerald-500"
                />
                <div>
                  <span className="text-sm font-medium text-slate-300">Free for high reputation</span>
                  <p className="text-xs text-slate-500">Auto-grant free access to agents with score &gt; 70</p>
                </div>
              </label>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settingsAllowFreeByUseCase}
                  onChange={(e) => setSettingsAllowFreeByUseCase(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-slate-600 bg-slate-900 text-emerald-500 focus:ring-emerald-500"
                />
                <div>
                  <span className="text-sm font-medium text-slate-300">Allow free by use case</span>
                  <p className="text-xs text-slate-500">Grant free access if stated use case matches keywords</p>
                </div>
              </label>
            </div>

            {/* Free case keywords */}
            <div>
              <label className="block text-sm font-medium text-slate-300">
                Free-case keywords
              </label>
              <p className="text-xs text-slate-500 mb-1">Comma-separated keywords that qualify for free access</p>
              <input
                type="text"
                value={settingsFreeCaseKeywords}
                onChange={(e) => setSettingsFreeCaseKeywords(e.target.value)}
                placeholder="research,education,nonprofit,open-source"
                className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            {settingsError && (
              <div className="rounded-lg bg-red-900/30 px-4 py-2 text-sm text-red-300">{settingsError}</div>
            )}
            {settingsSaved && (
              <div className="rounded-lg bg-emerald-900/30 px-4 py-2 text-sm text-emerald-300">Settings saved.</div>
            )}

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={settingsSaving}
                className="rounded-lg bg-emerald-600 px-5 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
              >
                {settingsSaving ? 'Saving…' : 'Save settings'}
              </button>
            </div>
          </form>
        </section>

        {/* ERC-8004 Identity */}
        <section className="mt-8">
          <h2 className="text-lg font-semibold text-white mb-3">ERC-8004 Identity</h2>
          <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-4 flex items-center justify-between">
            <span className="font-mono text-sm text-slate-300">{pub.walletAddress}</span>
            <a
              href={`${EXPLORER}/address/${pub.walletAddress}`}
              target="_blank"
              rel="noreferrer"
              className="text-sm text-emerald-400 hover:underline ml-4 shrink-0"
            >
              View on BaseScan →
            </a>
          </div>
        </section>

        {/* Access Logs */}
        <section className="mt-10">
          <h2 className="text-lg font-semibold text-white">Content API calls (paid accesses)</h2>
          <div className="mt-4 overflow-hidden rounded-xl border border-slate-700">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-800/80 text-slate-400">
                <tr>
                  <th className="px-4 py-3">Article</th>
                  <th className="px-4 py-3">Consumer</th>
                  <th className="px-4 py-3">Price paid</th>
                  <th className="px-4 py-3">Rounds</th>
                  <th className="px-4 py-3">Tx</th>
                  <th className="px-4 py-3">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {accessLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                      No paid accesses yet — complete a negotiation and pay via x402 to see entries here
                    </td>
                  </tr>
                ) : (
                  accessLogs.map((log) => (
                    <tr key={log.id} className="text-slate-300">
                      <td className="px-4 py-3 text-xs max-w-[180px] truncate">{log.article.title}</td>
                      <td className="px-4 py-3 font-mono text-xs">{log.consumerAgent.slice(0, 10)}…</td>
                      <td className="px-4 py-3 text-emerald-400">${log.pricePaid.toFixed(4)}</td>
                      <td className="px-4 py-3">{log.negotiationRounds}</td>
                      <td className="px-4 py-3">
                        {log.txHash ? (
                          <a href={`${EXPLORER}/tx/${log.txHash}`} target="_blank" rel="noreferrer" className="text-emerald-400 hover:underline text-xs">
                            {log.txHash.slice(0, 10)}…
                          </a>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {new Date(log.createdAt).toLocaleTimeString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Recent Negotiations */}
        <section className="mt-10">
          <h2 className="text-lg font-semibold text-white">Recent negotiations</h2>
          <div className="mt-4 overflow-hidden rounded-xl border border-slate-700">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-800/80 text-slate-400">
                <tr>
                  <th className="px-4 py-3">Consumer</th>
                  <th className="px-4 py-3">Rounds</th>
                  <th className="px-4 py-3">Initial price</th>
                  <th className="px-4 py-3">Final price</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {negotiations.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                      No negotiations yet
                    </td>
                  </tr>
                ) : (
                  negotiations.map((n) => {
                    const roundCount = Array.isArray(n.rounds) ? n.rounds.length : 0;
                    return (
                      <tr key={n.id} className="text-slate-300">
                        <td className="px-4 py-3 font-mono text-xs">{n.consumerAddress.slice(0, 10)}…</td>
                        <td className="px-4 py-3">{roundCount}</td>
                        <td className="px-4 py-3">${n.initialPrice.toFixed(4)}</td>
                        <td className="px-4 py-3">
                          {n.finalPrice != null
                            ? <span className="text-emerald-400">${n.finalPrice.toFixed(4)}</span>
                            : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            n.status === 'accepted' ? 'bg-emerald-900/50 text-emerald-400' :
                            n.status === 'rejected' ? 'bg-red-900/50 text-red-400' :
                            'bg-slate-700 text-slate-400'
                          }`}>
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
        </section>
      </div>
    </main>
  );
}
