'use client';

import { useEffect, useState, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';
import { Upload, ChevronRight, ChevronLeft, Image as ImageIcon, CheckCircle } from 'lucide-react';

const ease = [0.22, 1, 0.36, 1] as const;

const inputCls =
  'w-full border-2 border-foreground bg-background px-3 py-2 font-mono text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-[#ea580c]/50';
const primaryBtn =
  'bg-foreground text-background font-mono text-xs uppercase tracking-widest px-4 py-2 hover:opacity-80 transition-opacity disabled:opacity-40';
const secondaryBtn =
  'border-2 border-foreground font-mono text-xs uppercase tracking-widest px-4 py-2 hover:bg-foreground/5 transition-colors disabled:opacity-40';

function PublishPageInner() {
  const searchParams = useSearchParams();
  const draftId = searchParams.get('draft');

  const [step, setStep] = useState<1 | 2>(1);

  // Content fields
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [thumbnail, setThumbnail] = useState<string | null>(null);
  const [imageUrlInput, setImageUrlInput] = useState('');

  // Settings fields
  const [isFree, setIsFree] = useState(false);
  const [tier, setTier] = useState<'free' | 'standard' | 'premium'>('standard');
  const [basePrice, setBasePrice] = useState(0.002);
  const [previewLength, setPreviewLength] = useState(300);
  const [qualityScore, setQualityScore] = useState(5);

  // UI state
  const [submitting, setSubmitting] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [result, setResult] = useState<{ id: string; qualityScore?: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [publisherId, setPublisherId] = useState<string | null>(null);
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(draftId);

  // Agent status
  const [agentCreated, setAgentCreated] = useState<boolean | null>(null);
  const [agentChecking, setAgentChecking] = useState(true);
  const [agentCreating, setAgentCreating] = useState(false);
  const [agentCreateError, setAgentCreateError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-compute quality score from content length
  useEffect(() => {
    const computed = Math.min(10, Math.round((content.length / 500) * 10) / 10);
    setQualityScore(computed > 0 ? computed : 1);
  }, [content]);

  // Load dashboard data (publisher + agent status)
  useEffect(() => {
    fetch('/api/dashboard')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        setAgentCreated(data?.publisher?.agentCreated ?? false);
        if (data?.publisher?.id) setPublisherId(data.publisher.id);
      })
      .catch(() => setAgentCreated(false))
      .finally(() => setAgentChecking(false));
  }, []);

  // Load draft if ?draft=ID
  useEffect(() => {
    if (!draftId) return;
    fetch(`/api/content/${draftId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) return;
        setTitle(data.title ?? '');
        setContent(data.content ?? '');
        setThumbnail(data.thumbnail ?? null);
        setIsFree(data.isFree ?? false);
        setTier(data.tier ?? 'standard');
        setBasePrice(data.basePrice ?? 0.002);
        setPreviewLength(data.previewLength ?? 300);
      })
      .catch(() => {});
  }, [draftId]);

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

  function handleThumbnailFile(file: File) {
    const reader = new FileReader();
    reader.onload = (e) => {
      setThumbnail(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  }

  function handleInsertImageUrl() {
    if (!imageUrlInput.trim()) return;
    setContent((prev) => prev + `\n![image](${imageUrlInput.trim()})\n`);
    setImageUrlInput('');
  }

  async function handleSaveDraft() {
    if (!title.trim() && !content.trim()) return;
    setSavingDraft(true);
    setError(null);
    try {
      if (currentDraftId) {
        // Update existing draft
        await fetch('/api/content', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: currentDraftId,
            title,
            content,
            tier,
            basePrice,
            isFree,
            previewLength,
            isDraft: true,
            thumbnail,
          }),
        });
      } else {
        // Create new draft
        const pid = publisherId;
        if (!pid) {
          setError('No publisher found. Please set up your account first.');
          return;
        }
        const res = await fetch('/api/content', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: title || 'Untitled Draft',
            content: content || ' ',
            tier,
            basePrice,
            publisherId: pid,
            isFree,
            previewLength,
            isDraft: true,
            thumbnail,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          setCurrentDraftId(data.id);
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save draft');
    } finally {
      setSavingDraft(false);
    }
  }

  async function handlePublish() {
    setError(null);
    setResult(null);
    setSubmitting(true);
    try {
      if (!publisherId) {
        setError('No publisher found. Create a publisher first.');
        return;
      }

      if (currentDraftId) {
        // Update existing draft → publish
        const res = await fetch('/api/content', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: currentDraftId,
            title,
            content,
            tier,
            basePrice,
            isFree,
            previewLength: isFree ? content.length : previewLength,
            isDraft: false,
            thumbnail,
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          setError(err.error || res.statusText || 'Failed to publish');
          return;
        }
        const article = await res.json();
        setResult({ id: article.id, qualityScore: article.qualityScore });
      } else {
        // Create new published article
        const res = await fetch('/api/content', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title,
            content,
            tier,
            basePrice,
            publisherId,
            isFree,
            previewLength: isFree ? content.length : previewLength,
            isDraft: false,
            thumbnail,
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          setError(err.error?.message || res.statusText || 'Failed to create');
          return;
        }
        const article = await res.json();
        setResult({ id: article.id, qualityScore: article.qualityScore });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Request failed');
    } finally {
      setSubmitting(false);
    }
  }

  const previewText = isFree
    ? content
    : content.slice(0, previewLength) + (content.length > previewLength ? '…' : '');

  if (agentChecking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground animate-pulse">
          Checking agent status…
        </span>
      </div>
    );
  }

  // Success state
  if (result) {
    return (
      <div className="relative min-h-screen bg-background text-foreground">
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
          <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center px-4 py-20 text-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, ease }}
              className="flex flex-col items-center gap-6"
            >
              <CheckCircle size={48} strokeWidth={1} className="text-green-500" />
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                // Published
              </span>
              <h2 className="font-pixel text-2xl uppercase tracking-widest text-foreground">
                Article Live
              </h2>
              <p className="font-mono text-xs text-muted-foreground">
                ID: {result.id}
                {result.qualityScore != null &&
                  ` · Quality score: ${result.qualityScore.toFixed(1)}/10`}
              </p>
              <div className="flex gap-3">
                <Link href="/articles">
                  <span className={primaryBtn}>View articles</span>
                </Link>
                <Link href="/publish">
                  <span className={secondaryBtn}>Publish another</span>
                </Link>
                <Link href="/dashboard">
                  <span className={secondaryBtn}>Dashboard</span>
                </Link>
              </div>
            </motion.div>
          </main>
          <Footer />
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-background text-foreground">
      {/* Dot grid */}
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

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 lg:px-6">
          {/* Header */}
          <div className="flex items-center justify-between border-b-2 border-foreground/20 pb-6">
            <div>
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                // PUBLISH
              </span>
              <h1 className="mt-1 font-pixel text-2xl uppercase tracking-widest text-foreground">
                {step === 1 ? 'Write' : 'Settings'}
              </h1>
            </div>
            {/* Step indicator */}
            <div className="flex items-center gap-2">
              {([1, 2] as const).map((s) => (
                <div
                  key={s}
                  className={`flex h-7 w-7 items-center justify-center border-2 font-mono text-xs ${
                    step === s
                      ? 'border-[#ea580c] bg-[#ea580c] text-white'
                      : step > s
                      ? 'border-foreground bg-foreground text-background'
                      : 'border-foreground/20 text-muted-foreground'
                  }`}
                >
                  {s}
                </div>
              ))}
            </div>
          </div>

          {/* Agent warning */}
          {agentCreated === false && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease }}
              className="mt-4 border-2 border-[#ea580c]/60 bg-[#ea580c]/10 p-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <span className="font-mono text-[10px] uppercase tracking-widest text-[#ea580c]">
                    Agent not created yet
                  </span>
                  <p className="mt-1 font-mono text-xs text-muted-foreground">
                    Create your OpenServ agent before publishing gated content.
                  </p>
                  {agentCreateError && (
                    <p className="mt-1 font-mono text-xs text-red-500">{agentCreateError}</p>
                  )}
                </div>
                <button
                  onClick={handleCreateAgent}
                  disabled={agentCreating}
                  className={primaryBtn}
                >
                  {agentCreating ? 'Creating…' : 'Create agent'}
                </button>
              </div>
            </motion.div>
          )}

          <AnimatePresence mode="wait">
            {/* ── STEP 1: WRITE ── */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3, ease }}
                className="mt-8 grid gap-6 lg:grid-cols-2"
              >
                {/* Left: Editor */}
                <div className="space-y-6">
                  <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                    // STEP 01: WRITE
                  </span>

                  {/* Thumbnail upload */}
                  <div>
                    <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                      Thumbnail
                    </label>
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="mt-2 flex cursor-pointer flex-col items-center justify-center border-2 border-dashed border-foreground/30 bg-background/50 hover:border-foreground/60 transition-colors"
                      style={{ minHeight: thumbnail ? 'auto' : '120px' }}
                    >
                      {thumbnail ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={thumbnail}
                          alt="Thumbnail preview"
                          className="max-h-48 w-full object-cover"
                        />
                      ) : (
                        <div className="flex flex-col items-center gap-2 p-6">
                          <Upload size={20} strokeWidth={1} className="text-muted-foreground" />
                          <span className="font-mono text-[10px] text-muted-foreground">
                            Click to upload thumbnail
                          </span>
                        </div>
                      )}
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleThumbnailFile(file);
                      }}
                    />
                    {thumbnail && (
                      <button
                        type="button"
                        onClick={() => setThumbnail(null)}
                        className="mt-1 font-mono text-[10px] text-muted-foreground hover:text-foreground"
                      >
                        Remove thumbnail
                      </button>
                    )}
                  </div>

                  {/* Title */}
                  <div>
                    <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                      Title
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Article title…"
                      className={`${inputCls} mt-2 text-sm`}
                    />
                  </div>

                  {/* Content */}
                  <div>
                    <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                      Content (Markdown supported)
                    </label>
                    <textarea
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      rows={16}
                      placeholder="Write your article content here…"
                      className={`${inputCls} mt-2 resize-y leading-relaxed`}
                    />
                  </div>

                  {/* Insert image URL */}
                  <div>
                    <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                      Insert Image URL
                    </label>
                    <div className="mt-2 flex gap-2">
                      <input
                        type="url"
                        value={imageUrlInput}
                        onChange={(e) => setImageUrlInput(e.target.value)}
                        placeholder="https://example.com/image.jpg"
                        className="flex-1 border-2 border-foreground bg-background px-3 py-2 font-mono text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-[#ea580c]/50"
                      />
                      <button
                        type="button"
                        onClick={handleInsertImageUrl}
                        className={secondaryBtn}
                      >
                        <ImageIcon size={12} strokeWidth={2} />
                      </button>
                    </div>
                  </div>

                  {/* Step 1 actions */}
                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={handleSaveDraft}
                      disabled={savingDraft || (!title.trim() && !content.trim())}
                      className={secondaryBtn}
                    >
                      {savingDraft ? 'Saving…' : currentDraftId ? 'Update draft' : 'Save as draft'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      disabled={!title.trim() || !content.trim()}
                      className={`${primaryBtn} flex items-center gap-2`}
                    >
                      Next: Settings
                      <ChevronRight size={12} strokeWidth={2} />
                    </button>
                  </div>

                  {error && (
                    <div className="border border-red-500/40 bg-red-500/10 px-4 py-2 font-mono text-xs text-red-400">
                      {error}
                    </div>
                  )}
                </div>

                {/* Right: Preview */}
                <div className="flex flex-col gap-4">
                  <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                    // FREE PREVIEW
                  </span>
                  <div className="border-2 border-foreground/20 bg-background/50 p-6 backdrop-blur-sm">
                    {thumbnail && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={thumbnail}
                        alt="preview"
                        className="mb-4 max-h-40 w-full object-cover"
                      />
                    )}
                    {title && (
                      <h2 className="mb-3 font-mono text-sm font-bold text-foreground">{title}</h2>
                    )}
                    <div className="min-h-[120px] font-mono text-xs leading-relaxed text-muted-foreground whitespace-pre-wrap break-words">
                      {previewText || (
                        <span className="text-muted-foreground/40">
                          Start writing to see your preview…
                        </span>
                      )}
                    </div>
                    {content.length > previewLength && !isFree && (
                      <div className="mt-4 border-t-2 border-foreground/10 pt-4">
                        <span className="border border-[#ea580c]/40 px-2 py-0.5 font-mono text-[10px] text-[#ea580c]">
                          GATED · {content.length - previewLength} chars behind paywall
                        </span>
                      </div>
                    )}
                    <div className="mt-3">
                      <span className="font-mono text-[10px] text-muted-foreground/40">
                        {content.length} chars · ~{Math.ceil(content.length / 5)} words
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ── STEP 2: SETTINGS ── */}
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3, ease }}
                className="mt-8 grid gap-6 lg:grid-cols-2"
              >
                {/* Left: Settings form */}
                <div className="space-y-6">
                  <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                    // STEP 02: SETTINGS
                  </span>

                  {/* Access toggle */}
                  <div>
                    <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                      Access
                    </label>
                    <div className="mt-2 flex gap-3">
                      <button
                        type="button"
                        onClick={() => setIsFree(true)}
                        className={`flex-1 border-2 px-4 py-3 font-mono text-xs uppercase tracking-widest transition-colors ${
                          isFree
                            ? 'border-[#ea580c] bg-[#ea580c]/10 text-foreground'
                            : 'border-foreground/20 text-muted-foreground hover:border-foreground/40'
                        }`}
                      >
                        Free
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsFree(false)}
                        className={`flex-1 border-2 px-4 py-3 font-mono text-xs uppercase tracking-widest transition-colors ${
                          !isFree
                            ? 'border-[#ea580c] bg-[#ea580c]/10 text-foreground'
                            : 'border-foreground/20 text-muted-foreground hover:border-foreground/40'
                        }`}
                      >
                        Gated (paid)
                      </button>
                    </div>
                  </div>

                  {/* Base price */}
                  {!isFree && (
                    <div>
                      <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                        Base Price (USDC)
                      </label>
                      <p className="mb-2 font-mono text-[10px] text-muted-foreground/60">
                        Starting price for this article
                      </p>
                      <input
                        type="number"
                        min={0}
                        step={0.0001}
                        value={basePrice}
                        onChange={(e) => setBasePrice(Number(e.target.value))}
                        className={inputCls}
                      />
                    </div>
                  )}

                  {/* Tier */}
                  <div>
                    <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                      Tier
                    </label>
                    <select
                      value={tier}
                      onChange={(e) => setTier(e.target.value as 'free' | 'standard' | 'premium')}
                      className={`${inputCls} mt-2`}
                    >
                      <option value="free">Free</option>
                      <option value="standard">Standard</option>
                      <option value="premium">Premium</option>
                    </select>
                  </div>

                  {/* Preview length */}
                  {!isFree && (
                    <div>
                      <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                        Preview Length (chars)
                      </label>
                      <p className="mb-2 font-mono text-[10px] text-muted-foreground/60">
                        How many characters shown for free in listings
                      </p>
                      <input
                        type="number"
                        min={0}
                        value={previewLength}
                        onChange={(e) => setPreviewLength(Number(e.target.value))}
                        className={inputCls}
                      />
                    </div>
                  )}

                  {/* Quality score */}
                  <div>
                    <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                      Quality Score (1–10)
                    </label>
                    <p className="mb-2 font-mono text-[10px] text-muted-foreground/60">
                      Auto-computed from content length. Override if needed.
                    </p>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      step={0.1}
                      value={qualityScore}
                      onChange={(e) => setQualityScore(Number(e.target.value))}
                      className={inputCls}
                    />
                  </div>

                  {error && (
                    <div className="border border-red-500/40 bg-red-500/10 px-4 py-2 font-mono text-xs text-red-400">
                      {error}
                    </div>
                  )}

                  {/* Step 2 actions */}
                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className={`${secondaryBtn} flex items-center gap-2`}
                    >
                      <ChevronLeft size={12} strokeWidth={2} />
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={handlePublish}
                      disabled={submitting}
                      className={`${primaryBtn} flex items-center gap-2`}
                    >
                      {submitting ? 'Publishing…' : 'Publish →'}
                    </button>
                  </div>
                </div>

                {/* Right: Summary card */}
                <div className="flex flex-col gap-4">
                  <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                    // Summary
                  </span>
                  <div className="border-2 border-foreground/20 bg-background/80 p-6 backdrop-blur-sm">
                    {thumbnail && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={thumbnail}
                        alt="thumbnail"
                        className="mb-4 max-h-36 w-full object-cover"
                      />
                    )}
                    <h3 className="font-mono text-sm font-bold text-foreground line-clamp-2">
                      {title}
                    </h3>
                    <p className="mt-2 font-mono text-xs text-muted-foreground line-clamp-3">
                      {content.slice(0, 150)}
                      {content.length > 150 ? '…' : ''}
                    </p>

                    <div className="mt-4 space-y-2 border-t-2 border-foreground/10 pt-4">
                      {[
                        { label: 'Access', value: isFree ? 'Free' : 'Gated (paid)' },
                        { label: 'Tier', value: tier.charAt(0).toUpperCase() + tier.slice(1) },
                        ...(!isFree
                          ? [
                              { label: 'Base price', value: `$${basePrice.toFixed(4)} USDC` },
                              { label: 'Preview', value: `${previewLength} chars` },
                            ]
                          : []),
                        { label: 'Quality score', value: `${qualityScore.toFixed(1)} / 10` },
                        { label: 'Content length', value: `${content.length} chars` },
                      ].map(({ label, value }) => (
                        <div key={label} className="flex items-center justify-between">
                          <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                            {label}
                          </span>
                          <span className="font-mono text-xs text-foreground">{value}</span>
                        </div>
                      ))}
                    </div>

                    <div className="mt-4">
                      {isFree ? (
                        <span className="border border-green-500/60 px-2 py-0.5 font-mono text-[10px] text-green-500">
                          FREE ACCESS
                        </span>
                      ) : (
                        <span className="border border-[#ea580c]/60 px-2 py-0.5 font-mono text-[10px] text-[#ea580c]">
                          GATED · x402
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        <Footer />
      </div>
    </div>
  );
}

export default function PublishPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background">
          <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground animate-pulse">
            Loading…
          </span>
        </div>
      }
    >
      <PublishPageInner />
    </Suspense>
  );
}
