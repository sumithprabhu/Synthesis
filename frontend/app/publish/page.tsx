'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function PublishPage() {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tier, setTier] = useState<'free' | 'standard' | 'premium'>('standard');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ id: string; qualityScore?: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

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
      </div>
    </main>
  );
}
