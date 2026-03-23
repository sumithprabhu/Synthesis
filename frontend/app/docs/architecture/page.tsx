'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { DocPage, DocH2, DocH3, DocP, DocCode, DocInlineCode, DocTable, DocCallout } from '@/components/doc-page';

const raw = `# Architecture — Parley Protocol

Three layers: Base Sepolia on-chain, Parley Protocol platform, OpenServ SDK agents.
Three flows: architecture overview, x402 payment, negotiation.
`;

/* ── Diagram primitives ─────────────────────────────────────── */
function Box({ label, sub, accent, className = '' }: { label: string; sub?: string; accent?: boolean; className?: string }) {
  return (
    <div className={`flex flex-col items-center justify-center border px-3 py-2 text-center ${accent ? 'border-[#ea580c] bg-[#ea580c]/10' : 'border-foreground/30 bg-foreground/[0.03]'} ${className}`}>
      <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-foreground">{label}</span>
      {sub && <span className="mt-0.5 font-mono text-[8px] uppercase tracking-widest text-muted-foreground">{sub}</span>}
    </div>
  );
}

function Arrow({ label, dir = 'down' }: { label?: string; dir?: 'down' | 'right' }) {
  return (
    <div className={`flex ${dir === 'right' ? 'flex-row items-center px-1' : 'flex-col items-center'}`}>
      {label && <span className="font-mono text-[8px] uppercase tracking-widest text-muted-foreground">{label}</span>}
      <span className="font-mono text-[10px] text-muted-foreground">{dir === 'right' ? '→' : '↓'}</span>
    </div>
  );
}

function GroupBox({ title, children, className = '' }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`border border-dashed border-foreground/20 p-3 ${className}`}>
      <p className="mb-2 font-mono text-[8px] font-bold uppercase tracking-[0.2em] text-muted-foreground">{title}</p>
      {children}
    </div>
  );
}

function Step({ n, actor, action, detail, highlight }: { n: number; actor: string; action: string; detail?: string; highlight?: boolean }) {
  return (
    <div className={`flex gap-3 border-l-2 py-2 pl-3 ${highlight ? 'border-[#ea580c]' : 'border-foreground/15'}`}>
      <span className="mt-0.5 font-mono text-[9px] font-bold text-muted-foreground">{n}.</span>
      <div>
        <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-foreground">{actor}</span>
        <span className="font-mono text-[10px] text-muted-foreground"> → {action}</span>
        {detail && <p className="mt-0.5 font-mono text-[9px] text-muted-foreground/70">{detail}</p>}
      </div>
    </div>
  );
}

