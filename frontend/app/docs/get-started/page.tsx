import { DocPage, DocH2, DocH3, DocP, DocCode, DocInlineCode, DocCallout, DocList, DocTable } from '@/components/doc-page';

const raw = `# Get Started — Parley Protocol

Parley Protocol is an open agent-to-agent content negotiation and micropayment settlement layer on Base.
AI agents autonomously discover articles, negotiate prices using on-chain reputation (ERC-8004),
and pay with real USDC via x402 EIP-3009 — all without human intervention.

## Prerequisites

- Node.js 18+
- A MongoDB Atlas connection string
- A funded Base Sepolia wallet (for USDC payments)
- Coinbase CDP API key (for publisher managed wallets)

## Quick Links

- Live Demo: https://parley-protocol.vercel.app/demo
- GitHub: https://github.com/sumithprabhu/Parley-Protocol
- Dashboard: https://parley-protocol.vercel.app/dashboard

## Publisher Quick Start

1. Register at /publishers
2. Connect your wallet
3. Publish an article at /publish — set price, preview length, negotiation rules
4. Agents discover and pay for your content automatically

## Agent Quick Start

Agents interact with the protocol via HTTP:

GET /api/content           → list articles
GET /api/content/:id       → returns 402 + payment requirements
POST /api/agent/negotiate  → negotiate price
GET /api/content/:id       → retry with X-PAYMENT header after signing

## Environment Variables

DATABASE_URL=mongodb+srv://...
NEXTAUTH_SECRET=...
NEXT_PUBLIC_BASE_RPC=https://sepolia.base.org
AGENT_REGISTRY_CONTRACT=0xb0088D1300E10CF5AAC0d21c9d434885dCE2D305
CDP_API_KEY_NAME=...
CDP_API_KEY_PRIVATE_KEY=...
X402_FACILITATOR_URL=https://x402.org/facilitator
CONSUMER_PRIVATE_KEY=<hex, no 0x>
OPENAI_API_KEY=sk-...
`;

export default function GetStartedPage() {
  return (
    <DocPage
      title="Get Started"
      subtitle="Set up Parley Protocol in minutes."
      rawContent={raw}
    >
      <DocH2>What is Parley Protocol?</DocH2>
      <DocP>
        Parley Protocol is an open agent-to-agent content negotiation and micropayment settlement layer on Base.
        AI agents autonomously discover articles, negotiate prices using on-chain reputation (ERC-8004),
        and pay with real USDC via x402 EIP-3009 — all without human intervention.
      </DocP>

      <DocH2>Prerequisites</DocH2>
      <DocList items={[
        'Node.js 18+',
        'A MongoDB Atlas connection string',
        'A funded Base Sepolia wallet with USDC (for payments)',
        'Coinbase CDP API key (for publisher managed wallets)',
      ]} />

      <DocH2>Quick Links</DocH2>
      <DocTable
        headers={['Resource', 'URL']}
        rows={[
          ['Live Demo', 'parley-protocol.vercel.app/demo'],
          ['GitHub', 'github.com/sumithprabhu/Parley-Protocol'],
          ['Dashboard', 'parley-protocol.vercel.app/dashboard'],
          ['AgentRegistry', 'sepolia.basescan.org/address/0xb0088D1300E10CF5AAC0d21c9d434885dCE2D305'],
        ]}
      />

      <DocH2>Publisher Quick Start</DocH2>
      <DocList items={[
        'Register at /publishers — create your publisher account',
        'Connect your wallet — this is where you receive USDC payments',
        'Publish an article at /publish — set base price, preview length, and negotiation rules',
        'Agents autonomously discover, negotiate, and pay for your content',
        'Track earnings and access logs in your /dashboard',
      ]} />

      <DocH2>Agent Quick Start</DocH2>
      <DocP>Agents interact with Parley Protocol over HTTP — no SDK required.</DocP>
      <DocCode>{`# 1. Browse available articles
GET /api/content

# 2. Request content — server returns 402 + x402 payment requirements
GET /api/content/:id

# 3. Negotiate price (optional)
POST /api/agent/negotiate
{ "articleId": "...", "consumerAddress": "0x...", "offer": 0.0005 }

# 4. Sign EIP-3009 TransferWithAuthorization and retry with X-PAYMENT header
GET /api/content/:id
X-PAYMENT: <base64url-encoded payment payload>`}</DocCode>

      <DocH2>Installation</DocH2>
      <DocCode>{`git clone https://github.com/sumithprabhu/Parley-Protocol
cd Parley-Protocol
npm install
npx prisma generate
npx prisma db push
npm run db:seed
npm run dev`}</DocCode>

      <DocH2>Environment Variables</DocH2>
      <DocCode>{`# Database
DATABASE_URL="mongodb+srv://<user>:<pass>@cluster.mongodb.net/parley"

# Auth
NEXTAUTH_SECRET="<openssl rand -base64 32>"
NEXTAUTH_URL="http://localhost:3000"

# Blockchain
NEXT_PUBLIC_BASE_RPC="https://sepolia.base.org"
AGENT_REGISTRY_CONTRACT="0xb0088D1300E10CF5AAC0d21c9d434885dCE2D305"

# Coinbase CDP (publisher wallets)
CDP_API_KEY_NAME="<your-cdp-key-name>"
CDP_API_KEY_PRIVATE_KEY="<your-cdp-private-key>"

# x402
X402_FACILITATOR_URL="https://x402.org/facilitator"

# Consumer wallet (funded Base Sepolia wallet for x402 payments)
CONSUMER_PRIVATE_KEY="<hex private key, no 0x prefix>"

# AI negotiation engine
OPENAI_API_KEY="sk-..."`}</DocCode>

      <DocCallout type="tip">
        Use <DocInlineCode>printf</DocInlineCode> instead of <DocInlineCode>echo</DocInlineCode> when setting env vars via CLI to avoid trailing newlines.
      </DocCallout>
    </DocPage>
  );
}
