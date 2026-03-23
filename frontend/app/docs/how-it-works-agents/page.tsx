import { DocPage, DocH2, DocH3, DocP, DocCode, DocInlineCode, DocCallout, DocList, DocTable } from '@/components/doc-page';

const raw = `# How it Works for Agents — Parley Protocol

Parley Protocol exposes a simple HTTP API that any agent can call.
No SDK required. The flow is: browse → hit 402 → negotiate → pay → receive content.

## Step 1: Browse Articles

GET /api/content

Returns a list of published articles with title, summary, base price, publisher wallet.

## Step 2: Request Content — Hit the 402 Paywall

GET /api/content/:id

Returns HTTP 402 with x402 v1 payment requirements:
{
  "x402Version": 1,
  "accepts": [{
    "scheme": "exact",
    "network": "base-sepolia",
    "maxAmountRequired": "1000",
    "asset": "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
    "payTo": "0xPublisher...",
    "extra": { "name": "USDC", "version": "2" }
  }]
}

## Step 3: Negotiate Price (Optional)

POST /api/agent/negotiate
{ "articleId": "...", "consumerAddress": "0x...", "offer": 0.0005 }

The negotiation engine checks ERC-8004 reputation and applies:
- Score >= 80: 20% discount
- Score >= 60: 10% discount
- Score < 40: 10% premium

## Step 4: Pay via x402

Sign an EIP-3009 TransferWithAuthorization and retry:
GET /api/content/:id
X-PAYMENT: <base64url payload>

The facilitator at x402.org verifies and settles USDC on-chain.
You receive the full article content + on-chain tx hash.
`;

export default function HowItWorksAgentsPage() {
  return (
    <DocPage
      title="How it Works for Agents"
      subtitle="Integrate with Parley Protocol over plain HTTP — no SDK required."
      rawContent={raw}
    >
      <DocH2>Overview</DocH2>
      <DocP>
        Any AI agent can interact with Parley Protocol over HTTP. The flow is linear:
        browse articles → hit the 402 paywall → optionally negotiate → pay via x402 → receive full content.
      </DocP>

      <DocCode>{`Consumer Agent
     │
     ├─ 1. GET /api/content              → article list
     │
     ├─ 2. GET /api/content/:id          → HTTP 402 + payment requirements
     │
     ├─ 3. POST /api/agent/negotiate     → negotiate price (optional)
     │        └─ checks ERC-8004 reputation on Base Sepolia
     │        └─ Claude AI returns: accept / counter / reject
     │
     ├─ 4. Sign EIP-3009 authorization
     │        └─ ExactEvmSchemeV1 (EIP-712 typed data)
     │
     └─ 5. GET /api/content/:id          → HTTP 200 + full content + txHash
              X-PAYMENT: <base64url>`}</DocCode>

      <DocH2>Step 1 — Browse Articles</DocH2>
      <DocCode>{`GET /api/content

Response:
[
  {
    "id": "abc123",
    "title": "The Future of AI Micropayments",
    "summary": "...",
    "basePrice": 0.002,
    "publisher": { "walletAddress": "0x..." }
  }
]`}</DocCode>

      <DocH2>Step 2 — Hit the x402 Paywall</DocH2>
      <DocCode>{`GET /api/content/:id

HTTP 402 Payment Required
{
  "x402Version": 1,
  "accepts": [{
    "scheme": "exact",
    "network": "base-sepolia",
    "maxAmountRequired": "2000",   // micro-USDC (2000 = $0.002)
    "asset": "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
    "payTo": "0xPublisherWallet...",
    "description": "Access: The Future of AI Micropayments",
    "maxTimeoutSeconds": 300,
    "extra": { "name": "USDC", "version": "2" }
  }]
}`}</DocCode>

      <DocCallout type="info">
        The <DocInlineCode>extra.name</DocInlineCode> and <DocInlineCode>extra.version</DocInlineCode> are the EIP-712 domain parameters required by <DocInlineCode>ExactEvmSchemeV1</DocInlineCode> to produce a valid <DocInlineCode>TransferWithAuthorization</DocInlineCode> signature.
      </DocCallout>

      <DocH2>Step 3 — Negotiate Price</DocH2>
      <DocP>Negotiation is optional but allows agents to get discounts based on on-chain reputation.</DocP>
      <DocCode>{`POST /api/agent/negotiate
Content-Type: application/json

{
  "articleId": "abc123",
  "consumerAddress": "0xYourAgentWallet",
  "offer": 0.001,
  "sessionId": null   // null for first round, use returned sessionId for follow-ups
}

Response:
{
  "decision": "counter",       // "accept" | "counter" | "reject"
  "price": 0.0018,
  "counterOffer": 0.0018,
  "reasoning": "Reputation score 50/100, no discount applied. Counter at $0.0018.",
  "sessionId": "sess_abc...",
  "agreed": false
}`}</DocCode>

      <DocH3>Reputation-based Pricing</DocH3>
      <DocTable
        headers={['ERC-8004 Score', 'Effect']}
        rows={[
          ['≥ 80', '20% discount applied'],
          ['≥ 60', '10% discount applied'],
          ['40 – 59', 'No adjustment'],
          ['< 40', '10% premium applied'],
        ]}
      />

      <DocH2>Step 4 — Pay via x402</DocH2>
      <DocP>Use <DocInlineCode>@x402/fetch</DocInlineCode> with <DocInlineCode>ExactEvmSchemeV1</DocInlineCode> to auto-handle payment:</DocP>
      <DocCode>{`import { wrapFetchWithPaymentFromConfig } from '@x402/fetch';
import { ExactEvmSchemeV1 } from '@x402/evm/v1';
import { toClientEvmSigner } from '@x402/evm';
import { privateKeyToAccount } from 'viem/accounts';
import { createPublicClient, http } from 'viem';
import { baseSepolia } from 'viem/chains';

const account = privateKeyToAccount('0xYOUR_PRIVATE_KEY');
const publicClient = createPublicClient({ chain: baseSepolia, transport: http() });
const signer = toClientEvmSigner(account, publicClient);
const schemeV1 = new ExactEvmSchemeV1(signer);

const x402Fetch = wrapFetchWithPaymentFromConfig(fetch, {
  schemes: [{ network: 'base-sepolia', client: schemeV1, x402Version: 1 }],
});

// This automatically handles the 402, signs, and retries
const res = await x402Fetch('https://parley-protocol.vercel.app/api/content/abc123', {
  headers: { 'x-agreed-price': '0.0018' },  // pass negotiated price
});
const { content, title, txHash } = await res.json();`}</DocCode>

      <DocCallout type="tip">
        Pass <DocInlineCode>x-agreed-price</DocInlineCode> header with the negotiated price so the 402 paywall uses the agreed amount rather than base price.
      </DocCallout>

      <DocH2>Running the Consumer Agent</DocH2>
      <DocCode>{`# Connect to OpenServ cloud
npm run agent:consumer

# Local only (port 7379)
npm run agent:consumer:local`}</DocCode>

      <DocList items={[
        'The agent runs as an HTTP server and exposes capabilities via OpenServ SDK',
        'autonomous_content_purchase runs the full browse → negotiate → pay → read loop',
        'All transactions are logged to agent_log.json with decision reasoning',
      ]} />
    </DocPage>
  );
}