/* ── High-level architecture toggle ────────────────────────── */
function HighLevelToggle() {
  const [open, setOpen] = useState(false);

  return (
    <div className="my-6 border border-foreground/20">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-foreground/5"
      >
        <div>
          <span className="font-mono text-[11px] font-bold uppercase tracking-widest text-foreground">
            High Level Architecture
          </span>
          <span className="ml-3 font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
            tech stack · project structure · api routes · capabilities
          </span>
        </div>
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown size={14} className="text-muted-foreground" />
        </motion.span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="border-t border-foreground/10 px-4 py-5 space-y-6">
              <div>
                <DocH3>Tech Stack</DocH3>
                <DocTable
                  headers={['Layer', 'Technology']}
                  rows={[
                    ['Frontend', 'Next.js 14 (App Router), TypeScript, Tailwind CSS'],
                    ['Database', 'MongoDB Atlas via Prisma'],
                    ['Agents', 'OpenServ SDK v2.4.1'],
                    ['Payments', 'x402 v1 — @x402/fetch, @x402/evm/v1, ExactEvmSchemeV1'],
                    ['Settlement', 'x402.org facilitator → EIP-3009 TransferWithAuthorization'],
                    ['USDC', '0x036CbD53842c5426634e7929541eC2318f3dCF7e (Base Sepolia)'],
                    ['Identity', 'ERC-8004 AgentRegistry 0xb0088...D305'],
                    ['Chain', 'Base Sepolia (chain ID 84532)'],
                    ['Hosting', 'Cloud (parley-protocol.vercel.app)'],
                  ]}
                />
              </div>

              <div>
                <DocH3>Project Structure</DocH3>
                <DocCode>{`app/
  api/
    content/[id]/       # x402 gated content
    agent/negotiate/    # Claude AI negotiation
    agent/status/       # Agent health
    publisher/          # Publisher registration
    auth/               # JWT login / logout
    dashboard/          # Publisher stats

agents/
  publisherAgent.ts     # 4 capabilities
  consumerAgent.ts      # 5 capabilities
  capabilities/         # Shared implementations

lib/
  x402/client.ts        # ExactEvmSchemeV1 consumer
  erc8004/registry.ts   # viem registry client
  negotiation/engine.ts # Claude AI engine
  cdp/                  # CDP wallet management
  prisma.ts             # Prisma singleton`}</DocCode>
              </div>

              <div>
                <DocH3>API Routes</DocH3>
                <DocTable
                  headers={['Route', 'Method', 'Description']}
                  rows={[
                    ['/api/content', 'GET', 'List all published articles'],
                    ['/api/content/:id', 'GET', '402 gate — preview + payment requirements'],
                    ['/api/agent/negotiate', 'POST', 'Price negotiation (Claude AI)'],
                    ['/api/agent/status', 'GET', 'Agent health + OpenServ connection'],
                    ['/api/publisher/register', 'POST', 'Register new publisher'],
                    ['/api/auth/login', 'POST', 'Publisher login → JWT'],
                    ['/api/dashboard', 'GET', 'Earnings, negotiations, access logs'],
                  ]}
                />
              </div>

              <div>
                <DocH3>Publisher Agent Capabilities</DocH3>
                <DocTable
                  headers={['Capability', 'Description']}
                  rows={[
                    ['negotiate_access', 'Multi-round price negotiation using Claude AI'],
                    ['check_reputation', 'Read ERC-8004 score for a wallet address'],
                    ['evaluate_content', 'Score article quality 1–10 using LLM'],
                    ['update_reputation', 'Write ERC-8004 score after a deal completes'],
                  ]}
                />
                <DocH3>Consumer Agent Capabilities</DocH3>
                <DocTable
                  headers={['Capability', 'Description']}
                  rows={[
                    ['browse_articles', 'List available articles with prices and previews'],
                    ['check_my_reputation', 'Read own ERC-8004 reputation score'],
                    ['negotiate_content_access', 'Negotiate price with publisher agent'],
                    ['purchase_content', 'Pay via x402 EIP-3009 — real USDC on-chain'],
                    ['autonomous_content_purchase', 'Full workflow: browse → negotiate → pay → read'],
                  ]}
                />
                <DocCallout type="info">
                  Run publisher agent: <DocInlineCode>npm run agent</DocInlineCode> · Consumer agent: <DocInlineCode>npm run agent:consumer</DocInlineCode>
                </DocCallout>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Flow Diagrams ──────────────────────────────────────────── */
function ArchDiagram() {
  return (
    <div className="space-y-3">
      <GroupBox title="Base Sepolia — On-Chain">
        <div className="flex flex-wrap gap-2">
          <Box label="ERC-8004 AgentRegistry" sub="0xb0088…D305" />
          <Box label="USDC" sub="0x036C…F7e" />
          <Box label="x402.org Facilitator" sub="verify + settle" accent />
        </div>
      </GroupBox>
      <Arrow label="verify + settle on-chain" />
      <GroupBox title="Parley Protocol Platform">
        <div className="flex flex-wrap gap-2">
          <Box label="/api/content/:id" sub="402 → verify → settle" accent />
          <Box label="/api/agent/negotiate" sub="Claude AI engine" />
          <Box label="/api/dashboard" sub="publisher stats" />
          <Box label="MongoDB Atlas" sub="via Prisma" />
        </div>
      </GroupBox>
      <div className="flex justify-center gap-16">
        <Arrow label="capabilities" />
        <Arrow label="capabilities" />
      </div>
      <div className="flex gap-4">
        <GroupBox title="Publisher Agent — OpenServ SDK" className="flex-1">
          <div className="space-y-1">
            {['negotiate_access', 'check_reputation', 'evaluate_content', 'update_reputation'].map((c) => (
              <div key={c} className="font-mono text-[9px] text-muted-foreground">· {c}</div>
            ))}
          </div>
        </GroupBox>
        <GroupBox title="Consumer Agent — OpenServ SDK" className="flex-1">
          <div className="space-y-1">
            {['browse_articles', 'negotiate_content_access', 'purchase_content (x402)', 'autonomous_content_purchase'].map((c) => (
              <div key={c} className="font-mono text-[9px] text-muted-foreground">· {c}</div>
            ))}
          </div>
        </GroupBox>
      </div>
    </div>
  );
}

function PaymentFlowDiagram() {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1 mb-4">
        <Box label="Consumer Agent" accent />
        <Arrow dir="right" label="GET /api/content/:id" />
        <Box label="Platform API" />
        <Arrow dir="right" label="verify + settle" />
        <Box label="x402 Facilitator" />
        <Arrow dir="right" label="transferWithAuth" />
        <Box label="USDC" sub="Base Sepolia" />
      </div>
      <div className="ml-4 border-l border-foreground/10 pl-4 space-y-2">
        <Step n={1} actor="Consumer Agent" action="GET /api/content/:id — no payment header" />
        <Step n={2} actor="Platform API" action="HTTP 402 Payment Required" detail='{ x402Version:1, network:"base-sepolia", asset:"0x036C…", maxAmountRequired:"1000", extra:{name:"USDC",version:"2"} }' highlight />
        <Step n={3} actor="Consumer Agent" action="Sign EIP-3009 TransferWithAuthorization" detail="ExactEvmSchemeV1 creates EIP-712 typed data signature" highlight />
        <Step n={4} actor="Consumer Agent" action="GET /api/content/:id with X-PAYMENT header" />
        <Step n={5} actor="x402 Facilitator" action="verify → transferWithAuthorization on-chain" detail="Executes USDC transfer on Base Sepolia" highlight />
        <Step n={6} actor="Platform API" action="AccessLog saved to MongoDB — tx hash recorded" />
        <Step n={7} actor="Consumer Agent" action="HTTP 200 — full content + txHash" highlight />
      </div>
    </div>
  );
}

function NegotiationFlowDiagram() {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1 mb-4">
        <Box label="Consumer Agent" accent />
        <Arrow dir="right" label="POST /api/agent/negotiate" />
        <Box label="Claude AI Engine" />
        <Arrow dir="right" label="readContract" />
        <Box label="ERC-8004" sub="Base Sepolia" />
      </div>
      <div className="ml-4 border-l border-foreground/10 pl-4 space-y-2">
        <Step n={1} actor="Consumer Agent" action='POST { articleId, consumerAddress, offer: 0.0005 }' />
        <Step n={2} actor="Platform API" action="find article + publisher settings in MongoDB" />
        <Step n={3} actor="Claude AI Engine" action="getReputation(consumerAddress) on ERC-8004" detail="Returns { score: 50, totalDeals: 0, exists: true }" />
        <Step n={4} actor="Claude AI Engine" action="Apply reputation multiplier + check use-case keywords" highlight />
      </div>
      <div className="my-3 grid grid-cols-1 gap-2 md:grid-cols-3">
        <div className="border border-green-500/40 bg-green-500/5 p-3">
          <p className="font-mono text-[8px] font-bold uppercase tracking-widest text-green-600 mb-1">Use-case match</p>
          <p className="font-mono text-[9px] text-muted-foreground">keyword match → free or discount</p>
          <p className="font-mono text-[9px] font-bold text-green-600 mt-1">decision: accept, price: 0</p>
        </div>
        <div className="border border-[#ea580c]/40 bg-[#ea580c]/5 p-3">
          <p className="font-mono text-[8px] font-bold uppercase tracking-widest text-[#ea580c] mb-1">Offer ≥ minPrice</p>
          <p className="font-mono text-[9px] text-muted-foreground">meets floor with rep adjustment</p>
          <p className="font-mono text-[9px] font-bold text-[#ea580c] mt-1">decision: accept, price: offer</p>
        </div>
        <div className="border border-blue-500/40 bg-blue-500/5 p-3">
          <p className="font-mono text-[8px] font-bold uppercase tracking-widest text-blue-500 mb-1">Offer &lt; minPrice</p>
          <p className="font-mono text-[9px] text-muted-foreground">too low — publisher counters</p>
          <p className="font-mono text-[9px] font-bold text-blue-500 mt-1">decision: counter, price: minPrice</p>
        </div>
      </div>
      <div className="ml-4 border-l border-foreground/10 pl-4 space-y-2">
        <Step n={5} actor="Platform API" action="NegotiationSession.create/update in MongoDB" />
        <Step n={6} actor="Consumer Agent" action="Receives { decision, price, reasoning, sessionId }" highlight />
        <Step n={7} actor="Consumer Agent" action="If counter → submit new offer with sessionId (up to 4 rounds)" />
      </div>
    </div>
  );
}

export default function ArchitecturePage() {
  return (
    <DocPage title="Architecture" subtitle="How the protocol layers fit together." rawContent={raw}>

      <HighLevelToggle />

      <DocH2>1 — System Overview</DocH2>
      <DocP>Three layers: on-chain Base Sepolia, the Parley Protocol platform API, and OpenServ SDK agents.</DocP>
      <div className="my-4 border border-foreground/10 p-4">
        <ArchDiagram />
      </div>

      <DocH2>2 — x402 Payment Flow</DocH2>
      <DocP>How real USDC moves from a consumer agent to a publisher wallet, settled on Base Sepolia.</DocP>
      <div className="my-4 border border-foreground/10 p-4">
        <PaymentFlowDiagram />
      </div>

      <DocH2>3 — Negotiation Flow</DocH2>
      <DocP>How the Claude AI engine reads on-chain reputation and settles on a price.</DocP>
      <div className="my-4 border border-foreground/10 p-4">
        <NegotiationFlowDiagram />
      </div>

    </DocPage>
  );
}
