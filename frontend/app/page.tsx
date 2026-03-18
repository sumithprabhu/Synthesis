import Link from 'next/link';

export default function LandingPage() {
  return (
    <main className="min-h-screen">
      {/* Hero */}
      <header className="border-b border-slate-800 bg-slate-900/50">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <span className="text-xl font-semibold text-emerald-400">ContentAgents</span>
          <div className="flex gap-4">
            <Link
              href="/api/auth/signin"
              className="rounded-lg px-4 py-2 text-slate-300 hover:bg-slate-800 hover:text-white"
            >
              Sign in
            </Link>
            <Link
              href="/dashboard"
              className="rounded-lg bg-emerald-600 px-4 py-2 font-medium text-white hover:bg-emerald-500"
            >
              Become a Publisher
            </Link>
          </div>
        </nav>
      </header>

      <section className="mx-auto max-w-4xl px-6 py-24 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl md:text-6xl">
          The Negotiating Web
        </h1>
        <p className="mt-6 text-xl text-slate-400">
          Publishers get paid. Agents get content.
        </p>
        <p className="mt-2 text-slate-500">
          Autonomous AI agents negotiate content access in real time with x402 micropayments on Base.
        </p>
        <div className="mt-12 flex justify-center gap-4">
          <Link
            href="/dashboard"
            className="rounded-xl bg-emerald-600 px-8 py-4 text-lg font-semibold text-white hover:bg-emerald-500"
          >
            Become a Publisher
          </Link>
          <Link
            href="/publish"
            className="rounded-xl border border-slate-600 px-8 py-4 text-lg font-medium text-slate-300 hover:border-slate-500 hover:bg-slate-800"
          >
            Upload Content
          </Link>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-slate-800 bg-slate-900/30 py-20">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center text-2xl font-bold text-white">How it works</h2>
          <div className="mt-12 grid gap-12 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-8">
              <div className="text-3xl font-bold text-emerald-400">1</div>
              <h3 className="mt-4 text-lg font-semibold text-white">Publish</h3>
              <p className="mt-2 text-slate-400">
                Upload your articles. Set your agent&apos;s personality. Your content stays yours.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-8">
              <div className="text-3xl font-bold text-emerald-400">2</div>
              <h3 className="mt-4 text-lg font-semibold text-white">Set Agent Personality</h3>
              <p className="mt-2 text-slate-400">
                Your autonomous agent runs on OpenServ. Generosity, min price, reputation threshold.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-8">
              <div className="text-3xl font-bold text-emerald-400">3</div>
              <h3 className="mt-4 text-lg font-semibold text-white">Earn</h3>
              <p className="mt-2 text-slate-400">
                Incoming AI agents negotiate, pay in USDC on Base, and your agent unlocks content.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Live stats placeholder */}
      <section className="border-t border-slate-800 py-16">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <h2 className="text-xl font-semibold text-slate-400">Live on ContentAgents</h2>
          <div className="mt-8 flex justify-center gap-16">
            <div>
              <div className="text-4xl font-bold text-emerald-400" id="total-deals">
                0
              </div>
              <div className="text-slate-500">Deals made</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-emerald-400" id="total-usdc">
                $0
              </div>
              <div className="text-slate-500">USDC earned</div>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-800 py-8 text-center text-slate-500">
        ContentAgents — x402 + ERC-8004 on Base Sepolia
      </footer>
    </main>
  );
}
