/**
 * ContentAgents Consumer Agent — OpenServ SDK
 *
 * An autonomous AI consumer that:
 *  1. Discovers articles on ContentAgents
 *  2. Negotiates access prices with Publisher Agents
 *  3. Pays via real x402 (EIP-3009 + x402.org facilitator → USDC on Base Sepolia)
 *  4. Reads and processes content
 *  5. Updates ERC-8004 reputation after each deal
 */
import { Agent } from '@openserv-labs/sdk';
import { z } from 'zod';
import { createX402Fetch, negotiateAccess } from '@/lib/x402/client';
import { getReputation } from '@/lib/erc8004/registry';

const BASE_URL = process.env.NEXTJS_BASE_URL || 'http://localhost:3000';
const CONSUMER_PRIVATE_KEY = (process.env.CONSUMER_PRIVATE_KEY ||
  process.env.DEMO_PRIVATE_KEY ||
  '') as `0x${string}`;

const SYSTEM_PROMPT = `You are an autonomous Consumer Agent in the ContentAgents marketplace.
Your job is to find valuable articles, negotiate fair prices with Publisher Agents, and purchase access using x402 micropayments.
You operate on Base Sepolia using USDC. You always try to get the best deal while being honest about your use case.
Your ERC-8004 reputation score affects the prices you're offered — maintain a good reputation by completing deals.`;

