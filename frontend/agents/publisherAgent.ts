import { Agent } from '@openserv-labs/sdk';
import { z } from 'zod';
import { checkReputation } from './capabilities/checkReputation';
import { evaluateContent } from './capabilities/evaluateContent';
import { negotiateAccess } from './capabilities/negotiatePrice';
import { updateReputation } from './capabilities/updateReputation';

const SYSTEM_PROMPT = `You are a Publisher Agent representing a content creator.
Your job is to negotiate fair compensation for content access with incoming AI agents.
You protect your publisher's interests while being reasonable to build long-term relationships.
Consider content quality, consumer reputation, and publisher generosity settings when making pricing decisions.`;

export function createPublisherAgent(): Agent {
  const agent = new Agent({
    systemPrompt: SYSTEM_PROMPT,
    apiKey: process.env.OPENSERV_API_KEY,
  });

  agent.addCapability({
    name: 'negotiate_access',
    description:
      'Negotiate content access with a consumer agent. Input: articleId, consumerAddress, offer (USD). Returns accept/counter/reject with price and reasoning.',
    inputSchema: z.object({
      articleId: z.string().describe('Article ID'),
      consumerAddress: z.string().describe('Consumer wallet address'),
      offer: z.number().describe('Consumer offer in USD'),
      sessionId: z.string().optional().describe('Existing negotiation session ID'),
    }),
    async run({ args }) {
      const result = await negotiateAccess({
        articleId: args.articleId,
        consumerAddress: args.consumerAddress,
        offer: args.offer,
        sessionId: args.sessionId,
      });
      return JSON.stringify(result);
    },
  });

  agent.addCapability({
    name: 'check_reputation',
    description: 'Get ERC-8004 reputation score and total deals for a wallet address.',
    inputSchema: z.object({
      walletAddress: z.string().describe('Wallet address to look up'),
    }),
    async run({ args }) {
      const result = await checkReputation({ walletAddress: args.walletAddress });
      return JSON.stringify(result);
    },
  });

  agent.addCapability({
    name: 'evaluate_content',
    description:
      'Score an article on quality (1-10) using LLM. Saves score to DB. Input: articleId.',
    inputSchema: z.object({
      articleId: z.string().describe('Article ID to evaluate'),
    }),
    async run({ args }) {
      const result = await evaluateContent({ articleId: args.articleId });
      return JSON.stringify(result);
    },
  });

  agent.addCapability({
    name: 'update_reputation',
    description:
      'Update ERC-8004 reputation for a consumer after a deal. Input: publisherId, agentAddress, dealSuccess, optional amount and accessLogId.',
    inputSchema: z.object({
      publisherId: z.string().describe('Publisher ID (owns the content)'),
      agentAddress: z.string().describe('Consumer wallet address to update'),
      dealSuccess: z.boolean().describe('Whether the deal completed successfully'),
      amount: z.number().optional().describe('Amount paid in USD'),
      accessLogId: z.string().optional().describe('AccessLog ID to attach txHash to'),
    }),
    async run({ args }) {
      const result = await updateReputation({
        publisherId: args.publisherId,
        agentAddress: args.agentAddress,
        dealSuccess: args.dealSuccess,
        amount: args.amount,
        accessLogId: args.accessLogId,
      });
      return JSON.stringify(result);
    },
  });

  return agent;
}
