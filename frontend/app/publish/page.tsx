'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function PublishPage() {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tier, setTier] = useState<'free' | 'standard' | 'premium'>('standard');
  const [isFree, setIsFree] = useState(false);
  const [previewLength, setPreviewLength] = useState(300);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ id: string; qualityScore?: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Agent guard
  const [agentCreated, setAgentCreated] = useState<boolean | null>(null);
  const [agentChecking, setAgentChecking] = useState(true);
  const [agentCreating, setAgentCreating] = useState(false);
  const [agentCreateError, setAgentCreateError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/dashboard')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        const created = data?.publisher?.agentCreated ?? false;
        setAgentCreated(created);
      })
      .catch(() => setAgentCreated(false))
      .finally(() => setAgentChecking(false));
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
      setAgentCreated(true);
    } catch (e) {
      setAgentCreateError(e instanceof Error ? e.message : 'Request failed');
    } finally {
      setAgentCreating(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);
    setSubmitting(true);
    try {
      const pubRes = await fetch('/api/dashboard');
      const dash = await pubRes.json();
      const publisherId = dash.publisher?.id;
      if (!publisherId) {
        setError('No publisher found. Create a publisher first (e.g. via seed).');
        return;
      }
      const res = await fetch('/api/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          content,
          tier,
          publisherId,
          isFree,
          previewLength: isFree ? content.length : previewLength,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setError(err.error?.message || res.statusText || 'Failed to create');
        return;
      }
      const article = await res.json();
      setResult({ id: article.id, qualityScore: article.qualityScore });
      setTitle('');
      setContent('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Request failed');
    } finally {
      setSubmitting(false);
    }
  }

  // Live preview
  const previewText = isFree
    ? content
    : content.slice(0, previewLength) + (content.length > previewLength ? '…' : '');

  if (agentChecking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <span className="text-slate-400">Checking agent status…</span>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900/50">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-xl font-semibold text-emerald-400">
            ContentAgents
          </Link>
          <Link
            href="/dashboard"
            className="rounded-lg px-4 py-2 text-slate-400 hover:text-white"
          >
            Dashboard
          </Link>
        </nav>
      </header>

      <div className="mx-auto max-w-2xl px-6 py-10">
        <h1 className="text-2xl font-bold text-white">Upload content</h1>
        <p className="mt-1 text-slate-400">
          Add an article. Quality score is computed and saved.
        </p>

        {/* Agent guard banner */}
        {agentCreated === false && (
          <div className="mt-6 rounded-xl border border-amber-700 bg-amber-900/20 p-5">
            <h2 className="text-base font-semibold text-amber-300">Agent not created yet</h2>
            <p className="mt-1 text-sm text-amber-200">
              You must create your OpenServ agent before publishing content. This only takes a second.
            </p>
            {agentCreateError && (
              <p className="mt-2 text-sm text-red-400">{agentCreateError}</p>
            )}
            <button
              onClick={handleCreateAgent}
              disabled={agentCreating}
              className="mt-4 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
            >
              {agentCreating ? 'Creating agent…' : 'Create your agent'}
            </button>
          </div>
        )}

        {/* Publish form — shown only if agent exists */}
        {agentCreated && (
          <form onSubmit={handleSubmit} className="mt-8 space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-300">Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                placeholder="Article title"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300">Content</label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                required
                rows={12}
                className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                placeholder="Full article text..."
              />
            </div>

            {/* Free / Gated toggle */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Access</label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsFree(true)}
                  className={`flex-1 rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                    isFree
                      ? 'border-emerald-500 bg-emerald-900/30 text-emerald-300'
                      : 'border-slate-600 bg-slate-800 text-slate-400 hover:border-slate-500 hover:text-white'
                  }`}
                >
                  Free content
                </button>
                <button
                  type="button"
                  onClick={() => setIsFree(false)}
                  className={`flex-1 rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                    !isFree
                      ? 'border-emerald-500 bg-emerald-900/30 text-emerald-300'
                      : 'border-slate-600 bg-slate-800 text-slate-400 hover:border-slate-500 hover:text-white'
                  }`}
                >
                  Gated (paid)
                </button>
              </div>
            </div>

            {/* Preview length — only for gated */}
            {!isFree && (
              <div>
                <label className="block text-sm font-medium text-slate-300">
                  Preview length (chars)
                </label>
                <p className="text-xs text-slate-500 mb-1">
                  How many characters to show for free in listings
                </p>
                <input
                  type="number"
                  min={0}
                  value={previewLength}
                  onChange={(e) => setPreviewLength(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 text-white focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            )}

            {/* Tier */}
            <div>
              <label className="block text-sm font-medium text-slate-300">Tier</label>
              <select
                value={tier}
                onChange={(e) => setTier(e.target.value as 'free' | 'standard' | 'premium')}
                className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 text-white focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="free">Free</option>
                <option value="standard">Standard</option>
                <option value="premium">Premium</option>
              </select>
            </div>

            {/* Live preview */}
            {content.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Preview{isFree ? ' (full — free content)' : ` (first ${previewLength} chars)`}
                </label>
                <div className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-300 whitespace-pre-wrap break-words min-h-[80px]">
                  {previewText || <span className="text-slate-600 italic">Nothing to preview yet</span>}
                </div>
              </div>
            )}

            {error && (
              <div className="rounded-lg bg-red-900/30 px-4 py-2 text-red-300">{error}</div>
            )}
            {result && (
              <div className="rounded-lg bg-emerald-900/30 px-4 py-2 text-emerald-300">
                Article created. ID: {result.id}
                {result.qualityScore != null && ` • Quality score: ${result.qualityScore}/10`}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-lg bg-emerald-600 px-4 py-3 font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
            >
              {submitting ? 'Publishing…' : 'Publish'}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