export function createConsumerAgent(): Agent {
  const apiKey = process.env.OPENSERV_CONSUMER_API_KEY || process.env.OPENSERV_API_KEY || 'local-dev-placeholder';
  const agent = new Agent({ systemPrompt: SYSTEM_PROMPT, apiKey });

  /**
   * Browse available articles on ContentAgents.
   * Returns a list of articles with preview content and prices.
   */
  agent.addCapability({
    name: 'browse_articles',
    description: 'Browse available articles on ContentAgents marketplace. Returns list of articles with titles, prices, and preview content.',
    inputSchema: z.object({
      limit: z.number().optional().describe('Max number of articles to return (default 10)'),
      search: z.string().optional().describe('Search query to filter articles by title'),
    }),
    async run({ args }) {
      const params = new URLSearchParams();
      if (args.limit) params.set('limit', String(args.limit));
      const res = await fetch(`${BASE_URL}/api/content?${params}`);
      if (!res.ok) throw new Error(`Browse failed: ${res.status}`);
      const articles = await res.json();

      const filtered = args.search
        ? articles.filter((a: { title: string }) =>
            a.title.toLowerCase().includes(args.search!.toLowerCase())
          )
        : articles;

      return JSON.stringify(
        filtered.slice(0, args.limit ?? 10).map((a: {
          id: string; title: string; basePrice: number; tier: string; isFree: boolean; content: string; previewLength: number;
        }) => ({
          id: a.id,
          title: a.title,
          basePrice: a.basePrice,
          tier: a.tier,
          isFree: a.isFree,
          preview: a.content?.slice(0, a.previewLength ?? 100),
        }))
      );
    },
  });

  /**
   * Check this consumer's ERC-8004 reputation on Base Sepolia.
   */
  agent.addCapability({
    name: 'check_my_reputation',
    description: 'Check this consumer agent\'s ERC-8004 reputation score on Base Sepolia. Higher score = better prices.',
    inputSchema: z.object({}),
    async run() {
      if (!CONSUMER_PRIVATE_KEY) return JSON.stringify({ error: 'CONSUMER_PRIVATE_KEY not set' });
      const { privateKeyToAccount } = await import('viem/accounts');
      const account = privateKeyToAccount(CONSUMER_PRIVATE_KEY);
      const rep = await getReputation(account.address);
      return JSON.stringify({
        address: account.address,
        score: rep.score,
        totalDeals: rep.totalDeals,
        exists: rep.exists,
      });
    },
  });

  /**
   * Negotiate content access with a publisher's agent.
   * Returns the agreed price and session ID for payment.
   */
  agent.addCapability({
    name: 'negotiate_content_access',
    description: 'Negotiate access price for an article with the publisher\'s agent. Provide your use case to get better pricing.',
    inputSchema: z.object({
      articleId: z.string().describe('Article ID to negotiate access for'),
      offerUsd: z.number().describe('Your initial offer in USD (e.g. 0.0005)'),
      useCase: z.string().optional().describe('Your intended use case (research, education, commercial, etc.)'),
    }),
    async run({ args }) {
      if (!CONSUMER_PRIVATE_KEY) return JSON.stringify({ error: 'CONSUMER_PRIVATE_KEY not set' });
      const { privateKeyToAccount } = await import('viem/accounts');
      const account = privateKeyToAccount(CONSUMER_PRIVATE_KEY);

      const result = await negotiateAccess(
        BASE_URL,
        args.articleId,
        account.address,
        args.offerUsd,
        args.useCase,
      );
      return JSON.stringify(result);
    },
  });

  /**
   * Purchase article access using real x402 micropayment.
   * Signs an EIP-3009 TransferWithAuthorization — facilitator executes USDC transfer on-chain.
   */
  agent.addCapability({
    name: 'purchase_content',
    description: 'Purchase article access using x402 micropayment protocol. USDC is transferred on-chain via EIP-3009 authorization.',
    inputSchema: z.object({
      articleId: z.string().describe('Article ID to purchase'),
    }),
    async run({ args }) {
      if (!CONSUMER_PRIVATE_KEY) return JSON.stringify({ error: 'CONSUMER_PRIVATE_KEY not set' });

      const x402Fetch = createX402Fetch(CONSUMER_PRIVATE_KEY);
      const url = `${BASE_URL}/api/content/${args.articleId}`;

      const res = await x402Fetch(url);

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        return JSON.stringify({ success: false, error: `Payment failed: ${res.status}`, details: body });
      }

      const data = await res.json();
      return JSON.stringify({
        success: true,
        title: data.title,
        contentLength: data.content?.length,
        contentPreview: data.content?.slice(0, 200),
        txHash: data.txHash,
      });
    },
  });

  /**
   * Full autonomous workflow: discover → negotiate → purchase → read.
   */
  agent.addCapability({
    name: 'autonomous_content_purchase',
    description: 'Fully autonomous workflow: browse articles, pick one matching your criteria, negotiate price, and purchase via x402.',
    inputSchema: z.object({
      topic: z.string().describe('Topic or keyword to search for'),
      maxBudgetUsd: z.number().describe('Maximum budget in USD per article'),
      useCase: z.string().optional().describe('Your intended use case'),
    }),
    async run({ args }) {
      const steps: string[] = [];

      // 1. Browse articles
      steps.push('Browsing articles...');
      const browseRes = await fetch(`${BASE_URL}/api/content`);
      const articles = await browseRes.json();

      const matching = articles.filter((a: { title: string; basePrice: number; isFree: boolean }) =>
        a.title.toLowerCase().includes(args.topic.toLowerCase()) &&
        a.basePrice <= args.maxBudgetUsd &&
        !a.isFree
      );

      if (matching.length === 0) {
        return JSON.stringify({ success: false, error: `No articles found matching "${args.topic}" within budget $${args.maxBudgetUsd}` });
      }

      const article = matching[0] as { id: string; title: string; basePrice: number };
      steps.push(`Found: "${article.title}" (base price: $${article.basePrice})`);

      // 2. Negotiate
      if (!CONSUMER_PRIVATE_KEY) return JSON.stringify({ error: 'CONSUMER_PRIVATE_KEY not set' });
      const { privateKeyToAccount } = await import('viem/accounts');
      const account = privateKeyToAccount(CONSUMER_PRIVATE_KEY);

      steps.push('Negotiating price...');
      const negotiation = await negotiateAccess(
        BASE_URL,
        article.id,
        account.address,
        Math.min(args.maxBudgetUsd * 0.5, article.basePrice * 0.8),
        args.useCase,
      );
      steps.push(`Negotiation: ${negotiation.decision} at $${negotiation.price}`);

      if (negotiation.decision === 'reject') {
        return JSON.stringify({ success: false, error: 'Publisher rejected the offer', negotiation });
      }

      // 3. Purchase via x402
      steps.push('Purchasing via x402 micropayment...');
      const x402Fetch = createX402Fetch(CONSUMER_PRIVATE_KEY);
      const contentRes = await x402Fetch(`${BASE_URL}/api/content/${article.id}`);

      if (!contentRes.ok) {
        return JSON.stringify({ success: false, error: `Payment failed: ${contentRes.status}`, steps });
      }

      const content = await contentRes.json();
      steps.push(`✓ Content purchased! tx: ${content.txHash ?? 'settled'}`);

      return JSON.stringify({
        success: true,
        article: article.title,
        finalPrice: negotiation.price,
        txHash: content.txHash,
        contentPreview: content.content?.slice(0, 300),
        steps,
      });
    },
  });

  return agent;
}
