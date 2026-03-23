'use client';

import { DocPage, DocH2, DocP } from '@/components/doc-page';

const raw = `# Protocol Flows — Parley Protocol

Three flows power the protocol:
1. Full Architecture — on-chain, platform, and agent layers
2. x402 Payment Flow — how USDC moves from consumer to publisher
3. Negotiation Flow — how Claude AI broker settles on a price
`;

/* ── Shared diagram primitives ──────────────────────────────── */

function Box({
  label,
  sub,
  accent,
  className = '',
}: {
  label: string;
  sub?: string;
  accent?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center border px-3 py-2 text-center ${
        accent
          ? 'border-[#ea580c] bg-[#ea580c]/10'
          : 'border-foreground/30 bg-foreground/[0.03]'
      } ${className}`}
    >
      <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-foreground">
        {label}
      </span>
      {sub && (
        <span className="mt-0.5 font-mono text-[8px] uppercase tracking-widest text-muted-foreground">
          {sub}
        </span>
      )}
    </div>
  );
}

function Arrow({ label, dir = 'down' }: { label?: string; dir?: 'down' | 'right' }) {
  if (dir === 'right') {
    return (
      <div className="flex flex-col items-center justify-center px-1">
        {label && (
          <span className="mb-0.5 font-mono text-[8px] uppercase tracking-widest text-muted-foreground">
            {label}
          </span>
        )}
        <span className="font-mono text-[10px] text-muted-foreground">→</span>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center">
      {label && (
        <span className="font-mono text-[8px] uppercase tracking-widest text-muted-foreground">
          {label}
        </span>
      )}
      <span className="font-mono text-[10px] text-muted-foreground">↓</span>
    </div>
  );
}

function GroupBox({
  title,
  children,
  className = '',
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`border border-dashed border-foreground/20 p-3 ${className}`}>
      <p className="mb-2 font-mono text-[8px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
        {title}
      </p>
      {children}
    </div>
  );
}

function Step({
  n,
  actor,
  action,
  detail,
  highlight,
}: {
  n: number;
  actor: string;
  action: string;
  detail?: string;
  highlight?: boolean;
}) {
  return (
    <div className={`flex gap-3 border-l-2 py-2 pl-3 ${highlight ? 'border-[#ea580c]' : 'border-foreground/15'}`}>
      <span className="mt-0.5 font-mono text-[9px] font-bold text-muted-foreground">{n}.</span>
      <div>
        <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-foreground">
          {actor}
        </span>
        <span className="font-mono text-[10px] text-muted-foreground"> → {action}</span>
        {detail && (
          <p className="mt-0.5 font-mono text-[9px] text-muted-foreground/70">{detail}</p>
        )}
      </div>
    </div>
  );
}

/* ── Diagram 1: Architecture ────────────────────────────────── */
function ArchDiagram() {
  return (
    <div className="space-y-3">
      {/* On-chain layer */}
      <GroupBox title="Base Sepolia — On-Chain">
        <div className="flex flex-wrap gap-2">
          <Box label="ERC-8004 AgentRegistry" sub="0xb0088…D305" />
          <Box label="USDC" sub="0x036C…F7e" />
          <Box label="x402.org Facilitator" sub="verify + settle" accent />
        </div>
      </GroupBox>

      <Arrow label="verify + settle on-chain" />

      {/* Platform layer */}
      <GroupBox title="Parley Protocol Platform">
        <div className="flex flex-wrap gap-2">
          <Box label="/api/content/:id" sub="402 → verify → settle" accent />
          <Box label="/api/agent/negotiate" sub="Claude AI engine" />
          <Box label="/api/dashboard" sub="publisher stats" />
          <Box label="MongoDB Atlas" sub="via Prisma" />
        </div>
      </GroupBox>

      <div className="flex items-start justify-center gap-8">
        <Arrow label="capabilities" />
        <Arrow label="capabilities" />
      </div>

      {/* Agent layer */}
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

/* ── Diagram 2: x402 Payment Flow ───────────────────────────── */
function PaymentFlowDiagram() {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1">
        <Box label="Consumer Agent" accent />
        <Arrow dir="right" label="GET /api/content/:id" />
        <Box label="Platform API" />
      </div>

      <div className="ml-4 border-l border-foreground/10 pl-4 space-y-2">
        <Step n={1} actor="Consumer Agent" action="GET /api/content/:id (no payment)" />
        <Step n={2} actor="Platform API" action="HTTP 402 Payment Required" detail='{ x402Version:1, accepts:[{ network:"base-sepolia", asset:"0x036C…", maxAmountRequired:"1000", payTo:"0xPublisher…", extra:{name:"USDC",version:"2"} }] }' highlight />
        <Step n={3} actor="Consumer Agent" action="Sign EIP-3009 TransferWithAuthorization" detail="ExactEvmSchemeV1 creates EIP-712 typed data signature" highlight />
        <Step n={4} actor="Consumer Agent" action="GET /api/content/:id with X-PAYMENT header" />
        <Step n={5} actor="Platform API" action="verify(payload, requirements)" detail="Calls x402.org facilitator" />
        <Step n={6} actor="x402 Facilitator" action="transferWithAuthorization on-chain" detail="Executes USDC transfer on Base Sepolia" highlight />
        <Step n={7} actor="USDC Contract" action="Transfer confirmed — tx hash returned" />
        <Step n={8} actor="Platform API" action="AccessLog saved to MongoDB" />
        <Step n={9} actor="Consumer Agent" action="HTTP 200 — full content + txHash" highlight />
      </div>
    </div>
  );
}

/* ── Diagram 3: Negotiation Flow ────────────────────────────── */
function NegotiationFlowDiagram() {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1 mb-4">
        <Box label="Consumer Agent" accent />
        <Arrow dir="right" label="POST /api/agent/negotiate" />
        <Box label="Negotiation Engine" sub="Claude AI" />
        <Arrow dir="right" label="readContract" />
        <Box label="ERC-8004" sub="Base Sepolia" />
      </div>

      <div className="ml-4 border-l border-foreground/10 pl-4 space-y-2">
        <Step n={1} actor="Consumer Agent" action='POST { articleId, consumerAddress, offer: 0.0005, useCase: "research" }' />
        <Step n={2} actor="Platform API" action="find article + publisher settings in MongoDB" />
        <Step n={3} actor="Negotiation Engine" action="getReputation(consumerAddress) on ERC-8004" detail="Returns { score: 50, totalDeals: 0, exists: true }" />
        <Step n={4} actor="Negotiation Engine" action="Apply reputation multiplier" detail="score 50 → no adjustment. Check use-case keywords." highlight />
      </div>

      <div className="my-3 grid grid-cols-1 gap-2 md:grid-cols-3">
        <div className="border border-green-500/40 bg-green-500/5 p-3">
          <p className="font-mono text-[8px] font-bold uppercase tracking-widest text-green-600 mb-1">Use-case match</p>
          <p className="font-mono text-[9px] text-muted-foreground">keyword match → free or discount</p>
          <p className="font-mono text-[9px] font-bold text-green-600 mt-1">decision: accept, price: 0</p>
        </div>
        <div className="border border-[#ea580c]/40 bg-[#ea580c]/5 p-3">
          <p className="font-mono text-[8px] font-bold uppercase tracking-widest text-[#ea580c] mb-1">Offer ≥ minPrice</p>
          <p className="font-mono text-[9px] text-muted-foreground">offer meets floor with rep adjustment</p>
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
        <Step n={7} actor="Consumer Agent" action="If counter → submit new offer with sessionId" detail="Repeat up to max rounds (default 4)" />
      </div>
    </div>
  );
}

/* ── Page ───────────────────────────────────────────────────── */
export default function FlowsPage() {
  return (
    <DocPage title="Protocol Flows" subtitle="Visual diagrams of the three core protocol flows." rawContent={raw}>
      <DocH2>1 — Full Architecture</DocH2>
      <DocP>Three layers: on-chain Base Sepolia, the Parley Protocol platform API, and OpenServ SDK agents.</DocP>
      <div className="my-6 border border-foreground/10 p-4">
        <ArchDiagram />
      </div>

      <DocH2>2 — x402 Payment Flow</DocH2>
      <DocP>How real USDC moves from a consumer agent to a publisher wallet, settled on Base Sepolia.</DocP>
      <div className="my-6 border border-foreground/10 p-4">
        <PaymentFlowDiagram />
      </div>

      <DocH2>3 — Negotiation Flow</DocH2>
      <DocP>How the Claude AI negotiation engine reads on-chain reputation and settles on a price.</DocP>
      <div className="my-6 border border-foreground/10 p-4">
        <NegotiationFlowDiagram />
      </div>
    </DocPage>
  );
}
