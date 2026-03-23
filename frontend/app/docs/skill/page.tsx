import { DocPage, DocH2, DocH3, DocP, DocCode, DocInlineCode, DocCallout, DocList, DocTable } from '@/components/doc-page';

const raw = `# skill.md — Parley Protocol Agent Skill

## Overview

Parley Protocol exposes an HTTP API that AI agents can use to browse, negotiate, and pay for content.
Load this skill to enable your agent to autonomously interact with the protocol.

## Base URL

https://parley-protocol.vercel.app

## Endpoints

### GET /api/content
List all published articles.

Response: Array of { id, title, summary, basePrice, publisher }

### GET /api/content/:id
Request article content. Returns HTTP 402 with x402 payment requirements if unpaid.

Headers (optional):
  x-agreed-price: <negotiated price in USDC>
  x-consumer-address: <your wallet address>
  X-PAYMENT: <base64url-encoded x402 payload>

### POST /api/agent/negotiate
Negotiate content access price.

Body: { articleId, consumerAddress, offer, sessionId? }
Response: { decision, price, counterOffer, reasoning, sessionId, agreed }

## x402 Payment Requirements

Network: base-sepolia
Asset: 0x036CbD53842c5426634e7929541eC2318f3dCF7e (USDC)
Scheme: exact
Extra: { name: "USDC", version: "2" }

## Negotiation Decisions

accept  → agreed, pay the returned price
counter → agent can submit new offer with returned sessionId
reject  → deal not possible

## ERC-8004 Registry

Contract: 0xb0088D1300E10CF5AAC0d21c9d434885dCE2D305 (Base Sepolia)
getReputation(address) returns (score, totalDeals, exists)

Score >= 80 → 20% discount
Score >= 60 → 10% discount
Score < 40  → 10% premium
`;

export default function SkillPage() {
  return (
    <DocPage
      title="skill.md"
      subtitle="Load this skill to enable your agent to interact with Parley Protocol."
      rawContent={raw}
    >
      <DocH2>Overview</DocH2>
      <DocP>
        Parley Protocol exposes a simple HTTP API. Load this skill to give your agent the ability to
        browse published articles, negotiate prices using on-chain reputation, and pay with real USDC via x402.
      </DocP>

      <DocCallout type="tip">
        Fetch this skill at runtime: <DocInlineCode>GET https://parley-protocol.vercel.app/api/skill</DocInlineCode>
      </DocCallout>

      <DocH2>Base URL</DocH2>
      <DocCode>{`https://parley-protocol.vercel.app`}</DocCode>

      <DocH2>Endpoints</DocH2>

      <DocH3>GET /api/content</DocH3>
      <DocP>List all published articles with pricing and publisher info.</DocP>
      <DocCode>{`GET /api/content

Response 200:
[
  {
    "id": "abc123",
    "title": "The Future of AI Micropayments",
    "summary": "How x402 enables autonomous agent economies.",
    "basePrice": 0.002,
    "tier": "standard",
    "publisher": {
      "walletAddress": "0x..."
    }
  }
]`}</DocCode>

      <DocH3>GET /api/content/:id</DocH3>
      <DocP>Request article content. Returns 402 with payment requirements when unpaid.</DocP>
      <DocCode>{`# Without payment
GET /api/content/abc123

HTTP 402 Payment Required
{
  "x402Version": 1,
  "accepts": [{
    "scheme": "exact",
    "network": "base-sepolia",
    "maxAmountRequired": "2000",
    "asset": "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
    "payTo": "0xPublisherWallet",
    "description": "Access: The Future of AI Micropayments",
    "maxTimeoutSeconds": 300,
    "extra": { "name": "USDC", "version": "2" }
  }]
}

# With x402 payment header
GET /api/content/abc123
X-PAYMENT: <base64url payload>
x-agreed-price: 0.0018
x-consumer-address: 0xYourWallet

HTTP 200
{
  "id": "abc123",
  "title": "The Future of AI Micropayments",
  "content": "<full article body>",
  "txHash": "0xde3dbeef..."
}`}</DocCode>

      <DocH3>POST /api/agent/negotiate</DocH3>
      <DocP>Negotiate access price. Supports multi-round negotiation via <DocInlineCode>sessionId</DocInlineCode>.</DocP>
      <DocCode>{`POST /api/agent/negotiate
Content-Type: application/json

{
  "articleId": "abc123",
  "consumerAddress": "0xYourAgentWallet",
  "offer": 0.001,
  "sessionId": null
}

Response:
{
  "decision": "counter",
  "price": 0.0018,
  "counterOffer": 0.0018,
  "reasoning": "Score 50/100, no discount. Counter at min price $0.0018.",
  "sessionId": "sess_xyz...",
  "rounds": [...],
  "agreed": false
}`}</DocCode>

      <DocTable
        headers={['Decision', 'Meaning', 'Agent Action']}
        rows={[
          ['accept', 'Price agreed', 'Pay the returned price via x402'],
          ['counter', 'Publisher wants more', 'Submit new offer with returned sessionId'],
          ['reject', 'No deal possible', 'Skip this article'],
        ]}
      />

      <DocH2>x402 Payment Flow</DocH2>
      <DocP>Use <DocInlineCode>ExactEvmSchemeV1</DocInlineCode> from <DocInlineCode>@x402/evm/v1</DocInlineCode>:</DocP>
      <DocCode>{`import { wrapFetchWithPaymentFromConfig } from '@x402/fetch';
import { ExactEvmSchemeV1 } from '@x402/evm/v1';
import { toClientEvmSigner } from '@x402/evm';

// Setup once
const signer = toClientEvmSigner(account, publicClient);
const x402Fetch = wrapFetchWithPaymentFromConfig(fetch, {
  schemes: [{ network: 'base-sepolia', client: new ExactEvmSchemeV1(signer), x402Version: 1 }],
});

// Auto-handles 402 → signs EIP-3009 → retries
const res = await x402Fetch('https://parley-protocol.vercel.app/api/content/abc123');`}</DocCode>

      <DocH2>ERC-8004 Reputation Registry</DocH2>
      <DocTable
        headers={['Field', 'Value']}
        rows={[
          ['Contract', '0xb0088D1300E10CF5AAC0d21c9d434885dCE2D305'],
          ['Network', 'Base Sepolia (chain ID 84532)'],
          ['Read function', 'getReputation(address) → (score, totalDeals, exists)'],
          ['Write function', 'updateReputation(address, dealSuccess)'],
        ]}
      />
      <DocTable
        headers={['Score Range', 'Price Effect']}
        rows={[
          ['≥ 80', '20% discount applied'],
          ['≥ 60', '10% discount applied'],
          ['40 – 59', 'No adjustment'],
          ['< 40', '10% premium applied'],
        ]}
      />
    </DocPage>
  );
}
