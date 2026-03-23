import { DocPage, DocH2, DocH3, DocP, DocCode, DocInlineCode, DocCallout, DocList, DocTable } from '@/components/doc-page';

const raw = `# How it Works for Humans (Publishers) — Parley Protocol

Publishers are humans (or organizations) who want to monetize content with AI agents.
Register once, publish articles, set prices — agents pay automatically.

## Step 1: Register as a Publisher

Go to /publishers and create your account.
A managed wallet is automatically created via Coinbase CDP.
This wallet receives all USDC payments.

## Step 2: Publish Content

Go to /publish and fill in:
- Title and article content
- Base price (in USDC, e.g. 0.002)
- Preview length (characters shown before paywall)
- Min acceptable price for negotiations
- Free article toggle

## Step 3: Agents Discover and Pay

Once published, agents can:
1. Discover your article via GET /api/content
2. Negotiate price via POST /api/agent/negotiate
3. Pay via x402 — real USDC lands in your wallet automatically

## Step 4: Track Earnings

Go to /dashboard to see:
- Total earnings (USDC)
- Access count
- Negotiation history
- On-chain transaction hashes
`;

export default function HowItWorksHumansPage() {
  return (
    <DocPage
      title="How it Works for Humans"
      subtitle="Monetize your content — agents discover, negotiate, and pay automatically."
      rawContent={raw}
    >
      <DocH2>Overview</DocH2>
      <DocP>
        Publishers are humans or organizations who want to earn USDC from AI agents consuming their content.
        Register once, publish articles with a price, and agents handle the rest — negotiation and payment happen
        fully autonomously.
      </DocP>

      <DocCode>{`Publisher
     │
     ├─ 1. Register at /publishers
     │        └─ CDP managed wallet auto-created (receives payments)
     │
     ├─ 2. Publish at /publish
     │        └─ Set title, content, price, preview length
     │
     ├─ 3. Agents discover your article
     │        └─ GET /api/content
     │
     ├─ 4. Agents negotiate
     │        └─ POST /api/agent/negotiate
     │        └─ Claude AI applies your min price rules
     │
     └─ 5. Agents pay — USDC lands in your wallet
              └─ Track at /dashboard`}</DocCode>

      <DocH2>Step 1 — Register</DocH2>
      <DocList items={[
        'Go to parley-protocol.vercel.app/publishers',
        'Enter your name, email, and password',
        'A Coinbase CDP managed wallet is automatically created — this is your payout wallet',
        'Save your credentials — you\'ll use them to log into /dashboard',
      ]} />

      <DocCallout type="info">
        You don't need to manage private keys. The CDP managed wallet is custodied by Coinbase and all USDC payments are deposited automatically.
      </DocCallout>

      <DocH2>Step 2 — Publish Content</DocH2>
      <DocP>Go to <DocInlineCode>/publish</DocInlineCode> after logging in.</DocP>

      <DocTable
        headers={['Field', 'Description']}
        rows={[
          ['Title', 'Article headline — visible to agents browsing'],
          ['Content', 'Full article body — only revealed after payment'],
          ['Summary', 'Short description shown in article listings'],
          ['Base Price', 'Starting price in USDC (e.g. 0.002 = $0.002)'],
          ['Preview Length', 'Characters of content shown before the paywall'],
          ['Min Price', 'Lowest price you\'ll accept in negotiation'],
          ['Free', 'Toggle to make the article free (no payment required)'],
        ]}
      />

      <DocH2>Step 3 — Agents Find and Pay for Your Content</DocH2>
      <DocP>Once published, your article is immediately discoverable. Agents:</DocP>
      <DocList items={[
        'Browse all articles via GET /api/content',
        'Request your article — receive a 402 with your wallet as payTo',
        'Optionally negotiate via the AI engine (respects your min price)',
        'Pay via x402 EIP-3009 — USDC transfers directly to your wallet on-chain',
        'Receive the full article content in response',
      ]} />

      <DocH2>Step 4 — Track Your Earnings</DocH2>
      <DocP>Your <DocInlineCode>/dashboard</DocInlineCode> shows real-time stats:</DocP>

      <DocTable
        headers={['Metric', 'Description']}
        rows={[
          ['Total Earnings', 'Cumulative USDC received across all articles'],
          ['Access Count', 'Total times agents have paid to read your content'],
          ['Negotiation History', 'All negotiation rounds — offer, counter, final price, reasoning'],
          ['Access Logs', 'Per-article log with tx hash, agent address, price paid'],
          ['Tx Hash', 'On-chain proof for every payment — viewable on Basescan'],
        ]}
      />

      <DocH2>Negotiation Rules</DocH2>
      <DocP>The Claude AI negotiation engine enforces your pricing rules automatically:</DocP>
      <DocCode>{`// Negotiation engine logic (lib/negotiation/engine.ts)

// Agent's ERC-8004 reputation score affects the price:
score >= 80  → 20% discount off base price
score >= 60  → 10% discount off base price
score < 40   → 10% premium added to base price

// Min price floor is always respected:
if (agreedPrice < minPrice) → counter at minPrice

// Use-case keywords can grant discounts:
"research", "education" → publisher can configure free access`}</DocCode>

      <DocCallout type="tip">
        Set a reasonable <DocInlineCode>minPrice</DocInlineCode> in your publish settings. The engine will never accept below this floor regardless of agent reputation.
      </DocCallout>

      <DocH2>Running the Publisher Agent</DocH2>
      <DocP>If you want to run an autonomous publisher agent (for advanced use):</DocP>
      <DocCode>{`# Connect to OpenServ cloud
npm run agent

# Local only (port 7378)
npm run agent:local`}</DocCode>

      <DocList items={[
        'negotiate_access — handles incoming negotiation requests autonomously',
        'check_reputation — reads ERC-8004 scores before accepting deals',
        'evaluate_content — scores article quality 1–10 using LLM',
        'update_reputation — writes updated ERC-8004 score after each deal',
      ]} />
    </DocPage>
  );
}
